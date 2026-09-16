import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Empresa, SolicitacaoAlteracao, SolicitacaoStatus } from '../../types';
import { getCompanyTheme } from '../../utils/theme';
import {
  fetchSolicitacoes,
  fetchSolicitacoesStats,
  aprovarSolicitacao,
  recusarSolicitacao,
} from '../../services/api';
import { ToastMessage } from '../ui/Toast';
import { SolicitacaoDetalhesModal } from './SolicitacaoDetalhesModal';
import { RecusarModal } from './RecusarModal';

interface SolicitacoesViewProps {
  selectedEmpresa: Empresa | null;
  onShowToast: (toast: ToastMessage) => void;
  currentUser?: { email: string; name: string; role: string };
  onNavigateToPermissoes?: () => void;
}

export const SolicitacoesView: React.FC<SolicitacoesViewProps> = ({
  selectedEmpresa,
  onShowToast,
  currentUser = { email: 'fabriciooliveira2431@gmail.com', name: 'Fabrício Oliveira', role: 'Administrador Geral' },
  onNavigateToPermissoes,
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

  // Active Simulated Approver Profile (Encarregado, Assistente, Master Admin)
  const [simulatedRole, setSimulatedRole] = useState<'encarregado' | 'assistente' | 'master'>('encarregado');

  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();
  }, [selectedEmpresa?.id, statusFilter, moduloFilter, searchQuery]);

  const handleAprovar = async (sol: SolicitacaoAlteracao) => {
    // Determine approver details based on simulated profile
    let approverId = 'usr-enc-01';
    let approverName = 'Carlos Eduardo (Encarregado Geral)';
    let approverCargo = 'Encarregado Geral';
    let approverCargoId = 'cargo-enc-01';

    if (simulatedRole === 'assistente') {
      approverId = 'usr-ast-01';
      approverName = 'Mariana Souza (Assistente)';
      approverCargo = 'Assistente Administrativo';
      approverCargoId = 'cargo-ast-01';
    } else if (simulatedRole === 'master') {
      approverId = 'usr-001';
      approverName = currentUser.name || 'Fabrício Oliveira (Master Admin)';
      approverCargo = 'Administrador Master';
      approverCargoId = 'cargo-adm-01';
    }

    try {
      const res = await aprovarSolicitacao(sol.id, {
        aprovador_id: approverId,
        aprovador_nome: approverName,
        aprovador_cargo: approverCargo,
        aprovador_cargo_id: approverCargoId,
      });

      if (res.success) {
        onShowToast({
          id: Date.now().toString(),
          type: 'success',
          title: `Solicitação #${sol.codigo_sequencial} Aprovada!`,
          message: `As alterações no registro "${sol.registro_identificador}" foram aplicadas no banco de dados.`,
        });
        loadData();
      }
    } catch (err: any) {
      onShowToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Ação Não Permitida',
        message: err.message || 'Erro ao processar aprovação.',
      });
    }
  };

  const handleConfirmRecusa = async (motivo: string) => {
    if (!selectedForRecusa) return;

    let approverId = 'usr-enc-01';
    let approverName = 'Carlos Eduardo (Encarregado Geral)';
    let approverCargo = 'Encarregado Geral';
    let approverCargoId = 'cargo-enc-01';

    if (simulatedRole === 'assistente') {
      approverId = 'usr-ast-01';
      approverName = 'Mariana Souza (Assistente)';
      approverCargo = 'Assistente Administrativo';
      approverCargoId = 'cargo-ast-01';
    } else if (simulatedRole === 'master') {
      approverId = 'usr-001';
      approverName = currentUser.name || 'Fabrício Oliveira (Master Admin)';
      approverCargo = 'Administrador Master';
      approverCargoId = 'cargo-adm-01';
    }

    const res = await recusarSolicitacao(selectedForRecusa.id, {
      aprovador_id: approverId,
      aprovador_nome: approverName,
      aprovador_cargo: approverCargo,
      aprovador_cargo_id: approverCargoId,
      motivo_recusa: motivo,
    });

    if (res.success) {
      onShowToast({
        id: Date.now().toString(),
        type: 'info',
        title: `Solicitação #${selectedForRecusa.codigo_sequencial} Recusada`,
        message: 'O registro original foi mantido inalterado e o motivo registrado na auditoria.',
      });
      loadData();
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
                  Central de Solicitações & Aprovações
                </h1>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                  {stats.pendente} Pendente{stats.pendente === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-sm text-[#687582] mt-1">
                Gerencie solicitações de alteração enviadas por colaboradores que não possuem permissão de edição direta.
                Aprove para atualizar os registros oficiais ou recuse justificando o motivo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToPermissoes && (
              <button
                onClick={onNavigateToPermissoes}
                className="px-4 py-2 bg-[#F4F6F8] hover:bg-[#E8ECF0] text-[#17212B] rounded-xl text-xs font-bold border border-[#DDE3E8] transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-[#176B87]" />
                <span>Configurar Cargos & Regras</span>
              </button>
            )}

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

      {/* Simulator Switcher Banner: Test approval as different personas */}
      <div className="bg-gradient-to-r from-[#F0F7FA] to-[#F8FAFB] rounded-2xl border border-[#C6E3EB] p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#176B87] text-white flex items-center justify-center font-bold text-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#17212B] flex items-center space-x-1.5">
                <span>Simulador de Perfil Operacional:</span>
                <span className="text-[10px] font-semibold text-[#687582]">(Teste o fluxo com diferentes papéis)</span>
              </span>
              <p className="text-xs text-[#556370]">
                Alterne abaixo para testar as validações de backend em tempo real:
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSimulatedRole('encarregado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                simulatedRole === 'encarregado'
                  ? 'bg-[#159A72] text-white border-[#159A72] shadow-2xs'
                  : 'bg-white text-[#556370] border-[#CCD6DD] hover:bg-[#F4F6F8]'
              }`}
            >
              🛡️ Encarregado (Aprovador)
            </button>

            <button
              onClick={() => setSimulatedRole('assistente')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                simulatedRole === 'assistente'
                  ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-2xs'
                  : 'bg-white text-[#556370] border-[#CCD6DD] hover:bg-[#F4F6F8]'
              }`}
            >
              📝 Assistente (Solicitante)
            </button>

            <button
              onClick={() => setSimulatedRole('master')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                simulatedRole === 'master'
                  ? 'bg-[#176B87] text-white border-[#176B87] shadow-2xs'
                  : 'bg-white text-[#556370] border-[#CCD6DD] hover:bg-[#F4F6F8]'
              }`}
            >
              👑 Master Admin
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-[#DDE3E8] p-4 shadow-xs space-y-4">
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

          {/* Search & Module Dropdown */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, id ou campo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#CCD6DD] focus:outline-none focus:ring-2 focus:ring-[#176B87]"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={moduloFilter}
                onChange={(e) => setModuloFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-xl border border-[#CCD6DD] focus:outline-none focus:ring-2 focus:ring-[#176B87] bg-white cursor-pointer"
              >
                <option value="all">Todos os Módulos</option>
                <option value="efetivo">Efetivo & Admissões</option>
                <option value="obras">Obras</option>
                <option value="rh">Recursos Humanos</option>
                <option value="documentos">Documentação</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* List of Change Requests */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#DDE3E8] p-12 text-center text-[#687582] space-y-3">
            <div className="w-8 h-8 border-2 border-[#176B87] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold">Carregando solicitações de alteração...</p>
          </div>
        ) : solicitacoes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#DDE3E8] p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#F4F6F8] text-[#8995A1] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#17212B]">Nenhuma solicitação encontrada</h3>
            <p className="text-xs text-[#687582] max-w-md mx-auto">
              Não há registros com os filtros selecionados. Quando um usuário sem permissão de edição direta alterar um
              dado, a solicitação aparecerá aqui para aprovação.
            </p>
          </div>
        ) : (
          solicitacoes.map((sol) => {
            const isPendente = sol.status === 'pendente';
            const isAprovada = sol.status === 'aprovada';
            const isRecusada = sol.status === 'recusada';

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
                  {/* Requester Info */}
                  <div className="lg:col-span-4 space-y-1 text-xs text-[#556370]">
                    <p>
                      <strong className="text-[#17212B]">Solicitado por:</strong> {sol.solicitante_nome}
                    </p>
                    <p>
                      <strong className="text-[#17212B]">Cargo do Solicitante:</strong>{' '}
                      <span className="px-1.5 py-0.5 rounded bg-[#F4F6F8] font-semibold text-[#176B87]">
                        {sol.solicitante_cargo}
                      </span>
                    </p>
                    <p className="text-[11px] text-[#8995A1]">
                      {new Date(sol.data_solicitacao).toLocaleString('pt-BR')}
                    </p>
                  </div>

                  {/* Diff Box */}
                  <div className="lg:col-span-8 bg-[#F8FAFB] rounded-xl border border-[#E1E8ED] p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#17212B] flex items-center space-x-1.5">
                        <span className="text-[#687582]">Alteração no Campo:</span>
                        <span className="text-[#2563EB] underline decoration-dotted">{sol.campo}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-white rounded-lg border border-[#DDE3E8]">
                        <span className="text-[10px] font-bold uppercase text-[#8995A1] block">Valor Anterior</span>
                        <span className="font-medium text-[#D64550] mt-0.5 block break-words">
                          {sol.valor_atual || '(Não preenchido)'}
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

                {/* Approver Resolution Notes (if completed) */}
                {!isPendente && (
                  <div className="p-3 bg-[#F8FAFB] rounded-xl border border-[#E1E8ED] text-xs text-[#556370] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <strong className="text-[#17212B]">
                        {isAprovada ? 'Aprovado por:' : 'Recusado por:'}
                      </strong>{' '}
                      {sol.aprovador_nome} ({sol.aprovador_cargo}) •{' '}
                      <span className="text-[#8995A1]">
                        {sol.data_aprovacao ? new Date(sol.data_aprovacao).toLocaleString('pt-BR') : ''}
                      </span>
                      {sol.motivo_recusa && (
                        <p className="text-[#D64550] mt-0.5">
                          <strong>Motivo:</strong> "{sol.motivo_recusa}"
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    onClick={() => setSelectedForDetails(sol.id)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] rounded-lg transition-colors cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Ver Auditoria Completa</span>
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
                        <span>Aprovar Alteração</span>
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
