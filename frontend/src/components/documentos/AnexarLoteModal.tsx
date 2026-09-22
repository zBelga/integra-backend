/**
 * Anexar vários documentos de uma vez.
 *
 * O usuário arrasta N arquivos; cada um vira uma linha com tipo, emissão e
 * validade. O tipo é sugerido pelo nome do arquivo (ex.: "aso_joao.pdf" → ASO).
 * O envio é SEQUENCIAL — um arquivo por vez — para não estourar memória nem
 * o limite de requisições em conexões lentas. Cada linha mostra seu próprio
 * status; se uma falhar, as outras seguem.
 */
import React, { useState, useRef, useMemo } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Trash2, Layers } from 'lucide-react';
import { uploadDocumento } from '../../services/api';
import { addMeses, formatBytes } from '../../constants/documentosUI';
import type { TipoCatalogo } from './UploadDocumentoModal';

const MAX_MB = 10;
const MAX_ARQUIVOS = 20;
const FORMATOS = /\.(pdf|jpe?g|png|webp)$/i;

type StatusLinha = 'pronto' | 'enviando' | 'ok' | 'erro';

interface Linha {
  chave: string;
  arquivo: File;
  tipoId: string;
  emissao: string;
  validade: string;
  status: StatusLinha;
  erro: string;
}

interface AnexarLoteModalProps {
  colaboradorId: string;
  empresaId: string;
  catalogo: TipoCatalogo[];
  onClose: () => void;
  /** Chamado ao terminar, se ao menos um arquivo subiu */
  onConcluido: () => void;
}

/** Normaliza para comparar nome de arquivo com código/nome do tipo */
const limpar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Sugere o tipo pelo nome do arquivo: casa o código mais longo que aparecer */
function sugerirTipo(nomeArquivo: string, catalogo: TipoCatalogo[]): string {
  const alvo = limpar(nomeArquivo.replace(/\.[^.]+$/, ''));
  const candidatos = catalogo
    .map(t => ({ id: t.id, chaves: [limpar(t.codigo), limpar(t.nome)].filter(k => k.length >= 2) }))
    .flatMap(t => t.chaves.map(k => ({ id: t.id, k })))
    .filter(c => alvo.includes(c.k))
    .sort((a, b) => b.k.length - a.k.length);
  return candidatos[0]?.id || '';
}

function lerBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = reject;
    r.readAsDataURL(arquivo);
  });
}

export const AnexarLoteModal: React.FC<AnexarLoteModalProps> = ({
  colaboradorId,
  empresaId,
  catalogo,
  onClose,
  onConcluido,
}) => {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const tipoPorId = useMemo(() => new Map(catalogo.map(t => [t.id, t])), [catalogo]);

  const adicionar = (files: FileList | File[]) => {
    const lista = Array.from(files);
    const recusados: string[] = [];
    const novas: Linha[] = [];

    lista.forEach(arquivo => {
      if (!FORMATOS.test(arquivo.name)) { recusados.push(`${arquivo.name} (formato)`); return; }
      if (arquivo.size > MAX_MB * 1024 * 1024) { recusados.push(`${arquivo.name} (acima de ${MAX_MB} MB)`); return; }
      novas.push({
        chave: `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}`,
        arquivo,
        tipoId: sugerirTipo(arquivo.name, catalogo),
        emissao: '',
        validade: '',
        status: 'pronto',
        erro: '',
      });
    });

    setLinhas(prev => {
      const existentes = new Set(prev.map(l => l.chave));
      const juntas = [...prev, ...novas.filter(n => !existentes.has(n.chave))];
      if (juntas.length > MAX_ARQUIVOS) {
        recusados.push(`limite de ${MAX_ARQUIVOS} arquivos por envio`);
        return juntas.slice(0, MAX_ARQUIVOS);
      }
      return juntas;
    });

    setAviso(recusados.length ? `Não incluídos: ${recusados.join(', ')}.` : '');
  };

  const atualizar = (chave: string, patch: Partial<Linha>) =>
    setLinhas(prev => prev.map(l => (l.chave === chave ? { ...l, ...patch } : l)));

  const mudarEmissao = (l: Linha, emissao: string) => {
    const tipo = tipoPorId.get(l.tipoId);
    const patch: Partial<Linha> = { emissao, erro: '' };
    // Sugere a validade pelo padrão do tipo, sem sobrescrever o que já foi digitado
    if (emissao && tipo?.tem_validade && tipo.validade_meses && !l.validade) {
      patch.validade = addMeses(emissao, tipo.validade_meses);
    }
    atualizar(l.chave, patch);
  };

  /**
   * Validação antes de enviar. Calcula a partir do estado ATUAL (síncrono) —
   * não dentro do updater do setState, que o React pode rodar depois.
   */
  const validar = (): boolean => {
    const verificadas = linhas.map(l => {
      if (l.status === 'ok') return l;
      const tipo = tipoPorId.get(l.tipoId);
      let erro = '';
      if (!tipo) erro = 'Escolha o tipo.';
      else if (tipo.tem_validade && !l.validade) erro = 'Informe a validade.';
      else if (l.emissao && l.validade && l.validade < l.emissao) erro = 'Validade antes da emissão.';
      return { ...l, erro, status: (erro ? 'erro' : 'pronto') as StatusLinha };
    });
    setLinhas(verificadas);
    return verificadas.every(l => !l.erro);
  };

  const enviar = async () => {
    if (!linhas.length || !validar()) return;
    setEnviando(true);
    let enviados = 0;

    // Um por vez: previsível em máquinas modestas e conexões lentas
    for (const l of linhas) {
      if (l.status === 'ok') continue;
      const tipo = tipoPorId.get(l.tipoId);
      if (!tipo) continue;

      atualizar(l.chave, { status: 'enviando', erro: '' });
      try {
        await uploadDocumento({
          colaborador_id: colaboradorId,
          empresa_id: empresaId,
          tipo: tipo.codigo,
          tipo_id: tipo.id,
          nome: tipo.nome,
          nome_arquivo: l.arquivo.name,
          fileBase64: await lerBase64(l.arquivo),
          mimeType: l.arquivo.type || 'application/octet-stream',
          data_emissao: l.emissao,
          data_vencimento: tipo.tem_validade ? l.validade : '',
        });
        atualizar(l.chave, { status: 'ok' });
        enviados++;
      } catch (err: any) {
        atualizar(l.chave, { status: 'erro', erro: err.message || 'Falha no envio.' });
      }
    }

    setEnviando(false);
    if (enviados > 0) onConcluido();
  };

  const total = linhas.length;
  const concluidos = linhas.filter(l => l.status === 'ok').length;
  const comErro = linhas.filter(l => l.status === 'erro').length;
  const terminou = total > 0 && concluidos === total;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1620]/60 flex items-center justify-center p-4" onClick={() => !enviando && onClose()}>
      <div
        className="doc-entrada bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E9ED] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#F7F4FE] rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-[#7C3AED]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#17212B]">Anexar em lote</h2>
              <p className="text-[11px] text-[#687582]">
                Até {MAX_ARQUIVOS} arquivos · PDF, JPG, PNG ou WEBP · máx. {MAX_MB} MB cada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={enviando}
            aria-label="Fechar"
            className="p-1.5 text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] rounded-lg cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3 overflow-y-auto">
          {/* Área de soltar */}
          <div
            onClick={() => !enviando && inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={e => { e.preventDefault(); setArrastando(false); if (!enviando) adicionar(e.dataTransfer.files); }}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
              arrastando ? 'border-[#7C3AED] bg-[#F7F4FE]' : 'border-[#DDE3E8] hover:border-[#7C3AED] hover:bg-[#FBFAFF]'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={e => { if (e.target.files) adicionar(e.target.files); e.target.value = ''; }}
            />
            <Upload className="w-7 h-7 mx-auto mb-1.5 text-[#8995A1]" />
            <p className="text-xs font-semibold text-[#17212B]">Arraste os arquivos ou clique para selecionar</p>
            <p className="text-[11px] text-[#8995A1] mt-0.5">
              Dica: nomes como <span className="font-mono">aso_joao.pdf</span> ou{' '}
              <span className="font-mono">nr35.pdf</span> já vêm com o tipo preenchido.
            </p>
          </div>

          {aviso && (
            <div className="flex items-start gap-2 bg-[#FEF3E0] border border-[#F8D99B] rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 text-[#D4890A] shrink-0 mt-px" />
              <p className="text-[11px] text-[#7A4C06]">{aviso}</p>
            </div>
          )}

          {/* Linhas */}
          {linhas.length > 0 && (
            <div className="border border-[#E4E9ED] rounded-xl divide-y divide-[#EEF1F4]">
              {linhas.map(l => {
                const tipo = tipoPorId.get(l.tipoId);
                const travado = enviando || l.status === 'ok';
                return (
                  <div key={l.chave} className={`p-3 ${l.status === 'erro' ? 'bg-[#FFF8F8]' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-[#687582] shrink-0" />
                      <span className="text-xs font-semibold text-[#17212B] truncate flex-1">{l.arquivo.name}</span>
                      <span className="text-[10px] text-[#8995A1] shrink-0">{formatBytes(l.arquivo.size)}</span>
                      {l.status === 'enviando' && (
                        <span className="w-3.5 h-3.5 border-2 border-[#7C3AED]/30 border-t-[#7C3AED] rounded-full animate-spin shrink-0" />
                      )}
                      {l.status === 'ok' && <CheckCircle2 className="w-4 h-4 text-[#159A72] shrink-0" />}
                      {!travado && (
                        <button
                          onClick={() => setLinhas(prev => prev.filter(x => x.chave !== l.chave))}
                          aria-label={`Remover ${l.arquivo.name}`}
                          className="p-1 text-[#8995A1] hover:text-[#D64550] rounded cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr] gap-2">
                      <select
                        value={l.tipoId}
                        disabled={travado}
                        onChange={e => atualizar(l.chave, { tipoId: e.target.value, erro: '', validade: '' })}
                        aria-label="Tipo do documento"
                        className="px-2.5 py-1.5 text-xs border border-[#DDE3E8] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/25 disabled:bg-[#F4F6F8]"
                      >
                        <option value="">Tipo do documento...</option>
                        {catalogo.map(t => (
                          <option key={t.id} value={t.id}>{t.nome} ({t.codigo})</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={l.emissao}
                        disabled={travado}
                        onChange={e => mudarEmissao(l, e.target.value)}
                        aria-label="Data de emissão"
                        title="Emissão"
                        className="px-2.5 py-1.5 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/25 disabled:bg-[#F4F6F8]"
                      />
                      <input
                        type="date"
                        value={l.validade}
                        disabled={travado || (tipo ? !tipo.tem_validade : false)}
                        onChange={e => atualizar(l.chave, { validade: e.target.value, erro: '' })}
                        aria-label="Data de validade"
                        title={tipo && !tipo.tem_validade ? 'Este tipo não tem validade' : 'Validade'}
                        className="px-2.5 py-1.5 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/25 disabled:bg-[#F4F6F8] disabled:text-[#B6C2CC]"
                      />
                    </div>
                    {l.erro && <p className="text-[11px] text-[#D64550] mt-1.5">{l.erro}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E4E9ED] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-[#687582]">
            {total === 0
              ? 'Nenhum arquivo selecionado.'
              : `${concluidos} de ${total} enviados${comErro ? ` · ${comErro} com problema` : ''}`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={enviando}
              className="px-4 py-2 text-xs font-semibold text-[#687582] bg-[#F4F6F8] hover:bg-[#E4E9ED] rounded-lg cursor-pointer disabled:opacity-40"
            >
              {terminou ? 'Fechar' : 'Cancelar'}
            </button>
            {!terminou && (
              <button
                onClick={enviar}
                disabled={enviando || total === 0}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {enviando ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando {concluidos + 1} de {total}...
                  </>
                ) : (
                  <><Upload className="w-3.5 h-3.5" /> Enviar {total - concluidos} arquivo{total - concluidos !== 1 ? 's' : ''}</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
