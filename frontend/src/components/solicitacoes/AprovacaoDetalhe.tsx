import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
  History,
  MessageSquare,
  Building2,
  Briefcase,
  MapPin,
  File,
  AlertTriangle,
  Loader2,
  Move,
} from 'lucide-react';
import { SolicitacaoAlteracao } from '../../types';
import {
  fetchSolicitacaoById,
  fetchSolicitacaoPreview,
  aprovarSolicitacao,
  recusarSolicitacao,
} from '../../services/api';
import { ToastMessage } from '../ui/Toast';

// ──────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────
interface AprovacaoDetalheProps {
  solicitacaoId: string;
  onVoltar: () => void;
  onShowToast: (toast: ToastMessage) => void;
  currentUser: { email: string; name: string; role: string };
  companyColor: string;
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 200, 300, 400];

// ──────────────────────────────────────────────────────────────────
// Viewer de documento com zoom real
// ──────────────────────────────────────────────────────────────────
const DocumentViewer: React.FC<{
  url: string | null;
  mimeType: string;
  nomeArquivo: string;
  loading: boolean;
  error: boolean;
}> = ({ url, mimeType, nomeArquivo, loading, error }) => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const isImage = mimeType?.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  const zoomIn = () => setZoom(z => {
    const next = ZOOM_LEVELS.find(l => l > z);
    return next || Math.min(z + 25, 400);
  });

  const zoomOut = () => setZoom(z => {
    const prev = [...ZOOM_LEVELS].reverse().find(l => l < z);
    return prev || Math.max(z - 25, 25);
  });

  const resetZoom = () => setZoom(100);

  const toggleFullscreen = () => {
    if (!viewerRef.current) return;
    if (!isFullscreen) {
      viewerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
      if (e.key === '-') { e.preventDefault(); zoomOut(); }
      if (e.key === '0') { e.preventDefault(); resetZoom(); }
      if (e.key === 'Escape' && isFullscreen) { document.exitFullscreen?.(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    }
  }, []);

  // Drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 100) return;
    const cont = containerRef.current;
    if (!cont) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setScrollPos({ x: cont.scrollLeft, y: cont.scrollTop });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const cont = containerRef.current;
    if (!cont) return;
    cont.scrollLeft = scrollPos.x - (e.clientX - dragStart.x);
    cont.scrollTop = scrollPos.y - (e.clientY - dragStart.y);
  };

  const handleMouseUp = () => setIsDragging(false);

  // Double-click zoom
  const handleDoubleClick = () => {
    if (zoom >= 200) resetZoom();
    else setZoom(200);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F4F6F8] rounded-xl border border-[#DDE3E8]" style={{ minHeight: 400 }}>
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#176B87] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#687582]">Carregando documento...</p>
        </div>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F4F6F8] rounded-xl border border-[#DDE3E8]" style={{ minHeight: 400 }}>
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-[#D97706] mx-auto" />
          <p className="text-sm font-bold text-[#17212B]">Não foi possível carregar o documento</p>
          <p className="text-xs text-[#687582]">O arquivo pode estar indisponível ou não suportado para visualização.</p>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#176B87] rounded-xl hover:bg-[#125a72] transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Baixar arquivo
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={viewerRef} className={`flex flex-col bg-white rounded-xl border border-[#DDE3E8] overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none border-none' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8FAFB] border-b border-[#E4E9ED]">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#687582]" />
          <span className="text-xs font-semibold text-[#17212B]">Visualização do Documento</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={zoom <= 25}
            title="Reduzir zoom (−)"
            className="p-1.5 rounded-lg text-[#687582] hover:bg-[#E8ECF0] hover:text-[#17212B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="flex items-center bg-white border border-[#DDE3E8] rounded-lg px-2 py-1 min-w-[64px] justify-center">
            <span className="text-[11px] font-bold text-[#17212B] tabular-nums">{zoom}%</span>
          </div>

          <button
            onClick={zoomIn}
            disabled={zoom >= 400}
            title="Ampliar zoom (+)"
            className="p-1.5 rounded-lg text-[#687582] hover:bg-[#E8ECF0] hover:text-[#17212B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-[#DDE3E8] mx-1" />

          <button
            onClick={resetZoom}
            title="Restaurar 100% (0)"
            className="p-1.5 rounded-lg text-[#687582] hover:bg-[#E8ECF0] hover:text-[#17212B] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}
            className="p-1.5 rounded-lg text-[#687582] hover:bg-[#E8ECF0] hover:text-[#17212B] transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Viewer area */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-auto bg-[#E8ECF0] ${isDragging ? 'cursor-grabbing' : zoom > 100 ? 'cursor-grab' : 'cursor-default'}`}
        style={{ minHeight: isFullscreen ? 'calc(100vh - 48px)' : 460 }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {isPdf ? (
          <iframe
            src={`${url}#toolbar=0&view=FitH`}
            className="w-full border-none"
            style={{
              height: isFullscreen ? 'calc(100vh - 48px)' : 460,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              width: `${10000 / zoom}%`,
            }}
            title={nomeArquivo || 'Documento PDF'}
          />
        ) : isImage ? (
          <div className="flex items-start justify-center p-4" style={{ minHeight: isFullscreen ? 'calc(100vh - 48px)' : 460 }}>
            <img
              src={url}
              alt={nomeArquivo || 'Documento'}
              draggable={false}
              className="max-w-none select-none transition-transform duration-150"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center p-8" style={{ minHeight: isFullscreen ? 'calc(100vh - 48px)' : 460 }}>
            <div className="text-center space-y-3">
              <File className="w-12 h-12 text-[#8995A1] mx-auto" />
              <p className="text-sm font-bold text-[#17212B]">{nomeArquivo}</p>
              <p className="text-xs text-[#687582]">Este tipo de arquivo não pode ser visualizado diretamente.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#176B87] rounded-xl hover:bg-[#125a72] transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Baixar arquivo
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Zoom hint */}
      {zoom > 100 && (
        <div className="px-4 py-1.5 bg-[#F8FAFB] border-t border-[#E4E9ED] flex items-center gap-1.5 text-[10px] text-[#8995A1]">
          <Move className="w-3 h-3" />
          <span>Arraste para navegar pelo documento ampliado • Duplo-clique para alternar zoom • Ctrl+Scroll para zoom</span>
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────────
export const AprovacaoDetalhe: React.FC<AprovacaoDetalheProps> = ({
  solicitacaoId,
  onVoltar,
  onShowToast,
  currentUser,
  companyColor,
}) => {
  const [sol, setSol] = useState<SolicitacaoAlteracao | null>(null);
  const [loading, setLoading] = useState(true);

  // Preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);

  // Actions
  const [aprovando, setAprovando] = useState(false);
  const [confirmAprovar, setConfirmAprovar] = useState(false);
  const [recusando, setRecusando] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [erroRecusa, setErroRecusa] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Expandable sections
  const [showInfoExtra, setShowInfoExtra] = useState(false);
  const [showHistorico, setShowHistorico] = useState(true);

  // Load solicitation data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchSolicitacaoById(solicitacaoId);
        if (!cancelled && res.success) setSol(res.data);
      } catch (err: any) {
        if (!cancelled) onShowToast({ id: Date.now().toString(), type: 'error', title: 'Erro', message: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [solicitacaoId]);

  // Load preview
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchSolicitacaoPreview(solicitacaoId);
        if (!cancelled && res.success) setPreviewUrl(res.url);
      } catch {
        if (!cancelled) setPreviewError(true);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [solicitacaoId]);

  // Parsed data
  const dados = sol?.dados_solicitados_parsed || {};
  const docTipo = dados.tipo || '';
  const docNome = dados.nome || sol?.valor_solicitado || '';
  const docArquivo = dados.nome_arquivo || '';
  const docMime = dados.mime_type || '';
  const docBytes = dados.tamanho_bytes || 0;
  const colaboradorNome = dados.colaborador_nome || sol?.registro_identificador || '';
  const colaboradorFuncao = dados.funcao || '';
  const obraNome = dados.obra_nome || '';

  const isPendente = sol?.status === 'pendente';
  const isAprovada = sol?.status === 'aprovada';
  const isRecusada = sol?.status === 'recusada';

  // Approve handler
  const handleAprovar = async () => {
    if (!sol) return;
    setAprovando(true);
    try {
      const res = await aprovarSolicitacao(sol.id, {
        aprovador_id: 'from-token',
        aprovador_nome: currentUser.name,
        aprovador_cargo: currentUser.role,
        aprovador_cargo_id: '',
        observacoes_aprovacao: observacoes || undefined,
      });
      if (res.success) {
        onShowToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Documento aprovado!',
          message: `O documento "${docNome}" foi anexado ao colaborador ${colaboradorNome}.`,
        });
        onVoltar();
      }
    } catch (err: any) {
      onShowToast({ id: Date.now().toString(), type: 'error', title: 'Erro ao aprovar', message: err.message });
    } finally {
      setAprovando(false);
      setConfirmAprovar(false);
    }
  };

  // Reject handler
  const handleRecusar = async () => {
    if (!sol) return;
    if (!motivoRecusa.trim()) {
      setErroRecusa('Informe o motivo da recusa.');
      return;
    }
    setRecusando(true);
    try {
      const res = await recusarSolicitacao(sol.id, {
        aprovador_id: 'from-token',
        aprovador_nome: currentUser.name,
        aprovador_cargo: currentUser.role,
        aprovador_cargo_id: '',
        motivo_recusa: motivoRecusa.trim(),
      });
      if (res.success) {
        onShowToast({
          id: Date.now().toString(),
          type: 'info',
          title: 'Documento recusado',
          message: 'O documento não foi anexado. Motivo registrado na auditoria.',
        });
        onVoltar();
      }
    } catch (err: any) {
      onShowToast({ id: Date.now().toString(), type: 'error', title: 'Erro ao recusar', message: err.message });
    } finally {
      setRecusando(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-[#DDE3E8] p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#176B87] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#687582]">Carregando aprovação...</p>
        </div>
      </div>
    );
  }

  if (!sol) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-[#DDE3E8] p-12 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-[#D97706] mx-auto" />
          <p className="text-sm font-bold text-[#17212B]">Solicitação não encontrada</p>
          <button onClick={onVoltar} className="mt-2 px-4 py-2 text-xs font-bold text-[#176B87] bg-[#E8F3F6] rounded-xl hover:bg-[#D4E8EF] transition-colors cursor-pointer">
            Voltar para aprovações
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* ── Botão voltar ── */}
      <button
        onClick={onVoltar}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#687582] hover:text-[#17212B] transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Voltar para aprovações
      </button>

      {/* ── Cabeçalho ── */}
      <div className="bg-white rounded-2xl border border-[#DDE3E8] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-xs flex-shrink-0" style={{ backgroundColor: companyColor }}>
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-[#17212B] tracking-tight">Aprovação de Documento</h1>
              <p className="text-xs text-[#687582] mt-0.5">
                Revise as informações e o documento antes de aprovar ou recusar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-2.5 py-1 text-xs font-black text-[#176B87] bg-[#E8F3F6] border border-[#C6E3EB] rounded-lg">
              #{sol.codigo_sequencial}
            </span>

            {isPendente && (
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] flex items-center gap-1">
                <Clock className="w-3 h-3" /> Pendente
              </span>
            )}
            {isAprovada && (
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-[#E8F6F1] text-[#159A72] border border-[#B8E8D9] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Aprovado
              </span>
            )}
            {isRecusada && (
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-[#FDEBEC] text-[#D64550] border border-[#F8B4B9] flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Recusado
              </span>
            )}

            <span className="text-[11px] text-[#8995A1] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDateTime(sol.data_solicitacao)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Card do colaborador ── */}
      <div className="bg-white rounded-2xl border border-[#DDE3E8] shadow-xs overflow-hidden">
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            {/* Avatar + nome */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="w-12 h-12 rounded-xl bg-[#E8F3F6] flex items-center justify-center flex-shrink-0 border border-[#C6E3EB]">
                <User className="w-6 h-6 text-[#176B87]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#17212B] leading-tight">{colaboradorNome}</p>
                {colaboradorFuncao && (
                  <p className="text-xs text-[#687582] flex items-center gap-1 mt-0.5">
                    <Briefcase className="w-3 h-3" /> {colaboradorFuncao}
                  </p>
                )}
                {obraNome && (
                  <p className="text-xs text-[#687582] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {obraNome}
                  </p>
                )}
              </div>
            </div>

            {/* Separador */}
            <div className="hidden lg:block w-px h-12 bg-[#E4E9ED]" />

            {/* Tipo de documento */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8995A1]">Tipo de documento</p>
              <p className="text-sm font-bold text-[#17212B] mt-0.5">{docTipo || '—'}</p>
              <p className="text-[11px] text-[#687582]">{dados.descricao_tipo || ''}</p>
            </div>

            {/* Separador */}
            <div className="hidden lg:block w-px h-12 bg-[#E4E9ED]" />

            {/* Arquivo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#F4F6F8] border border-[#DDE3E8] flex items-center justify-center flex-shrink-0">
                {docMime?.startsWith('image/') ? (
                  <File className="w-4 h-4 text-[#2563EB]" />
                ) : docMime === 'application/pdf' ? (
                  <FileText className="w-4 h-4 text-[#D64550]" />
                ) : (
                  <File className="w-4 h-4 text-[#687582]" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#17212B] truncate max-w-[200px]">{docArquivo || '—'}</p>
                {docBytes > 0 && <p className="text-[10px] text-[#8995A1]">{formatBytes(docBytes)}</p>}
              </div>
              {previewUrl && (
                <a
                  href={previewUrl}
                  download={docArquivo}
                  className="p-2 rounded-lg border border-[#DDE3E8] text-[#687582] hover:bg-[#F4F6F8] hover:text-[#17212B] transition-colors cursor-pointer"
                  title="Baixar arquivo original"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Separador */}
            <div className="hidden lg:block w-px h-12 bg-[#E4E9ED]" />

            {/* Enviado por */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8995A1]">Enviado por</p>
              <p className="text-xs font-bold text-[#17212B] mt-0.5 flex items-center gap-1">
                <User className="w-3 h-3 text-[#687582]" /> {sol.solicitante_nome}
                {sol.solicitante_cargo && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-[#F0F3F5] text-[10px] font-semibold text-[#687582] uppercase">
                    {sol.solicitante_cargo}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-[#687582] flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" /> Data de envio: <strong>{formatDateTime(sol.data_solicitacao)}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Layout principal: Viewer + Painel lateral ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Viewer - coluna principal */}
        <div className="lg:col-span-8 space-y-5">
          <DocumentViewer
            url={previewUrl}
            mimeType={docMime}
            nomeArquivo={docArquivo}
            loading={previewLoading}
            error={previewError}
          />

          {/* Histórico */}
          <div className="bg-white rounded-2xl border border-[#DDE3E8] shadow-xs overflow-hidden">
            <button
              onClick={() => setShowHistorico(!showHistorico)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-[#F8FAFB] transition-colors"
            >
              <span className="text-xs font-bold text-[#17212B] flex items-center gap-2">
                <History className="w-4 h-4 text-[#176B87]" />
                Histórico
              </span>
              {showHistorico ? <ChevronUp className="w-4 h-4 text-[#687582]" /> : <ChevronDown className="w-4 h-4 text-[#687582]" />}
            </button>

            {showHistorico && (
              <div className="px-5 pb-5 border-t border-[#EEF1F4]">
                {sol.historico && sol.historico.length > 0 ? (
                  <div className="relative pl-6 pt-4 space-y-4 before:absolute before:left-2 before:top-6 before:bottom-4 before:w-0.5 before:bg-[#E4E9ED]">
                    {sol.historico.map((item, idx) => (
                      <div key={item.id || idx} className="relative">
                        <div className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                          item.tipo_evento === 'APROVADA' ? 'border-[#159A72]' :
                          item.tipo_evento === 'RECUSADA' ? 'border-[#D64550]' :
                          'border-[#176B87]'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            item.tipo_evento === 'APROVADA' ? 'bg-[#159A72]' :
                            item.tipo_evento === 'RECUSADA' ? 'bg-[#D64550]' :
                            'bg-[#176B87]'
                          }`} />
                        </div>
                        <div className="bg-[#F8FAFB] p-3 rounded-xl border border-[#E4E9ED]">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#17212B]">
                              {item.usuario_nome}
                              <span className="font-normal text-[#687582] ml-1">({item.usuario_cargo || 'Usuário'})</span>
                            </span>
                            <span className="text-[10px] text-[#8995A1]">{formatDateTime(item.created_at)}</span>
                          </div>
                          <p className="text-xs text-[#556370] mt-1">{item.detalhes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8995A1] pt-4">Sem histórico de aprovações e recusas.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Painel lateral */}
        <div className="lg:col-span-4 space-y-5">
          {/* Ações de aprovação/recusa */}
          {isPendente && (
            <>
              {/* Aprovar */}
              <div className="bg-white rounded-2xl border border-[#B8E8D9] shadow-xs overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-[#E8F6F1] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-[#159A72]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#159A72]">Aprovar documento</p>
                      <p className="text-[11px] text-[#687582] mt-0.5 leading-snug">
                        O documento está anexado ao perfil do colaborador e ficará disponível no sistema.
                      </p>
                    </div>
                  </div>

                  {!confirmAprovar ? (
                    <button
                      onClick={() => setConfirmAprovar(true)}
                      className="w-full py-2.5 text-sm font-bold text-white bg-[#159A72] hover:bg-[#12805F] rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Aprovar
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#17212B] text-center">Confirmar aprovação?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmAprovar(false)}
                          className="flex-1 py-2 text-xs font-bold text-[#687582] bg-[#F4F6F8] border border-[#DDE3E8] rounded-xl hover:bg-[#E8ECF0] transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleAprovar}
                          disabled={aprovando}
                          className="flex-1 py-2 text-xs font-bold text-white bg-[#159A72] hover:bg-[#12805F] rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                          {aprovando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          {aprovando ? 'Aprovando...' : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recusar */}
              <div className="bg-white rounded-2xl border border-[#F5B8BB] shadow-xs overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-[#FDEBEC] flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-5 h-5 text-[#D64550]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#D64550]">Recusar documento</p>
                      <p className="text-[11px] text-[#687582] mt-0.5 leading-snug">
                        Informe o motivo da recusa para que o documento seja revisado e reenviado.
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={motivoRecusa}
                    onChange={e => { setMotivoRecusa(e.target.value); if (erroRecusa) setErroRecusa(''); }}
                    placeholder="Motivo da recusa (obrigatório)..."
                    rows={3}
                    maxLength={500}
                    className="w-full p-3 text-xs rounded-xl border border-[#DDE3E8] focus:outline-none focus:ring-2 focus:ring-[#D64550]/30 focus:border-[#D64550] resize-none mb-1"
                  />
                  <div className="flex items-center justify-between mb-3">
                    {erroRecusa ? (
                      <p className="text-[10px] font-semibold text-[#D64550]">{erroRecusa}</p>
                    ) : <span />}
                    <span className="text-[10px] text-[#8995A1]">{motivoRecusa.length}/500</span>
                  </div>

                  <button
                    onClick={handleRecusar}
                    disabled={recusando}
                    className="w-full py-2.5 text-sm font-bold text-[#D64550] bg-[#FDEBEC] hover:bg-[#F8D7DA] border border-[#F5B8BB] rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {recusando ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    {recusando ? 'Processando...' : 'Recusar'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Resolução (quando já resolvido) */}
          {!isPendente && (
            <div className={`bg-white rounded-2xl border shadow-xs overflow-hidden ${
              isAprovada ? 'border-[#B8E8D9]' : 'border-[#F5B8BB]'
            }`}>
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isAprovada ? 'bg-[#E8F6F1]' : 'bg-[#FDEBEC]'
                  }`}>
                    {isAprovada ? <CheckCircle2 className="w-5 h-5 text-[#159A72]" /> : <XCircle className="w-5 h-5 text-[#D64550]" />}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${isAprovada ? 'text-[#159A72]' : 'text-[#D64550]'}`}>
                      {isAprovada ? 'Documento aprovado' : 'Documento recusado'}
                    </p>
                    <p className="text-xs text-[#556370] mt-1">
                      Por <strong className="text-[#17212B]">{sol.aprovador_nome}</strong>
                      {sol.aprovador_cargo && <span className="text-[#687582]"> ({sol.aprovador_cargo})</span>}
                    </p>
                    <p className="text-[11px] text-[#8995A1] mt-0.5">
                      {formatDateTime(sol.data_aprovacao || undefined)}
                    </p>
                    {sol.motivo_recusa && (
                      <div className="mt-3 p-3 bg-[#FFF7F7] border border-[#F5B8BB] rounded-xl">
                        <p className="text-[10px] font-bold uppercase text-[#D64550] mb-1">Motivo da recusa</p>
                        <p className="text-xs text-[#556370]">"{sol.motivo_recusa}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Informações adicionais */}
          <div className="bg-white rounded-2xl border border-[#DDE3E8] shadow-xs overflow-hidden">
            <button
              onClick={() => setShowInfoExtra(!showInfoExtra)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-[#F8FAFB] transition-colors"
            >
              <span className="text-xs font-bold text-[#17212B] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#176B87]" />
                Informações adicionais
              </span>
              {showInfoExtra ? <ChevronUp className="w-4 h-4 text-[#687582]" /> : <ChevronDown className="w-4 h-4 text-[#687582]" />}
            </button>

            {showInfoExtra && (
              <div className="px-5 pb-5 border-t border-[#EEF1F4] space-y-2.5 pt-4">
                <InfoRow label="Documento" value={docTipo || '—'} />
                <InfoRow label="Nome do arquivo" value={docArquivo || '—'} />
                <InfoRow label="Tamanho do arquivo" value={docBytes > 0 ? formatBytes(docBytes) : '—'} />
                <InfoRow label="Enviado em" value={formatDateTime(sol.data_solicitacao)} />
                <InfoRow label="Enviado por" value={`${sol.solicitante_nome}${sol.solicitante_cargo ? ` (${sol.solicitante_cargo})` : ''}`} />
                <InfoRow label="Colaborador" value={colaboradorNome} />
                {colaboradorFuncao && <InfoRow label="Função" value={colaboradorFuncao} />}
                {obraNome && <InfoRow label="Obra" value={obraNome} />}
              </div>
            )}
          </div>

          {/* Observações */}
          {isPendente && (
            <div className="bg-white rounded-2xl border border-[#DDE3E8] shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#EEF1F4]">
                <span className="text-xs font-bold text-[#17212B] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#176B87]" />
                  Observações
                </span>
              </div>
              <div className="p-5">
                <textarea
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Adicione uma observação (opcional)..."
                  rows={3}
                  maxLength={500}
                  className="w-full p-3 text-xs rounded-xl border border-[#DDE3E8] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] resize-none"
                />
                <p className="text-right text-[10px] text-[#8995A1] mt-1">{observacoes.length}/500</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────
// Auxiliar
// ──────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-xs py-1.5 border-b border-[#F0F3F5] last:border-b-0">
    <span className="text-[#687582]">{label}</span>
    <span className="font-semibold text-[#17212B] text-right max-w-[60%] truncate">{value}</span>
  </div>
);
