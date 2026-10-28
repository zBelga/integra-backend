import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Users,
  ShieldCheck,
  Building2,
  ArrowRight,
  Eye,
  History,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Image,
  File,
  User,
  Download,
  ExternalLink,
} from 'lucide-react';
import { Empresa, SolicitacaoAlteracao, SolicitacaoStatus } from '../../types';
import { getCompanyTheme } from '../../utils/theme';
import {
  fetchSolicitacoes,
  fetchSolicitacoesStats,
  aprovarSolicitacao,
  recusarSolicitacao,
  fetchSolicitacaoPreview,
} from '../../services/api';
import { ToastMessage } from '../ui/Toast';
import { SolicitacaoDetalhesModal } from './SolicitacaoDetalhesModal';
import { RecusarModal } from './RecusarModal';

interface SolicitacoesViewProps {
  selectedEmpresa: Empresa | null;
  onShowToast: (toast: ToastMessage) => void;
  currentUser?: { email: string; name: string; role: string };
  onNavigateToPermissoes?: () => void;
  onNavigate?: (view: string) => void;
}

/** Componente de preview inline do documento pendente. */
const DocumentPreview: React.FC<{ solicitacaoId: string; mimeType?: string; nomeArquivo?: string }> = ({
  solicitacaoId,
  mimeType,
  nomeArquivo,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchSolicitacaoPreview(solicitacaoId);
        if (!cancelled && res.success) setPreviewUrl(res.url);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [solicitacaoId]);

  const isImage = mimeType?.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  if (loading) {
    return (
      <div className="w-full h-44 bg-[#F4F6F8] rounded-xl border border-[#DDE3E8] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#176B87] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !previewUrl) {
    return (
      <div className="w-full h-44 bg-[#F4F6F8] rounded-xl border border-[#DDE3E8] flex flex-col items-center justify-center gap-2 text-[#8995A1]">
        <File className="w-8 h-8" />
        <span className="text-xs font-medium">{nomeArquivo || 'Arquivo pendente'}</span>
        <span className="text-[10px]">Preview indisponível</span>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="relative group">
        <img
          src={previewUrl}
          alt={nomeArquivo || 'Documento'}
          className="w-full h-44 object-contain bg-[#F8FAFB] rounded-xl border border-[#DDE3E8]"
        />
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg border border-[#DDE3E8] opacity-0 group-hover:opacity-100 transition-opacity"
          title="Abrir em nova aba"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#176B87]" />
        </a>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="relative">
        <iframe
          src={previewUrl}
          className="w-full h-44 rounded-xl border border-[#DDE3E8] bg-white"
          title={nomeArquivo || 'PDF'}
        />
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg border border-[#DDE3E8] hover:bg-white transition-colors"
          title="Abrir PDF"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#176B87]" />
        </a>
      </div>
    );
  }

  // Qualquer outro tipo: ícone + link
  return (
    <a
      href={previewUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full h-44 bg-[#F4F6F8] rounded-xl border border-[#DDE3E8] flex flex-col items-center justify-center gap-2 text-[#556370] hover:bg-[#E8ECF0] transition-colors"
    >
      <FileText className="w-10 h-10 text-[#176B87]" />
      <span className="text-xs font-semibold">{nomeArquivo || 'Arquivo'}</span>
      <span className="text-[10px] text-[#8995A1] flex items-center gap-1">
        <ExternalLink className="w-3 h-3" /> Abrir arquivo
      </span>
    </a>
  );
};

/** Formatar bytes em texto legível */
function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const SolicitacoesView: React.FC<SolicitacoesViewProps> = ({
  selectedEmpresa,
  onShowToast,
  currentUser = { email: 'fabriciooliveira2431@gmail.com', name: 'Fabrício Oliveira', role: 'Administrador Geral' },
  onNavigateToPermissoes,
  onNavigate,
}) => {
  const companyColor = selectedEmpresa?.corPrimaria || '#176B87';
  const theme = getCompanyTheme(companyColor);

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAlteracao[]>([]);
  const [stats, setStats] = useState({ total: 0, pendente: 0, aprovada: 0, recusada: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('pendente');
  const [moduloFilter, setModuloFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedForDetails, setSelectedForDetails] = useState<string | null>(null);
  const [selectedForRecusa, setSelectedForRecusa] = useState<SolicitacaoAlteracao | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [solRes, statsRes] = await Promise.all([
        fetchSolicitacoes({
          empresa_id: selectedEmpresa?.id,
          modulo: moduloFilter,
          status: statusFilter,
          search: searchQuery,
        }),
        fetchSolicitacoesStats(selectedEmpresa?.id),
      ]);

      if (solRes.success) {
        setSolicitacoes(solRes.data);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (err: any) {
      onShowToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erro ao carregar solicitações',
        message: err.message || 'Falha ao buscar fila de aprovações.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmpresa?.id, statusFilter, moduloFilter, searchQuery, onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAprovar = async (sol: SolicitacaoAlteracao) => {
    try {
      const res = await aprovarSolicitacao(sol.id, {
        aprovador_id: 'from-token',
        aprovador_nome: currentUser.name || 'Aprovador',
        aprovador_cargo: currentUser.role || 'Administrador',
        aprovador_cargo_id: '',
      });

      if (res.success) {
        onShowToast({
          id: Date.now().toString(),
          type: 'success',
          title: `Documento aprovado!`,
          message: sol.modulo === 'documentos'
            ? `O documento "${sol.valor_solicitado}" foi anexado ao colaborador ${sol.registro_identificador}.`
            : `Solicitação #${sol.codigo_sequencial} aprovada.`,
        });
        loadData();
      }
    } catch (err: any) {
      onShowToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erro ao aprovar',
        message: err.message || 'Erro ao processar aprovação.',
      });
    }
  };

  const handleConfirmRecusa = async (motivo: string) => {
    if (!selectedForRecusa) return;

    try {
      const res = await recusarSolicitacao(selectedForRecusa.id, {
        aprovador_id: 'from-token',
        aprovador_nome: currentUser.name || 'Aprovador',
        aprovador_cargo: currentUser.role || 'Administrador',
        aprovador_cargo_id: '',
        motivo_recusa: motivo,
      });

      if (res.success) {
        onShowToast({
          id: Date.now().toString(),
          type: 'info',
          title: `Solicitação recusada`,
          message: `O documento não foi anexado. Motivo registrado na auditoria.`,
        });
        loadData();
      }
    } catch (err: any) {
      onShowToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erro ao recusar',
        message: err.message || 'Erro ao processar recusa.',
      });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-[#DDE3E8] p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-2xs flex-shrink-0"
              style={{ backgroundColor: companyColor }}
            >
              <Send className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#17212B] tracking-tight">
                  Aprovações
                </h1>
                {stats.pendente > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                    {stats.pendente} pendente{stats.pendente === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#687582] mt-1">
                Documentos enviados para aprovação antes de serem anexados ao colaborador.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 bg-[#F4F6F8] hover:bg-[#E8ECF0] text-[#687582] hover:text-[#17212B] rounded-xl border border-[#DDE3E8] transition-colors cursor-pointer"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-[#DDE3E8] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                statusFilter === 'all'
                  ? 'bg-[#17212B] text-white shadow-2xs'
                  : 'text-[#687582] hover:bg-[#F4F6F8]'
              }`}
            >
              <span>Todas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {stats.total}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('pendente')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                statusFilter === 'pendente'
                  ? 'bg-[#D97706] text-white shadow-2xs'
                  : 'text-[#B45309] hover:bg-[#FEF3C7]/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pendentes</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/25">
                {stats.pendente}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('aprovada')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                statusFilter === 'aprovada'
                  ? 'bg-[#159A72] text-white shadow-2xs'
                  : 'text-[#159A72] hover:bg-[#E8F6F1]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aprovadas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/25">
                {stats.aprovada}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('recusada')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                statusFilter === 'recusada'
                  ? 'bg-[#D64550] text-white shadow-2xs'
                  : 'text-[#D64550] hover:bg-[#FDEBEC]'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Recusadas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/25">
                {stats.recusada}
              </span>
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome ou documento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#CCD6DD] focus:outline-none focus:ring-2 focus:ring-[#176B87]"
            />
          </div>
        </div>
      </div>

      {/* List of Requests */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#DDE3E8] p-12 text-center text-[#687582] space-y-3">
            <div className="w-8 h-8 border-2 border-[#176B87] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold">Carregando solicitações...</p>
          </div>
        ) : solicitacoes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#DDE3E8] p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F6F1] text-[#159A72] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#17212B]">Nenhuma solicitação encontrada</h3>
            <p className="text-xs text-[#687582] max-w-md mx-auto">
              {statusFilter === 'pendente'
                ? 'Nenhum documento aguardando aprovação no momento.'
                : 'Nenhum registro com os filtros selecionados.'}
            </p>
          </div>
        ) : (
          solicitacoes.map((sol) => {
            const isPendente = sol.status === 'pendente';
            const isAprovada = sol.status === 'aprovada';
            const isRecusada = sol.status === 'recusada';
            const isDoc = sol.modulo === 'documentos';

            // Parse dados_solicitados para documentos
            const dados = sol.dados_solicitados_parsed || {};
            const docTipo = dados.tipo || '';
            const docNome = dados.nome || sol.valor_solicitado || '';
            const docArquivo = dados.nome_arquivo || '';
            const docMime = dados.mime_type || '';
            const docBytes = dados.tamanho_bytes || 0;
            const colaboradorNome = dados.colaborador_nome || sol.registro_identificador || '';

            if (isDoc) {
              // ── Card especial para documentos ──
              return (
                <div
                  key={sol.id}
                  className="bg-white rounded-2xl border border-[#DDE3E8] shadow-xs hover:shadow-sm transition-all overflow-hidden"
                >
                  {/* Status bar no topo */}
                  <div className={`px-5 py-2.5 flex items-center justify-between ${
                    isPendente ? 'bg-[#FEF3C7]/50' : isAprovada ? 'bg-[#E8F6F1]/50' : 'bg-[#FDEBEC]/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-[#8995A1] uppercase tracking-wider">
                        #{sol.codigo_sequencial}
                      </span>
                      {isPendente && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Aguardando aprovação
                        </span>
                      )}
                      {isAprovada && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#E8F6F1] text-[#159A72] border border-[#B8E8D9] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Aprovado
                        </span>
                      )}
                      {isRecusada && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#FDEBEC] text-[#D64550] border border-[#F8B4B9] flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Recusado
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#8995A1]">
                      {new Date(sol.data_solicitacao).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* Preview do arquivo (lado esquerdo) */}
                      <div className="lg:col-span-4">
                        {isPendente ? (
                          <DocumentPreview
                            solicitacaoId={sol.id}
                            mimeType={docMime}
                            nomeArquivo={docArquivo}
                          />
                        ) : (
                          <div className="w-full h-44 bg-[#F4F6F8] rounded-xl border border-[#DDE3E8] flex flex-col items-center justify-center gap-2 text-[#8995A1]">
                            {isAprovada ? (
                              <>
                                <CheckCircle2 className="w-8 h-8 text-[#159A72]" />
                                <span className="text-xs font-medium text-[#159A72]">Documento anexado</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-8 h-8 text-[#D64550]" />
                                <span className="text-xs font-medium text-[#D64550]">Documento recusado</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Info do documento (lado direito) */}
                      <div className="lg:col-span-8 flex flex-col justify-between gap-4">
                        {/* Dados principais */}
                        <div className="space-y-3">
                          {/* Colaborador */}
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#E8F3F6] flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-[#176B87]" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8995A1]">Colaborador</p>
                              <p className="text-sm font-bold text-[#17212B] leading-tight">{colaboradorNome}</p>
                            </div>
                          </div>

                          {/* Tipo de documento e nome do arquivo */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 bg-[#F8FAFB] rounded-xl border border-[#E1E8ED]">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8995A1]">Tipo de documento</p>
                              <p className="text-sm font-bold text-[#2563EB] mt-0.5">{docTipo || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-[#F8FAFB] rounded-xl border border-[#E1E8ED]">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8995A1]">Arquivo</p>
                              <p className="text-xs font-semibold text-[#17212B] mt-0.5 truncate" title={docArquivo}>
                                {docNome || docArquivo || 'N/A'}
                              </p>
                              {docBytes > 0 && (
                                <p className="text-[10px] text-[#8995A1] mt-0.5">{formatBytes(docBytes)}</p>
                              )}
                            </div>
                          </div>

                          {/* Quem enviou */}
                          <div className="flex items-center gap-2 text-xs text-[#556370]">
                            <div className="w-5 h-5 rounded-full bg-[#E8ECF0] flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-[#687582]" />
                            </div>
                            <span>
                              Enviado por <strong className="text-[#17212B]">{sol.solicitante_nome}</strong>
                              {sol.solicitante_cargo && (
                                <span className="ml-1 px-1.5 py-0.5 rounded bg-[#F4F6F8] text-[10px] font-semibold text-[#687582]">
                                  {sol.solicitante_cargo}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Resolução (se já foi aprovado/recusado) */}
                        {!isPendente && (
                          <div className={`p-3 rounded-xl border text-xs ${
                            isAprovada
                              ? 'bg-[#E8F6F1]/50 border-[#B8E8D9] text-[#556370]'
                              : 'bg-[#FDEBEC]/50 border-[#F8B4B9] text-[#556370]'
                          }`}>
                            <strong className="text-[#17212B]">
                              {isAprovada ? 'Aprovado por:' : 'Recusado por:'}
                            </strong>{' '}
                            {sol.aprovador_nome} ({sol.aprovador_cargo}) —{' '}
                            <span className="text-[#8995A1]">
                              {sol.data_aprovacao ? new Date(sol.data_aprovacao).toLocaleString('pt-BR') : ''}
                            </span>
                            {sol.motivo_recusa && (
                              <p className="text-[#D64550] mt-1">
                                <strong>Motivo:</strong> "{sol.motivo_recusa}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Ações */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <button
                            onClick={() => setSelectedForDetails(sol.id)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] rounded-lg transition-colors cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>Auditoria</span>
                          </button>

                          {isPendente && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setSelectedForRecusa(sol)}
                                className="px-4 py-2 text-xs font-bold text-[#D64550] bg-[#FDEBEC] hover:bg-[#F8D7DA] border border-[#F8B4B9] rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Recusar</span>
                              </button>

                              <button
                                onClick={() => handleAprovar(sol)}
                                className="px-5 py-2 text-xs font-bold text-white bg-[#159A72] hover:bg-[#12805F] rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Aprovar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // ── Card genérico (para outros módulos, caso existam) ──
            return (
              <div
                key={sol.id}
                className="bg-white rounded-2xl border border-[#DDE3E8] p-5 shadow-xs hover:shadow-sm transition-all space-y-4"
              >
                {/* Top Info Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EBF0F3]">
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-[#E8F3F6] text-[#176B87] border border-[#C6E3EB]">
                      #{sol.codigo_sequencial}
                    </span>

                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#F4F6F8] text-[#556370] border border-[#DDE3E8] uppercase">
                      {sol.modulo}
                    </span>

                    <h3 className="text-sm font-bold text-[#17212B]">{sol.registro_identificador}</h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isPendente && (
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Aguardando Aprovação</span>
                      </span>
                    )}
                    {isAprovada && (
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#E8F6F1] text-[#159A72] border border-[#B8E8D9] flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aprovada</span>
                      </span>
                    )}
                    {isRecusada && (
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#FDEBEC] text-[#D64550] border border-[#F8B4B9] flex items-center space-x-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Recusada</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Requester Details & Diff Container */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  <div className="lg:col-span-4 space-y-1 text-xs text-[#556370]">
                    <p>
                      <strong className="text-[#17212B]">Solicitado por:</strong> {sol.solicitante_nome}
                    </p>
                    <p>
                      <strong className="text-[#17212B]">Cargo:</strong>{' '}
                      <span className="px-1.5 py-0.5 rounded bg-[#F4F6F8] font-semibold text-[#176B87]">
                        {sol.solicitante_cargo}
                      </span>
                    </p>
                    <p className="text-[11px] text-[#8995A1]">
                      {new Date(sol.data_solicitacao).toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <div className="lg:col-span-8 bg-[#F8FAFB] rounded-xl border border-[#E1E8ED] p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#17212B] flex items-center space-x-1.5">
                        <span className="text-[#687582]">Campo:</span>
                        <span className="text-[#2563EB] underline decoration-dotted">{sol.campo}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-white rounded-lg border border-[#DDE3E8]">
                        <span className="text-[10px] font-bold uppercase text-[#8995A1] block">Valor Anterior</span>
                        <span className="font-medium text-[#D64550] mt-0.5 block break-words">
                          {sol.valor_atual || '(Vazio)'}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-[#B8E8D9] bg-[#E8F6F1]/30">
                        <span className="text-[10px] font-bold uppercase text-[#159A72] block">Valor Solicitado</span>
                        <span className="font-bold text-[#159A72] mt-0.5 block break-words">
                          {sol.valor_solicitado || '(Vazio)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resolution Notes */}
                {!isPendente && (
                  <div className="p-3 bg-[#F8FAFB] rounded-xl border border-[#E1E8ED] text-xs text-[#556370]">
                    <strong className="text-[#17212B]">
                      {isAprovada ? 'Aprovado por:' : 'Recusado por:'}
                    </strong>{' '}
                    {sol.aprovador_nome} ({sol.aprovador_cargo}) —{' '}
                    <span className="text-[#8995A1]">
                      {sol.data_aprovacao ? new Date(sol.data_aprovacao).toLocaleString('pt-BR') : ''}
                    </span>
                    {sol.motivo_recusa && (
                      <p className="text-[#D64550] mt-0.5">
                        <strong>Motivo:</strong> "{sol.motivo_recusa}"
                      </p>
                    )}
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    onClick={() => setSelectedForDetails(sol.id)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] rounded-lg transition-colors cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Auditoria</span>
                  </button>

                  {isPendente && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedForRecusa(sol)}
                        className="px-4 py-2 text-xs font-bold text-[#D64550] bg-[#FDEBEC] hover:bg-[#F8D7DA] border border-[#F8B4B9] rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Recusar</span>
                      </button>

                      <button
                        onClick={() => handleAprovar(sol)}
                        className="px-5 py-2 text-xs font-bold text-white bg-[#159A72] hover:bg-[#12805F] rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aprovar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Details & Audit Trail */}
      <SolicitacaoDetalhesModal
        solicitacaoId={selectedForDetails}
        isOpen={Boolean(selectedForDetails)}
        onClose={() => setSelectedForDetails(null)}
      />

      {/* Modal: Justify Rejection */}
      <RecusarModal
        solicitacao={selectedForRecusa}
        isOpen={Boolean(selectedForRecusa)}
        onClose={() => setSelectedForRecusa(null)}
        onConfirm={handleConfirmRecusa}
      />
    </div>
  );
};
