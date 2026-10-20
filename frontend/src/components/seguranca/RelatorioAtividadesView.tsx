/**
 * Segurança → Gerar documentos → Relatório de Atividades.
 *
 * Mesmo esquema da Ficha de EPI: digita o nome, autocomplete puxa do Efetivo,
 * preenche nome/CPF/função/registro, o resto fica editável. Gera PDF no
 * navegador sem gravar nada no banco.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft, Search, FileDown, AlertCircle,
  Loader2, ClipboardList, CheckCircle2, X,
} from 'lucide-react';
import { fetchColaboradores } from '../../services/api';
import type { Colaborador, PermissoesUsuario } from '../../types';
import { podeNaTela } from '../../utils/permissoes';
import { baixarBlob } from '../../utils/fichaEpiPdf';
import {
  gerarRelatorioAtividadesPdf,
  nomeArquivoRelatorio,
  RESUMO_PADRAO,
} from '../../utils/relatorioAtividadesPdf';

const TELA = 'seguranca.epis';

function chaveFuncao(s: string): string {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
}

function hojeIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface Props {
  onVoltar: () => void;
  permissoes?: PermissoesUsuario | null;
}

export const RelatorioAtividadesView: React.FC<Props> = ({ onVoltar, permissoes }) => {
  const podeGerar = podeNaTela(permissoes, TELA, 'ver');

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [feito, setFeito] = useState('');

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [funcao, setFuncao] = useState('');
  const [registro, setRegistro] = useState('');
  const [projeto, setProjeto] = useState('');
  const [data, setData] = useState(hojeIso());
  const [resumo, setResumo] = useState(RESUMO_PADRAO);
  const [gerando, setGerando] = useState(false);

  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const [escolhido, setEscolhido] = useState<Colaborador | null>(null);
  const campoNome = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ativo = true;
    fetchColaboradores({ limit: 500, status: 'ativo' })
      .then(res => { if (ativo) setColaboradores(res.data || []); })
      .catch((e: any) => { if (ativo) setErro(e.message || 'Não foi possível carregar o efetivo.'); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!sugestoesAbertas) return;
    const fora = (e: MouseEvent) => {
      if (campoNome.current && !campoNome.current.contains(e.target as Node)) {
        setSugestoesAbertas(false);
      }
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [sugestoesAbertas]);

  const sugestoes = useMemo(() => {
    const t = chaveFuncao(nome);
    const lista = !t
      ? colaboradores
      : colaboradores.filter(c =>
          chaveFuncao(c.nome).includes(t) ||
          String(c.numero_chapa || '').includes(nome.trim()));
    return lista.slice(0, 50);
  }, [colaboradores, nome]);

  const escolher = (c: Colaborador) => {
    setEscolhido(c);
    setNome(c.nome || '');
    setCpf(c.cpf || '');
    setFuncao(c.funcao || '');
    setRegistro(c.numero_chapa || '');
    setProjeto(c.obra_nome || c.obra_codigo || '');
    setSugestoesAbertas(false);
    setFeito('');
    setErro('');
  };

  const limpar = () => {
    setEscolhido(null);
    setNome(''); setCpf(''); setFuncao(''); setRegistro(''); setProjeto('');
    setFeito(''); setErro('');
  };

  const gerar = async () => {
    setErro(''); setFeito('');
    if (!nome.trim()) return setErro('Preencha o nome do executor.');

    setGerando(true);
    try {
      const blob = await gerarRelatorioAtividadesPdf({
        nome: nome.trim(),
        cpf: cpf.trim(),
        funcao: funcao.trim(),
        registro: registro.trim(),
        projeto: projeto.trim(),
        data,
        resumoAtividades: resumo.trim(),
      });
      baixarBlob(blob, nomeArquivoRelatorio(nome));
      setFeito(`Relatório de ${nome.trim()} gerado.`);
    } catch (e: any) {
      setErro(e.message || 'Não foi possível gerar o PDF.');
    } finally {
      setGerando(false);
    }
  };

  const classeCampo =
    'mt-1 w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg outline-none focus:border-[#176B87]';

  if (!podeGerar) {
    return (
      <div className="p-6 text-sm text-[#687582]">
        Seu cargo não tem acesso ao Relatório de Atividades.
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-5 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onVoltar}
          className="p-2 rounded-lg border border-[#DDE3E8] bg-white hover:bg-[#F4F6F8] transition-colors cursor-pointer"
          title="Voltar aos modelos"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-[#17212B] flex items-center gap-2">
            <ClipboardList size={18} className="text-[#176B87]" />
            Relatório de Atividades
          </h1>
          <p className="text-xs text-[#687582]">
            Preenche com os dados do Efetivo e gera o PDF para imprimir e assinar
          </p>
        </div>
      </div>

      {erro && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FDEBEC] border border-[#F5C6CA] text-[#9B2C33] text-xs">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{erro}</span>
        </div>
      )}
      {feito && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#E7F6F0] border border-[#B5E4D3] text-[#0F6B4F] text-xs">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" /><span>{feito}</span>
        </div>
      )}

      {carregando ? (
        <div className="flex items-center gap-2 text-sm text-[#687582] p-6">
          <Loader2 size={16} className="animate-spin" /> Carregando efetivo...
        </div>
      ) : (
        <>
          {/* ── Dados do executor ── */}
          <div className="bg-white border border-[#DDE3E8] rounded-xl p-4">
            <h2 className="text-xs font-bold text-[#17212B] uppercase tracking-wide mb-3">
              1. Executor
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Campo nome com sugestões */}
              <div className="relative sm:col-span-2" ref={campoNome}>
                <span className="text-[11px] font-semibold text-[#687582]">
                  Nome do executor <span className="font-normal">— digite e escolha na lista</span>
                </span>
                <div className="relative mt-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#687582]" />
                  <input
                    value={nome}
                    onChange={e => { setNome(e.target.value); setEscolhido(null); setSugestoesAbertas(true); }}
                    onFocus={() => setSugestoesAbertas(true)}
                    placeholder="Comece a digitar o nome ou o registro..."
                    autoComplete="off"
                    className="w-full pl-9 pr-9 py-2 text-xs border border-[#DDE3E8] rounded-lg outline-none focus:border-[#176B87]"
                  />
                  {!!nome && (
                    <button
                      onClick={limpar}
                      title="Limpar"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#687582] hover:bg-[#F4F6F8] cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {sugestoesAbertas && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[#DDE3E8] rounded-lg shadow-lg rolagem-visivel overflow-auto max-h-[300px]">
                    {sugestoes.length === 0 ? (
                      <p className="p-3 text-xs text-[#687582]">
                        Ninguém no efetivo com esse nome. Pode preencher à mão.
                      </p>
                    ) : sugestoes.map(c => (
                      <button
                        key={c.id}
                        onClick={() => escolher(c)}
                        className="w-full text-left px-3 py-2 border-b border-[#F0F3F6] last:border-0 hover:bg-[#E8F3F6] transition-colors cursor-pointer"
                      >
                        <p className="text-xs font-semibold text-[#17212B] truncate">{c.nome}</p>
                        <p className="text-[11px] text-[#687582] truncate">
                          {c.cpf ? `CPF ${c.cpf} · ` : ''}{c.funcao}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="block">
                <span className="text-[11px] font-semibold text-[#687582]">CPF</span>
                <input value={cpf} onChange={e => setCpf(e.target.value)} className={classeCampo} />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-[#687582]">Função</span>
                <input value={funcao} onChange={e => setFuncao(e.target.value)} className={classeCampo} />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-[#687582]">Registro</span>
                <input value={registro} onChange={e => setRegistro(e.target.value)} className={classeCampo} />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-[#687582]">Projeto / Obra</span>
                <input value={projeto} onChange={e => setProjeto(e.target.value)} className={classeCampo} />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-semibold text-[#687582]">Data do relatório</span>
                <input type="date" value={data} onChange={e => setData(e.target.value)} className={classeCampo} />
              </label>
            </div>
          </div>

          {/* ── Resumo de atividades ── */}
          <div className="bg-white border border-[#DDE3E8] rounded-xl p-4">
            <h2 className="text-xs font-bold text-[#17212B] uppercase tracking-wide mb-3">
              2. Resumo das atividades
            </h2>
            <textarea
              value={resumo}
              onChange={e => setResumo(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg outline-none focus:border-[#176B87] resize-y"
              placeholder="Descreva as atividades desempenhadas..."
            />
          </div>

          {/* ── Gerar ── */}
          <div className="bg-white border border-[#DDE3E8] rounded-xl p-4 flex flex-wrap items-center justify-end gap-4">
            <button
              onClick={gerar}
              disabled={gerando}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#176B87] hover:bg-[#135a73] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {gerando ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              {gerando ? 'Gerando...' : 'Gerar relatório em PDF'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
