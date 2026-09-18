/**
 * Tela de documentos de um colaborador.
 *
 * Quatro seções, na ordem: identificação + conformidade, indicadores,
 * checklist de obrigatórios (só o que a FUNÇÃO dele exige) e os anexados.
 *
 * Performance: uma única requisição (`/api/documentos/checklist/:id`) traz
 * checklist, anexados, catálogo e indicadores já calculados no servidor.
 * Nenhum arquivo é baixado para montar a lista — só metadados. A URL assinada
 * do arquivo é pedida apenas quando o usuário clica em ver ou baixar.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Upload,
  Download,
  Trash2,
  User,
  Briefcase,
  Calendar,
  Hash,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  X,
  CreditCard,
  MapPin,
  Search,
  ListChecks,
  FilePlus2,
  ShieldAlert,
  Settings2,
  LayoutGrid,
  List,
} from 'lucide-react';
import { UploadDocumentoModal } from './UploadDocumentoModal';
import { fetchChecklistColaborador, downloadDocumento, deleteDocumento } from '../../services/api';
import type { Colaborador, Documento, ChecklistColaborador, ChecklistItem, SituacaoDocumento } from '../../types';
import {
  iconeDoTipo,
  ESTILO_SITUACAO,
  situacaoDoDocumento,
  diasParaVencer,
  formatBytes,
  corConformidade,
} from '../../constants/documentosUI';
import { applyCPFMask, formatDateBR } from '../../utils/cpfMask';

interface ColaboradorPerfilProps {
  colaborador: Colaborador;
  onBack: () => void;
  /** Abre Configurações → Documentos por Função (quando o usuário pode) */
  onConfigurarExigencias?: () => void;
}

// ─────────────────────────────────────────────────────────────
// Peças pequenas
// ─────────────────────────────────────────────────────────────

const Pill = React.memo(({ situacao, dias }: { situacao: SituacaoDocumento; dias?: number | null }) => {
  const e = ESTILO_SITUACAO[situacao];
  const sufixo =
    situacao === 'vencido' && dias != null ? ` · ${Math.abs(dias)}d`
    : situacao === 'a_vencer' && dias != null ? ` · ${dias}d`
    : '';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap border"
      style={{ color: e.texto, backgroundColor: e.fundo, borderColor: e.borda }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.ponto }} />
      {e.rotulo}{sufixo}
    </span>
  );
});
Pill.displayName = 'Pill';

interface CardIndicadorProps {
  icone: React.ReactNode;
  rotulo: string;
  valor: number;
  cor: string;
  fundo: string;
}

const CardIndicador = React.memo(({ icone, rotulo, valor, cor, fundo }: CardIndicadorProps) => (
  <div className="bg-white rounded-2xl border border-[#E4E9ED] px-4 py-3.5 flex items-center gap-3 shadow-[0_1px_2px_rgba(23,33,43,0.04)]">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      style={{ backgroundColor: fundo, color: cor }}
    >
      {icone}
    </div>
    <div className="min-w-0">
      <p className="text-[11px] text-[#687582] font-medium truncate">{rotulo}</p>
      <p className="text-xl font-bold leading-tight" style={{ color: valor > 0 ? cor : '#17212B' }}>
        {valor}
      </p>
    </div>
  </div>
));
CardIndicador.displayName = 'CardIndicador';

/** Visualização inline (PDF/imagem) usando a URL assinada temporária. */
function PreviewModal({ url, nome, onClose }: { url: string; nome: string; onClose: () => void }) {
  const isImagem = /\.(jpe?g|png|webp|gif)$/i.test(nome);
  return (
    <div className="fixed inset-0 z-[60] bg-[#0B1620]/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl doc-entrada"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E4E9ED] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-[#176B87] shrink-0" />
            <h3 className="text-sm font-bold text-[#17212B] truncate">{nome}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              download={nome}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#176B87] hover:bg-[#135a73] text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Baixar
            </a>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="p-1.5 text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-[#F4F6F8] overflow-auto flex items-center justify-center">
          {isImagem ? (
            <img src={url} alt={nome} className="max-w-full max-h-full object-contain" />
          ) : (
            <iframe src={url} title={nome} className="w-full h-full border-0" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tela
// ─────────────────────────────────────────────────────────────

export const ColaboradorPerfil: React.FC<ColaboradorPerfilProps> = ({
  colaborador,
  onBack,
  onConfigurarExigencias,
}) => {
  const [dados, setDados] = useState<ChecklistColaborador | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showUpload, setShowUpload] = useState(false);
  const [uploadTipo, setUploadTipo] = useState<{ id: string; codigo: string; nome: string } | undefined>();

  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | SituacaoDocumento>('todos');
  const [modoLista, setModoLista] = useState(false);
  const [verTodosObrigatorios, setVerTodosObrigatorios] = useState(false);

  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; nome: string } | null>(null);

  const carregar = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchChecklistColaborador(colaborador.id);
      setDados(res.data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar os documentos.');
    } finally {
      setIsLoading(false);
    }
  }, [colaborador.id]);

  useEffect(() => { carregar(); }, [carregar]);

  const ind = dados?.indicadores;
  const checklist = dados?.checklist || [];
  const anexados = dados?.anexados || [];
  const catalogo = dados?.catalogo || [];
  const semExigencias = !isLoading && checklist.length === 0;

  /** Alerta do tipo, por id — usado para calcular o status de cada anexo. */
  const alertaPorTipo = useMemo(() => {
    const m = new Map<string, number>();
    catalogo.forEach(t => m.set(t.id, t.dias_alerta));
    return m;
  }, [catalogo]);

  const statusDoAnexo = useCallback(
    (doc: Documento): SituacaoDocumento =>
      situacaoDoDocumento(doc.data_vencimento, alertaPorTipo.get((doc as any).tipo_id) ?? 30),
    [alertaPorTipo]
  );

  const anexadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return anexados.filter(d => {
      if (filtroTipo !== 'todos' && d.tipo !== filtroTipo) return false;
      if (filtroStatus !== 'todos') {
        const s = statusDoAnexo(d);
        const casa = filtroStatus === 'valido' ? s === 'valido' || s === 'sem_validade' : s === filtroStatus;
        if (!casa) return false;
      }
      if (!termo) return true;
      return (
        d.nome.toLowerCase().includes(termo) ||
        d.tipo.toLowerCase().includes(termo) ||
        d.nome_arquivo.toLowerCase().includes(termo)
      );
    });
  }, [anexados, busca, filtroTipo, filtroStatus, statusDoAnexo]);

  const tiposPresentes = useMemo(
    () => Array.from(new Set(anexados.map(d => d.tipo))).sort(),
    [anexados]
  );

  const obrigatoriosVisiveis = useMemo(() => {
    if (verTodosObrigatorios) return checklist;
    // Pendentes e vencidos primeiro — é o que precisa de ação
    const peso: Record<string, number> = { pendente: 0, vencido: 1, a_vencer: 2, valido: 3, sem_validade: 3 };
    return [...checklist].sort((a, b) => peso[a.situacao] - peso[b.situacao]).slice(0, 9);
  }, [checklist, verTodosObrigatorios]);

  // ─── Ações ───
  const abrirUpload = (item?: ChecklistItem) => {
    setUploadTipo(item ? { id: item.tipo_id, codigo: item.codigo, nome: item.nome } : undefined);
    setShowUpload(true);
  };

  const comArquivo = async (doc: Documento, acao: 'ver' | 'baixar') => {
    setOcupadoId(doc.id);
    try {
      const res = await downloadDocumento(doc.id);
      if (acao === 'ver') {
        setPreview({ url: res.url, nome: res.nome_arquivo || doc.nome_arquivo });
      } else {
        const a = document.createElement('a');
        a.href = res.url;
        a.download = res.nome_arquivo || doc.nome_arquivo;
        a.target = '_blank';
        a.click();
      }
    } catch (err: any) {
      setError(`Erro ao abrir o arquivo: ${err.message}`);
    } finally {
      setOcupadoId(null);
    }
  };

  const excluir = async (doc: Documento) => {
    if (!confirm(`Excluir "${doc.nome}"?\n\nO arquivo será removido definitivamente.`)) return;
    setOcupadoId(doc.id);
    try {
      await deleteDocumento(doc.id);
      await carregar();
    } catch (err: any) {
      setError(`Erro ao excluir: ${err.message}`);
    } finally {
      setOcupadoId(null);
    }
  };

  const pct = ind?.conformidade ?? 0;

  return (
    <div className="p-5 sm:p-6 space-y-4 max-w-[1600px] mx-auto">
      {/* ── Trilha ── */}
      <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[#687582] min-w-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 hover:text-[#17212B] transition-colors cursor-pointer font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Colaboradores
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#B6C2CC]" />
        <span className="truncate max-w-[120px] sm:max-w-[220px]">{colaborador.nome}</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#B6C2CC]" />
        <span className="font-semibold text-[#17212B]">Documentos</span>
      </nav>

      {/* ── A. Identificação + conformidade ── */}
      <section className="bg-white rounded-2xl border border-[#E4E9ED] shadow-[0_1px_2px_rgba(23,33,43,0.04)] overflow-hidden">
        <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-[#EEF4F7] border border-[#DDE7EC] flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-[#176B87]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-[#17212B] truncate">{colaborador.nome}</h1>
                {colaborador.numero_chapa && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EEF4F7] text-[#176B87] border border-[#C6E3EB] rounded-md text-[11px] font-bold">
                    <Hash className="w-3 h-3" />{colaborador.numero_chapa}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#687582]">
                <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" />{colaborador.funcao}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Admissão: {formatDateBR(colaborador.data_admissao)}</span>
                <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" />{applyCPFMask(colaborador.cpf)}</span>
                {colaborador.obra_nome && (
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{colaborador.obra_nome}</span>
                )}
              </div>
            </div>
          </div>

          {/* Barra de conformidade */}
          <div className="lg:border-l lg:border-[#E4E9ED] lg:pl-5 w-full lg:w-[340px] shrink-0">
            {semExigencias ? (
              <div className="rounded-xl bg-[#F8FAFB] border border-[#E4E9ED] px-3.5 py-3">
                <p className="text-xs font-semibold text-[#17212B]">Sem exigências configuradas</p>
                <p className="text-[11px] text-[#687582] mt-0.5 leading-snug">
                  Nenhum documento foi definido como obrigatório para a função{' '}
                  <strong className="text-[#17212B]">{colaborador.funcao}</strong>.
                </p>
                {onConfigurarExigencias && (
                  <button
                    onClick={onConfigurarExigencias}
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#176B87] hover:text-[#0f4f66] transition-colors cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5" /> Configurar documentos por função
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-[#687582]">Conformidade de Documentos</span>
                  <span className="text-sm font-bold" style={{ color: corConformidade(pct) }}>{pct}%</span>
                </div>
                <div className="h-2 bg-[#EEF1F4] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full doc-barra"
                    style={{ width: `${pct}%`, backgroundColor: corConformidade(pct) }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 gap-3">
                  <p className="text-[11px] text-[#687582]">
                    {ind?.validos ?? 0} de {ind?.obrigatorios ?? 0} documentos obrigatórios
                  </p>
                  <button
                    onClick={() => setVerTodosObrigatorios(v => !v)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-[#DDE3E8] rounded-lg text-[11px] font-semibold text-[#17212B] hover:bg-[#F8FAFB] transition-colors cursor-pointer shrink-0"
                  >
                    <ListChecks className="w-3.5 h-3.5" /> Ver checklist
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 bg-[#FDEBEC] border border-[#F5B8BB] rounded-xl px-3.5 py-2.5">
          <AlertCircle className="w-4 h-4 text-[#D64550] shrink-0" />
          <p className="text-xs text-[#D64550] flex-1">{error}</p>
          <button onClick={() => setError('')} aria-label="Fechar aviso" className="text-[#D64550] cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── B. Indicadores ── */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <CardIndicador icone={<FileText className="w-5 h-5" />} rotulo="Total de Documentos" valor={ind?.total ?? 0} cor="#176B87" fundo="#EEF4F7" />
        <CardIndicador icone={<AlertCircle className="w-5 h-5" />} rotulo="Vencidos" valor={ind?.vencidos ?? 0} cor="#D64550" fundo="#FDEBEC" />
        <CardIndicador icone={<Clock className="w-5 h-5" />} rotulo="A Vencer" valor={ind?.a_vencer ?? 0} cor="#D4890A" fundo="#FEF3E0" />
        <CardIndicador icone={<ShieldAlert className="w-5 h-5" />} rotulo="Pendentes" valor={ind?.pendentes ?? 0} cor="#7C3AED" fundo="#F1ECFE" />

        <div className="col-span-2 lg:col-span-1 rounded-2xl border px-4 py-3.5 flex items-center gap-3 bg-[#E8F6F1] border-[#B8E8D9]">
          <CheckCircle2 className="w-5 h-5 text-[#159A72] shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#0F7A5A] leading-tight">
              {(ind?.vencidos ?? 0) + (ind?.pendentes ?? 0) === 0
                ? 'Documentação em dia'
                : 'Mantenha os documentos em dia'}
            </p>
            <p className="text-[11px] text-[#0F7A5A]/80 leading-snug mt-0.5">
              {(ind?.vencidos ?? 0) + (ind?.pendentes ?? 0) === 0
                ? 'Nenhuma pendência para esta função.'
                : 'Evite bloqueios e mantenha a conformidade.'}
            </p>
          </div>
        </div>
      </section>

      {/* ── C. Documentos obrigatórios ── */}
      {!semExigencias && (
        <section className="rounded-2xl border border-[#E1D9FB] bg-[#F7F4FE] overflow-hidden">
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#E1D9FB]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E1D9FB] flex items-center justify-center shrink-0">
                <ListChecks className="w-4.5 h-4.5 text-[#7C3AED]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#17212B]">Documentos obrigatórios</h2>
                  <span className="px-2 py-0.5 bg-[#7C3AED] text-white rounded-full text-[10px] font-bold">
                    {checklist.length}
                  </span>
                </div>
                <p className="text-[11px] text-[#687582] mt-0.5">
                  Exigidos para a função <strong className="text-[#17212B]">{colaborador.funcao}</strong>. Clique em um item para anexar.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {checklist.length > 9 && (
                <button
                  onClick={() => setVerTodosObrigatorios(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#DDE3E8] hover:border-[#7C3AED] text-[#17212B] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <List className="w-3.5 h-3.5" />
                  {verTodosObrigatorios ? 'Mostrar menos' : 'Ver lista completa'}
                </button>
              )}
              <button
                onClick={() => abrirUpload()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Anexar documento
              </button>
            </div>
          </div>

          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-9 gap-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-[132px] rounded-xl bg-white/70 border border-[#E1D9FB] doc-pulso" />
                ))
              : obrigatoriosVisiveis.map(item => {
                  const Icone = iconeDoTipo(item.codigo);
                  const e = ESTILO_SITUACAO[item.situacao];
                  const dias = diasParaVencer(item.data_vencimento);
                  return (
                    <button
                      key={item.tipo_id}
                      onClick={() => abrirUpload(item)}
                      title={item.descricao || item.nome}
                      className="doc-card group bg-white rounded-xl border border-[#E4E9ED] hover:border-[#7C3AED] p-3 flex flex-col items-center text-center gap-2 cursor-pointer"
                    >
                      <Icone className="w-6 h-6 text-[#7C3AED]" strokeWidth={1.6} />
                      <span className="text-[11px] font-bold text-[#17212B] leading-tight line-clamp-2 uppercase">
                        {item.codigo}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold border w-full truncate"
                        style={{ color: e.texto, backgroundColor: e.fundo, borderColor: e.borda }}
                      >
                        {e.rotulo}
                        {item.situacao === 'a_vencer' && dias != null ? ` ${dias}d` : ''}
                      </span>
                      <span className="mt-auto flex items-center justify-center gap-1 w-full py-1.5 border border-[#DDE3E8] group-hover:border-[#7C3AED] group-hover:bg-[#F7F4FE] rounded-lg text-[11px] font-semibold text-[#17212B] transition-colors">
                        {item.documento_id ? <><Eye className="w-3 h-3" />Substituir</> : <><Upload className="w-3 h-3" />Anexar</>}
                      </span>
                    </button>
                  );
                })}
          </div>
        </section>
      )}

      {/* ── D. Documentos anexados ── */}
      <section className="bg-white rounded-2xl border border-[#E4E9ED] shadow-[0_1px_2px_rgba(23,33,43,0.04)] overflow-hidden">
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E9ED]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEF4F7] border border-[#DDE7EC] flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 text-[#176B87]" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#17212B]">Documentos anexados</h2>
              <span className="px-2 py-0.5 bg-[#F4F6F8] text-[#687582] rounded-full text-[10px] font-bold">
                {anexadosFiltrados.length}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar documento..."
                aria-label="Buscar documento"
                className="w-full sm:w-52 pl-8 pr-3 py-2 text-xs border border-[#DDE3E8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#176B87]/30 focus:border-[#176B87] transition-shadow"
              />
            </div>
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              aria-label="Filtrar por tipo"
              className="px-3 py-2 text-xs border border-[#DDE3E8] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#176B87]/30 cursor-pointer"
            >
              <option value="todos">Todos os tipos</option>
              {tiposPresentes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value as any)}
              aria-label="Filtrar por status"
              className="px-3 py-2 text-xs border border-[#DDE3E8] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#176B87]/30 cursor-pointer"
            >
              <option value="todos">Todos os status</option>
              <option value="valido">Válidos</option>
              <option value="a_vencer">A vencer</option>
              <option value="vencido">Vencidos</option>
            </select>
            <div className="flex border border-[#DDE3E8] rounded-xl overflow-hidden">
              <button
                onClick={() => setModoLista(false)}
                aria-label="Ver em cards"
                className={`p-2 transition-colors cursor-pointer ${!modoLista ? 'bg-[#EEF4F7] text-[#176B87]' : 'text-[#8995A1] hover:bg-[#F8FAFB]'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setModoLista(true)}
                aria-label="Ver em lista"
                className={`p-2 border-l border-[#DDE3E8] transition-colors cursor-pointer ${modoLista ? 'bg-[#EEF4F7] text-[#176B87]' : 'text-[#8995A1] hover:bg-[#F8FAFB]'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-[#176B87] border-t-transparent" />
            <p className="mt-3 text-xs text-[#687582]">Carregando documentos...</p>
          </div>
        ) : anexadosFiltrados.length === 0 ? (
          <div className="m-4 p-10 text-center border-2 border-dashed border-[#DDE3E8] rounded-xl">
            <FilePlus2 className="w-11 h-11 text-[#B6C2CC] mx-auto mb-3" strokeWidth={1.4} />
            <h3 className="text-sm font-bold text-[#17212B]">
              {anexados.length === 0 ? 'Nenhum documento anexado' : 'Nenhum resultado para este filtro'}
            </h3>
            <p className="text-xs text-[#687582] mt-1">
              {anexados.length === 0
                ? 'Selecione um documento obrigatório acima ou use o botão abaixo.'
                : 'Ajuste a busca ou os filtros para ver outros documentos.'}
            </p>
            {anexados.length === 0 && (
              <button
                onClick={() => abrirUpload()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-[#176B87] hover:bg-[#135a73] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" /> Anexar documento
              </button>
            )}
          </div>
        ) : modoLista ? (
          <div className="divide-y divide-[#EEF1F4]">
            {anexadosFiltrados.map(doc => {
              const s = statusDoAnexo(doc);
              const Icone = iconeDoTipo(doc.tipo);
              return (
                <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#F8FAFB] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#F4F6F8] border border-[#E4E9ED] flex items-center justify-center shrink-0">
                    <Icone className="w-4 h-4 text-[#687582]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[#17212B] truncate">{doc.nome}</span>
                      <span className="px-1.5 py-0.5 bg-[#EEF4F7] text-[#176B87] border border-[#C6E3EB] rounded text-[10px] font-bold shrink-0">
                        {doc.tipo}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[10px] text-[#687582]">
                      <span>Enviado: {formatDateBR(String(doc.created_at || '').slice(0, 10))}</span>
                      {doc.data_vencimento && <span>Vence: {formatDateBR(doc.data_vencimento)}</span>}
                      <span className="text-[#8995A1]">{formatBytes(doc.tamanho_bytes)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 hidden sm:block">
                    <Pill situacao={s} dias={diasParaVencer(doc.data_vencimento)} />
                  </div>
                  <AcoesDoc doc={doc} ocupado={ocupadoId === doc.id} onVer={() => comArquivo(doc, 'ver')} onBaixar={() => comArquivo(doc, 'baixar')} onExcluir={() => excluir(doc)} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {anexadosFiltrados.map(doc => {
              const s = statusDoAnexo(doc);
              const Icone = iconeDoTipo(doc.tipo);
              return (
                <div
                  key={doc.id}
                  className="doc-card rounded-xl border border-[#E4E9ED] hover:border-[#176B87] p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EEF4F7] border border-[#DDE7EC] flex items-center justify-center shrink-0">
                      <Icone className="w-5 h-5 text-[#176B87]" strokeWidth={1.7} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#17212B] truncate">{doc.nome}</p>
                      <p className="text-[10px] text-[#687582] truncate mt-0.5">{doc.nome_arquivo}</p>
                    </div>
                    <Pill situacao={s} dias={diasParaVencer(doc.data_vencimento)} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-[#687582] border-t border-[#EEF1F4] pt-2.5">
                    <div>
                      <p className="font-semibold text-[#8995A1]">TIPO</p>
                      <p className="text-[#17212B] font-semibold truncate">{doc.tipo}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#8995A1]">ENVIO</p>
                      <p className="text-[#17212B]">{formatDateBR(String(doc.created_at || '').slice(0, 10))}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#8995A1]">VALIDADE</p>
                      <p className="text-[#17212B]">{doc.data_vencimento ? formatDateBR(doc.data_vencimento) : '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-[#EEF1F4] pt-2.5">
                    <span className="text-[10px] text-[#8995A1]">{formatBytes(doc.tamanho_bytes)}</span>
                    <AcoesDoc doc={doc} ocupado={ocupadoId === doc.id} onVer={() => comArquivo(doc, 'ver')} onBaixar={() => comArquivo(doc, 'baixar')} onExcluir={() => excluir(doc)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showUpload && (
        <UploadDocumentoModal
          colaboradorId={colaborador.id}
          empresaId={colaborador.empresa_id || 'geral'}
          catalogo={catalogo}
          tipoPreSelecionado={uploadTipo}
          onClose={() => { setShowUpload(false); setUploadTipo(undefined); }}
          onSuccess={carregar}
        />
      )}

      {preview && <PreviewModal url={preview.url} nome={preview.nome} onClose={() => setPreview(null)} />}
    </div>
  );
};

/** Ver / baixar / substituir / excluir — respeitando o carregamento em curso. */
function AcoesDoc({
  doc,
  ocupado,
  onVer,
  onBaixar,
  onExcluir,
}: {
  doc: Documento;
  ocupado: boolean;
  onVer: () => void;
  onBaixar: () => void;
  onExcluir: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        onClick={onVer}
        disabled={ocupado}
        title={`Visualizar ${doc.nome}`}
        aria-label="Visualizar"
        className="p-1.5 text-[#687582] hover:text-[#7C3AED] hover:bg-[#F7F4FE] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
      >
        {ocupado ? (
          <span className="block w-3.5 h-3.5 border-2 border-[#7C3AED]/30 border-t-[#7C3AED] rounded-full animate-spin" />
        ) : (
          <Eye className="w-3.5 h-3.5" />
        )}
      </button>
      <button
        onClick={onBaixar}
        disabled={ocupado}
        title="Baixar"
        aria-label="Baixar"
        className="p-1.5 text-[#687582] hover:text-[#176B87] hover:bg-[#EEF4F7] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onExcluir}
        disabled={ocupado}
        title="Excluir"
        aria-label="Excluir"
        className="p-1.5 text-[#687582] hover:text-[#D64550] hover:bg-[#FDEBEC] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
