/**
 * Configurações → Tipos de Documentos
 *
 * Catálogo da empresa ativa. Permite criar tipos novos, editar os existentes
 * (inclusive os 8 padrão) e desativar/reativar.
 *
 * REGRA DE OURO: desativar um tipo NUNCA apaga arquivo nem histórico. Ele só
 * deixa de ser exigido e some das listas de seleção. Ao desativar, a tela
 * informa quantos arquivos continuam guardados.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Settings2,
  Plus,
  Search,
  Pencil,
  Power,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  CalendarClock,
  Info,
} from 'lucide-react';
import {
  fetchDocumentoTipos,
  createDocumentoTipo,
  updateDocumentoTipo,
  toggleDocumentoTipoStatus,
} from '../../services/api';
import type { DocumentoTipo, DocumentoTipoFormData } from '../../types';
import { iconeDoTipo } from '../../constants/documentosUI';

const VAZIO: DocumentoTipoFormData = {
  nome: '',
  codigo: '',
  descricao: '',
  tem_validade: false,
  validade_meses: null,
  dias_alerta: 30,
  status: 'ativo',
  todos_colaboradores: false,
};

// ─────────────────────────────────────────────────────────────
// Modal de cadastro / edição
// ─────────────────────────────────────────────────────────────

function TipoModal({
  tipo,
  onClose,
  onSalvo,
}: {
  tipo: DocumentoTipo | null;
  onClose: () => void;
  onSalvo: (t: DocumentoTipo) => void;
}) {
  const editando = !!tipo;
  const [form, setForm] = useState<DocumentoTipoFormData>(
    tipo
      ? {
          nome: tipo.nome,
          codigo: tipo.codigo,
          descricao: tipo.descricao || '',
          tem_validade: tipo.tem_validade,
          validade_meses: tipo.validade_meses ?? null,
          dias_alerta: tipo.dias_alerta,
          status: tipo.status,
          todos_colaboradores: !!tipo.todos_colaboradores,
        }
      : VAZIO
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const set = <K extends keyof DocumentoTipoFormData>(k: K, v: DocumentoTipoFormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!form.nome.trim()) return setErro('Informe o nome do documento.');
    if (!form.codigo.trim()) return setErro('Informe a sigla ou código.');
    if (!/^[A-Za-z0-9._-]{2,20}$/.test(form.codigo.trim())) {
      return setErro('O código deve ter de 2 a 20 caracteres, sem espaços nem acentos. Ex.: PEMT');
    }
    if (form.tem_validade && Number(form.dias_alerta) <= 0) {
      return setErro('Informe em quantos dias antes do vencimento o alerta deve aparecer.');
    }

    setSalvando(true);
    try {
      const payload = { ...form, codigo: form.codigo.trim().toUpperCase(), nome: form.nome.trim() };
      const res = editando ? await updateDocumentoTipo(tipo!.id, payload) : await createDocumentoTipo(payload);
      onSalvo(res.data);
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1620]/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="doc-entrada bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E9ED] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#EEF4F7] rounded-lg flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-[#176B87]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#17212B]">
                {editando ? 'Editar tipo de documento' : 'Novo tipo de documento'}
              </h2>
              <p className="text-[11px] text-[#687582]">
                {editando && tipo?.padrao ? 'Documento padrão do sistema — pode ser ajustado' : 'Fica disponível para toda a empresa'}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={salvar} className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label htmlFor="tipo-nome" className="block text-xs font-semibold text-[#17212B] mb-1">Nome do documento *</label>
              <input
                id="tipo-nome"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder="Ex.: Certificado de Operador de Plataforma Elevatória"
                className="w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B87]/30 focus:border-[#176B87]"
              />
            </div>
            <div>
              <label htmlFor="tipo-codigo" className="block text-xs font-semibold text-[#17212B] mb-1">Sigla / código *</label>
              <input
                id="tipo-codigo"
                value={form.codigo}
                onChange={e => set('codigo', e.target.value.toUpperCase())}
                placeholder="PEMT"
                maxLength={20}
                className="w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B87]/30 focus:border-[#176B87] font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label htmlFor="tipo-desc" className="block text-xs font-semibold text-[#17212B] mb-1">Descrição</label>
            <textarea
              id="tipo-desc"
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              rows={2}
              placeholder="Explique o que é este documento e quando ele é exigido."
              className="w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B87]/30 focus:border-[#176B87] resize-none"
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-xl border border-[#E1D9FB] bg-[#F7F4FE] p-3.5">
            <input
              type="checkbox"
              checked={!!form.todos_colaboradores}
              onChange={e => set('todos_colaboradores', e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-[#7C3AED] cursor-pointer"
            />
            <span>
              <span className="block text-xs font-semibold text-[#17212B]">Obrigatório para todos os colaboradores</span>
              <span className="block text-[11px] text-[#687582] mt-0.5">
                Aparece no checklist de qualquer função. Documentos específicos (ex.: NR 35) ficam em Documentos por Função.
              </span>
            </span>
          </label>

          <div className="rounded-xl border border-[#E4E9ED] bg-[#F8FAFB] p-3.5 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={form.tem_validade}
                onChange={e => set('tem_validade', e.target.checked)}
                className="w-4 h-4 accent-[#176B87] cursor-pointer"
              />
              <span className="text-xs font-semibold text-[#17212B]">Este documento tem validade</span>
            </label>

            {form.tem_validade && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tipo-validade" className="block text-[11px] font-semibold text-[#687582] mb-1">
                    Validade padrão (meses)
                  </label>
                  <input
                    id="tipo-validade"
                    type="number"
                    min={1}
                    max={120}
                    value={form.validade_meses ?? ''}
                    onChange={e => set('validade_meses', e.target.value ? Number(e.target.value) : null)}
                    placeholder="12"
                    className="w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B87]/30"
                  />
                  <p className="text-[10px] text-[#8995A1] mt-1">Sugere o vencimento a partir da emissão.</p>
                </div>
                <div>
                  <label htmlFor="tipo-alerta" className="block text-[11px] font-semibold text-[#687582] mb-1">
                    Alertar quantos dias antes?
                  </label>
                  <input
                    id="tipo-alerta"
                    type="number"
                    min={1}
                    max={365}
                    value={form.dias_alerta}
                    onChange={e => set('dias_alerta', Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B87]/30"
                  />
                  <p className="text-[10px] text-[#8995A1] mt-1">Entra em "A vencer" nesse prazo.</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#17212B] mb-1.5">Status</span>
            <div className="flex gap-2">
              {(['ativo', 'inativo'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    form.status === s
                      ? s === 'ativo'
                        ? 'bg-[#E8F6F1] border-[#B8E8D9] text-[#0F7A5A]'
                        : 'bg-[#F4F6F8] border-[#DDE3E8] text-[#687582]'
                      : 'bg-white border-[#DDE3E8] text-[#8995A1] hover:border-[#B6C2CC]'
                  }`}
                >
                  {s === 'ativo' ? 'Ativo' : 'Inativo'}
                </button>
              ))}
            </div>
          </div>

          {erro && (
            <div className="flex items-start gap-2 bg-[#FDEBEC] border border-[#F5B8BB] rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 text-[#D64550] shrink-0 mt-px" />
              <p className="text-xs text-[#D64550]">{erro}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="flex-1 py-2.5 text-xs font-semibold text-[#687582] bg-[#F4F6F8] hover:bg-[#E4E9ED] rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 py-2.5 text-xs font-semibold text-white bg-[#176B87] hover:bg-[#135a73] rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {salvando ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {editando ? 'Salvar alterações' : 'Cadastrar tipo'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tela
// ─────────────────────────────────────────────────────────────

export const TiposDocumentoView: React.FC = () => {
  const [tipos, setTipos] = useState<DocumentoTipo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [modal, setModal] = useState<{ aberto: boolean; tipo: DocumentoTipo | null }>({ aberto: false, tipo: null });
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchDocumentoTipos('all');
      setTipos(res.data || []);
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar o catálogo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return tipos.filter(t => {
      if (filtro !== 'todos' && t.status !== filtro) return false;
      if (!q) return true;
      return (
        t.nome.toLowerCase().includes(q) ||
        t.codigo.toLowerCase().includes(q) ||
        (t.descricao || '').toLowerCase().includes(q)
      );
    });
  }, [tipos, busca, filtro]);

  const ativos = tipos.filter(t => t.status === 'ativo').length;

  const alternarStatus = async (t: DocumentoTipo) => {
    const novo = t.status === 'ativo' ? 'inativo' : 'ativo';
    if (novo === 'inativo' && !confirm(
      `Desativar "${t.nome}"?\n\nOs arquivos já enviados continuam guardados e visíveis no histórico. ` +
      `O documento apenas deixa de contar como pendência e some das listas.\n\nVocê pode reativar quando quiser.`
    )) return;

    setOcupadoId(t.id);
    setErro('');
    try {
      const res = await toggleDocumentoTipoStatus(t.id, novo);
      setTipos(prev => prev.map(x => (x.id === t.id ? res.data : x)));
      setAviso(
        novo === 'inativo'
          ? `"${t.nome}" desativado. ${res.arquivos_preservados} arquivo(s) preservado(s) no histórico.`
          : `"${t.nome}" reativado e disponível novamente.`
      );
    } catch (err: any) {
      setErro(err.message || 'Não foi possível alterar o status.');
    } finally {
      setOcupadoId(null);
    }
  };

  const aoSalvar = (t: DocumentoTipo) => {
    setTipos(prev => {
      const existe = prev.some(x => x.id === t.id);
      return existe ? prev.map(x => (x.id === t.id ? t : x)) : [...prev, t];
    });
    setAviso(`"${t.nome}" salvo com sucesso.`);
  };

  return (
    <div className="p-5 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEF4F7] border border-[#DDE7EC] flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-[#176B87]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#17212B]">Tipos de Documentos</h1>
            <p className="text-xs text-[#687582] mt-0.5">
              Catálogo da empresa ativa · {ativos} ativo{ativos !== 1 ? 's' : ''} de {tipos.length}
            </p>
          </div>
        </div>
        <button
          onClick={() => setModal({ aberto: true, tipo: null })}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#176B87] hover:bg-[#135a73] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Novo tipo de documento
        </button>
      </header>

      <div className="flex items-start gap-2.5 rounded-xl border border-[#C6E3EB] bg-[#EEF4F7] px-3.5 py-2.5">
        <Info className="w-4 h-4 text-[#176B87] shrink-0 mt-px" />
        <p className="text-[11px] text-[#17212B] leading-snug">
          Desativar um tipo <strong>não apaga nada</strong>: os arquivos já enviados continuam guardados e
          aparecendo no histórico do colaborador. O documento só deixa de contar como pendência.
          Para exigir um documento de um cargo, use <strong>Documentos por Função</strong>.
        </p>
      </div>

      {(aviso || erro) && (
        <div
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 border ${
            erro ? 'bg-[#FDEBEC] border-[#F5B8BB]' : 'bg-[#E8F6F1] border-[#B8E8D9]'
          }`}
        >
          {erro ? <AlertCircle className="w-4 h-4 text-[#D64550] shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-[#159A72] shrink-0" />}
          <p className={`text-xs flex-1 ${erro ? 'text-[#D64550]' : 'text-[#0F7A5A]'}`}>{erro || aviso}</p>
          <button onClick={() => { setErro(''); setAviso(''); }} aria-label="Fechar aviso" className="cursor-pointer">
            <X className={`w-3.5 h-3.5 ${erro ? 'text-[#D64550]' : 'text-[#159A72]'}`} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E4E9ED] overflow-hidden shadow-[0_1px_2px_rgba(23,33,43,0.04)]">
        <div className="px-5 py-3.5 border-b border-[#E4E9ED] flex flex-wrap items-center gap-2 justify-between">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, código ou descrição..."
              aria-label="Buscar tipo de documento"
              className="w-full sm:w-72 pl-8 pr-3 py-2 text-xs border border-[#DDE3E8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#176B87]/30 focus:border-[#176B87]"
            />
          </div>
          <div className="flex gap-1.5">
            {(['todos', 'ativo', 'inativo'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                  filtro === f
                    ? 'bg-[#17212B] border-[#17212B] text-white'
                    : 'bg-white border-[#DDE3E8] text-[#687582] hover:border-[#B6C2CC]'
                }`}
              >
                {f === 'todos' ? 'Todos' : f === 'ativo' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-[#176B87] border-t-transparent" />
            <p className="mt-3 text-xs text-[#687582]">Carregando catálogo...</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center">
            <Settings2 className="w-11 h-11 text-[#B6C2CC] mx-auto mb-3" strokeWidth={1.4} />
            <h3 className="text-sm font-bold text-[#17212B]">Nenhum tipo encontrado</h3>
            <p className="text-xs text-[#687582] mt-1">Ajuste a busca ou cadastre um novo tipo.</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtrados.map(t => {
              const Icone = iconeDoTipo(t.codigo);
              const inativo = t.status === 'inativo';
              return (
                <div
                  key={t.id}
                  className={`doc-card rounded-xl border p-4 flex flex-col gap-3 ${
                    inativo ? 'border-[#E4E9ED] opacity-70' : 'border-[#E4E9ED] hover:border-[#176B87]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EEF4F7] border border-[#DDE7EC] flex items-center justify-center shrink-0">
                      <Icone className="w-5 h-5 text-[#176B87]" strokeWidth={1.7} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-[#17212B] truncate">{t.nome}</p>
                        {t.padrao && (
                          <span className="px-1.5 py-0.5 bg-[#EEF4F7] text-[#176B87] border border-[#C6E3EB] rounded text-[9px] font-bold">
                            PADRÃO
                          </span>
                        )}
                        {t.todos_colaboradores && (
                          <span className="px-1.5 py-0.5 bg-[#F1ECFE] text-[#6D28D9] border border-[#E1D9FB] rounded text-[9px] font-bold">
                            TODOS
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-[#687582] mt-0.5">{t.codigo}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                        inativo
                          ? 'bg-[#F4F6F8] text-[#687582] border-[#DDE3E8]'
                          : 'bg-[#E8F6F1] text-[#0F7A5A] border-[#B8E8D9]'
                      }`}
                    >
                      {inativo ? 'Inativo' : 'Ativo'}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#687582] leading-snug line-clamp-2 min-h-[2rem]">
                    {t.descricao || 'Sem descrição.'}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] text-[#687582] border-t border-[#EEF1F4] pt-2.5">
                    {t.tem_validade ? (
                      <>
                        <span className="flex items-center gap-1">
                          <CalendarClock className="w-3 h-3 text-[#D4890A]" />
                          {t.validade_meses ? `${t.validade_meses} meses` : 'Com validade'}
                        </span>
                        <span>Alerta: {t.dias_alerta}d antes</span>
                      </>
                    ) : (
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-[#159A72]" /> Sem validade
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setModal({ aberto: true, tipo: t })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#DDE3E8] hover:border-[#176B87] hover:bg-[#EEF4F7] rounded-lg text-[11px] font-semibold text-[#17212B] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                    <button
                      onClick={() => alternarStatus(t)}
                      disabled={ocupadoId === t.id}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 border rounded-lg text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                        inativo
                          ? 'border-[#B8E8D9] text-[#0F7A5A] hover:bg-[#E8F6F1]'
                          : 'border-[#DDE3E8] text-[#687582] hover:border-[#D64550] hover:text-[#D64550] hover:bg-[#FDEBEC]'
                      }`}
                    >
                      <Power className="w-3 h-3" /> {inativo ? 'Reativar' : 'Desativar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal.aberto && (
        <TipoModal
          tipo={modal.tipo}
          onClose={() => setModal({ aberto: false, tipo: null })}
          onSalvo={aoSalvar}
        />
      )}
    </div>
  );
};
