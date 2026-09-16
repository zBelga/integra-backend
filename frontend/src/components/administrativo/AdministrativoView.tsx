import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Search, Building, X, Download, Upload, Loader2, Send, ShieldCheck, Users } from 'lucide-react';
import { ActiveView, Admissao, AdmissaoFilterState, AdmissaoFormData, Empresa, Obra, PaginationMeta } from '../../types';
import { fetchAdmissoes, createAdmissao, updateAdmissao, deleteAdmissao, fetchObras, createObra, updateObra, deleteObra, fetchSolicitacoesStats, contratarAdmissao } from '../../services/api';
import { useDebounce } from '../../utils/debounce';
import { AdmissaoTable } from './AdmissaoTable';
import { ContrataModal } from './ContrataModal';
import { AdmissaoFormModal } from './AdmissaoFormModal';
import { ObrasModal } from './ObrasModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ImportExcelModal } from './ImportExcelModal';
import { Pagination } from '../ui/Pagination';
import { ToastMessage } from '../ui/Toast';
import { exportAdmissoesToExcel } from '../../utils/excelUtils';
import { getCompanyTheme } from '../../utils/theme';

interface AdministrativoViewProps {
  onShowToast: (toast: ToastMessage) => void;
  selectedEmpresa?: Empresa | null;
  onNavigate?: (view: ActiveView) => void;
}

export const AdministrativoView: React.FC<AdministrativoViewProps> = ({ 
  onShowToast,
  selectedEmpresa,
  onNavigate,
}) => {
  const companyColor = selectedEmpresa?.corPrimaria || '#176B87';
  const theme = getCompanyTheme(companyColor);

  // Active simulated role inside the module
  const [activeRole, setActiveRole] = useState<'encarregado' | 'assistente' | 'master'>('encarregado');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Data states
  const [admissoes, setAdmissoes] = useState<Admissao[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state (default limit = 25 per requirements)
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
  });

  // Filter state
  const [filters, setFilters] = useState<AdmissaoFilterState>({
    search: '',
    obra_id: '',
    funcao: '',
    data_inicio: '',
    data_fim: '',
  });

  // Debounced search for smooth performance without hitting server on every keystroke
  const debouncedSearch = useDebounce(filters.search, 300);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAdmissao, setEditingAdmissao] = useState<Admissao | null>(null);

  const [isObrasModalOpen, setIsObrasModalOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Admissao | null>(null);
  const [contratarAdm, setContratarAdm] = useState<Admissao | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Excel Import / Export states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load Obras list
  const loadObras = useCallback(async () => {
    try {
      const res = await fetchObras();
      if (res.success) {
        setObras(res.data);
      }
    } catch (err: any) {
      onShowToast({
        id: Date.now().toString(),
        type: 'error',
        message: err.message || 'Erro ao carregar lista de obras.',
      });
    }
  }, [onShowToast]);

  // Load Admissoes with pagination and filters
  const loadAdmissoes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAdmissoes({
        page: meta.page,
        limit: meta.limit,
        search: debouncedSearch,
        obra: filters.obra_id,
        funcao: filters.funcao,
        data_inicio: filters.data_inicio,
        data_fim: filters.data_fim,
      });

      if (res.success) {
        setAdmissoes(res.data);
        setMeta(res.pagination);
      }
    } catch (err: any) {
      onShowToast({
        id: Date.now().toString(),
        type: 'error',
        message: err.message || 'Erro ao carregar admissões.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [meta.page, meta.limit, debouncedSearch, filters.obra_id, filters.funcao, filters.data_inicio, filters.data_fim, onShowToast]);

  // Load pending requests count for badge
  const loadPendingStats = useCallback(async () => {
    try {
      const res = await fetchSolicitacoesStats(selectedEmpresa?.id);
      if (res.success) {
        setPendingRequestsCount(res.data.pendente);
      }
    } catch (e) {
      // Non-blocking
    }
  }, [selectedEmpresa?.id]);

  useEffect(() => {
    loadObras();
    loadPendingStats();
  }, [loadObras, loadPendingStats]);

  useEffect(() => {
    loadAdmissoes();
  }, [loadAdmissoes]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setMeta((prev) => ({ ...prev, page: newPage }));
  };

  // Handle limit change
  const handleLimitChange = (newLimit: number) => {
    setMeta((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  };

  // Reset all filters
  const handleClearFilters = () => {
    setFilters({
      search: '',
      obra_id: '',
      funcao: '',
      data_inicio: '',
      data_fim: '',
    });
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  // Save admission (create or update)
  const handleSaveAdmissao = async (data: AdmissaoFormData, id?: string) => {
    if (id) {
      await updateAdmissao(id, data);
      onShowToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Admissão Atualizada',
        message: `O cadastro de ${data.nome} foi atualizado com sucesso.`,
      });
    } else {
      await createAdmissao(data);
      onShowToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Admissão Cadastrada',
        message: `Novo colaborador ${data.nome} cadastrado com sucesso.`,
      });
    }
    await loadAdmissoes();
  };

  // Confirm delete admission
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAdmissao(deleteTarget.id);
      onShowToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Registro Excluído',
        message: `A admissão de ${deleteTarget.nome} foi removida com sucesso.`,
      });
      setDeleteTarget(null);
      await loadAdmissoes();
    } catch (err: any) {
      onShowToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erro ao excluir',
        message: err.message || 'Não foi possível excluir o registro.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Obra handlers

  const handleContratar = async (admissaoId: string, data: { rg: string; numero_chapa: string; data_admissao: string }) => {
    await contratarAdmissao(admissaoId, data);
    setContratarAdm(null);
    await loadAdmissoes();
  };

  const handleCreateObra = async (data: { nome: string; codigo: string }) => {
    const { nome, codigo } = data;
    await createObra({ nome, codigo });
    onShowToast({
      id: Date.now().toString(),
      type: 'success',
      title: 'Obra Cadastrada',
      message: `A obra "${nome}" foi cadastrada com sucesso.`,
    });
    await loadObras();
  };

  const handleUpdateObra = async (id: string, data: { nome: string; codigo: string }) => {
    const { nome, codigo } = data;
    await updateObra(id, { nome, codigo });
    onShowToast({
      id: Date.now().toString(),
      type: 'success',
      title: 'Obra Atualizada',
      message: `Os dados da obra "${nome}" foram atualizados.`,
    });
    await loadObras();
    await loadAdmissoes();
  };

  const handleDeleteObra = async (id: string) => {
    await deleteObra(id);
    onShowToast({
      id: Date.now().toString(),
      type: 'info',
      title: 'Obra Excluída',
      message: 'A obra foi removida do sistema.',
    });
    await loadObras();
    await loadAdmissoes();
  };

  // Export to Excel handler
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      // Fetch all matching records without pagination limit for export
      const res = await fetchAdmissoes({
        page: 1,
        limit: 1000,
        search: debouncedSearch,
        obra: filters.obra_id,
        funcao: filters.funcao,
        data_inicio: filters.data_inicio,
        data_fim: filters.data_fim,
      });

      const recordsToExport = res.success ? res.data : admissoes;
      exportAdmissoesToExcel(recordsToExport);

      onShowToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Planilha Exportada',
        message: `Planilha com ${recordsToExport.length} registro(s) gerada com sucesso.`,
      });
    } catch (err: any) {
      onShowToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erro na exportação',
        message: 'Não foi possível gerar o arquivo Excel.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Import from Excel handler
  const handleImportBatch = async (
    items: Omit<AdmissaoFormData, 'obra_id'>[],
    obraId: string,
    onProgress: (current: number, total: number) => void
  ) => {
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        await createAdmissao({
          ...item,
          obra_id: obraId,
        });
        successCount++;
      } catch (e) {
        errorCount++;
      }
      onProgress(i + 1, items.length);
    }

    onShowToast({
      id: Date.now().toString(),
      type: successCount > 0 ? 'success' : 'error',
      title: 'Importação Concluída',
      message: `${successCount} admissão(ões) importada(s) com sucesso.${errorCount > 0 ? ` (${errorCount} registro(s) com erro)` : ''}`,
    });

    await loadObras();
    await loadAdmissoes();
  };

  const hasActiveFilters =
    filters.search || filters.obra_id || filters.funcao || filters.data_inicio || filters.data_fim;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DDE3E8] pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#17212B] tracking-tight">MÓDULO ADMINISTRATIVO</h1>
            <span 
              className="px-2 py-0.5 text-[10px] font-bold rounded border"
              style={{
                backgroundColor: theme.bgLight,
                borderColor: theme.borderLight,
                color: companyColor,
              }}
            >
              {selectedEmpresa ? selectedEmpresa.nome : 'RH & Obras'}
            </span>
          </div>
          <p className="text-xs text-[#687582] mt-0.5">
            Gestão simplificada de contratações, admissões prévias, efetivo e atribuição de obras.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Link to Solicitacoes */}
          {onNavigate && (
            <button
              onClick={() => onNavigate('solicitacoes')}
              className="px-3.5 py-2 border border-[#C6E3EB] bg-[#E8F3F6] hover:bg-[#D5EBF1] rounded-xl text-xs font-bold text-[#176B87] transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <Send className="w-4 h-4 text-[#176B87]" />
              <span>Solicitações</span>
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-extrabold bg-[#D97706] text-white rounded-full">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          )}

          {/* Link to Permissoes */}
          {onNavigate && (
            <button
              onClick={() => onNavigate('permissoes')}
              className="px-3.5 py-2 border border-[#DDE3E8] bg-white hover:bg-[#F8FAFB] rounded-xl text-xs font-semibold text-[#17212B] transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#176B87]" />
              <span>Permissões</span>
            </button>
          )}

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="px-3 py-2 border border-[#DDE3E8] rounded-xl text-xs font-semibold text-[#17212B] bg-white hover:bg-[#F8FAFB] transition-colors flex items-center space-x-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Exportar registros filtrados para planilha Excel (.xlsx)"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: companyColor }} />
            ) : (
              <Download className="w-4 h-4 text-[#687582]" />
            )}
            <span>Exportar Excel</span>
          </button>

          {/* Import from Excel */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 border border-[#DDE3E8] rounded-xl text-xs font-semibold text-[#17212B] bg-white hover:bg-[#F8FAFB] transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            title="Importar lista de admissões via planilha Excel"
          >
            <Upload className="w-4 h-4 text-[#687582]" />
            <span>Importar Planilha</span>
          </button>

          {/* Gerenciar Obras */}
          <button
            onClick={() => setIsObrasModalOpen(true)}
            className="px-3.5 py-2 border border-[#DDE3E8] rounded-xl text-xs font-semibold text-[#17212B] bg-white hover:bg-[#F8FAFB] transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
          >
            <Building className="w-4 h-4" style={{ color: companyColor }} />
            <span>Gerenciar Obras</span>
          </button>

          {/* Nova Admissão (Styled in company's custom color) */}
          <button
            onClick={() => {
              setEditingAdmissao(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2 text-white rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer hover:opacity-90"
            style={{
              backgroundColor: companyColor,
              boxShadow: theme.shadowLight,
            }}
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Nova admissão</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Filters & Search Panel */}
        <div className="bg-white border border-[#DDE3E8] rounded-2xl p-4 space-y-4 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input (Debounced) */}
            <div className="lg:col-span-2 relative">
              <label className="block text-[11px] font-semibold text-[#687582] mb-1">
                Pesquisar por nome ou CPF
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#8995A1] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Digite o nome completo ou número do CPF..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value });
                    setMeta((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full pl-9 pr-3 py-2 border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] placeholder-[#8995A1] focus:outline-none focus:ring-2 bg-[#F8FAFB]"
                  style={{
                    outlineColor: companyColor,
                  }}
                />
              </div>
            </div>

            {/* Filter: Obra */}
            <div>
              <label className="block text-[11px] font-semibold text-[#687582] mb-1">
                Obra
              </label>
              <select
                value={filters.obra_id}
                onChange={(e) => {
                  setFilters({ ...filters, obra_id: e.target.value });
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full px-3 py-2 border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] focus:outline-none focus:ring-2 bg-[#F8FAFB]"
              >
                <option value="">Todas as obras</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Função */}
            <div>
              <label className="block text-[11px] font-semibold text-[#687582] mb-1">
                Função
              </label>
              <input
                type="text"
                placeholder="Filtrar por função..."
                value={filters.funcao}
                onChange={(e) => {
                  setFilters({ ...filters, funcao: e.target.value });
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full px-3 py-2 border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] placeholder-[#8995A1] focus:outline-none focus:ring-2 bg-[#F8FAFB]"
              />
            </div>

            {/* Filter: Previsão Contratação Date Range */}
            <div>
              <label className="block text-[11px] font-semibold text-[#687582] mb-1">
                Previsão de contratação
              </label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="date"
                  title="Data inicial"
                  value={filters.data_inicio}
                  onChange={(e) => {
                    setFilters({ ...filters, data_inicio: e.target.value });
                    setMeta((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full px-2 py-1.5 border border-[#DDE3E8] rounded-lg text-[11px] text-[#17212B] bg-[#F8FAFB]"
                />
                <input
                  type="date"
                  title="Data final"
                  value={filters.data_fim}
                  onChange={(e) => {
                    setFilters({ ...filters, data_fim: e.target.value });
                    setMeta((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full px-2 py-1.5 border border-[#DDE3E8] rounded-lg text-[11px] text-[#17212B] bg-[#F8FAFB]"
                />
              </div>
            </div>
          </div>

          {/* Clear filters bar */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-[#DDE3E8] flex items-center justify-between text-xs">
              <span className="text-[#687582] font-medium">Filtros ativos aplicados na busca.</span>
              <button
                onClick={handleClearFilters}
                className="text-[#D64550] hover:text-[#b5303b] font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar todos os filtros</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Table Container */}
        <div className="bg-white border border-[#DDE3E8] rounded-2xl overflow-hidden shadow-xs">
          <AdmissaoTable
            admissoes={admissoes}
            isLoading={isLoading}
            onEdit={(adm) => {
              setEditingAdmissao(adm);
              setIsFormOpen(true);
            }}
            onContratar={(adm) => setContratarAdm(adm)}
          onDelete={(adm) => {
              setDeleteTarget(adm);
            }}
          />

          <Pagination
            meta={meta}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Modals */}
      <AdmissaoFormModal
        isOpen={isFormOpen}
        editingAdmissao={editingAdmissao}
        obras={obras}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveAdmissao}
        empresaId={selectedEmpresa?.id || 'emp-001'}
        currentUserCargo={
          activeRole === 'encarregado'
            ? 'Encarregado Geral'
            : activeRole === 'assistente'
            ? 'Assistente Administrativo'
            : 'Administrador Master'
        }
        canDirectEdit={activeRole !== 'assistente'}
        canRequestChange={true}
        onSolicitacaoCreated={(solicitacaoId, seqCode) => {
          onShowToast({
            id: Date.now().toString(),
            type: 'info',
            title: `Solicitação #${seqCode} Enviada!`,
            message: `Como seu cargo atual (${
              activeRole === 'assistente' ? 'Assistente' : 'Colaborador'
            }) exige aprovação, as alterações foram registradas e aguardam parecer do Encarregado.`,
          });
          loadPendingStats();
        }}
      />

      <ObrasModal
        isOpen={isObrasModalOpen}
        obras={obras}
        onClose={() => setIsObrasModalOpen(false)}
        onCreateObra={handleCreateObra}
        onUpdateObra={handleUpdateObra}
        onDeleteObra={handleDeleteObra}
      />

      {contratarAdm && (
        <ContrataModal
          admissao={contratarAdm}
          onConfirm={handleContratar}
          onClose={() => setContratarAdm(null)}
        />
      )}

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        admissao={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        obras={obras}
        onImportSuccess={handleImportBatch}
      />
    </div>
  );
};
