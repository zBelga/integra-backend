import React, { useState, useEffect } from 'react';
import { X, Briefcase, Plus, Search, Edit3, Power, Trash2, Building2, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { Empresa, CargoEmpresa } from '../../types';
import { getCompanyTheme } from '../../utils/theme';
import { fetchCargos, toggleCargoStatus, deleteCargo } from '../../services/api';
import { CargoFormModal } from './CargoFormModal';

interface GerenciarCargosModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa: Empresa | null;
  onCargosUpdated?: () => void;
}

export const GerenciarCargosModal: React.FC<GerenciarCargosModalProps> = ({
  isOpen,
  onClose,
  empresa,
  onCargosUpdated,
}) => {
  const [cargos, setCargos] = useState<CargoEmpresa[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sub-modal for creating / editing cargo
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [cargoToEdit, setCargoToEdit] = useState<CargoEmpresa | null>(null);

  const companyColor = empresa?.corPrimaria || '#176B87';
  const theme = getCompanyTheme(companyColor);

  const loadCargos = async () => {
    if (!empresa) return;
    try {
      setIsLoading(true);
      const res = await fetchCargos(empresa.id);
      if (res.success) {
        setCargos(res.data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar cargos da empresa.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && empresa) {
      loadCargos();
      setErrorMessage('');
      setSuccessMessage('');
      setSearch('');
    }
  }, [isOpen, empresa]);

  if (!isOpen || !empresa) return null;

  const handleOpenCreate = () => {
    setCargoToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (cargo: CargoEmpresa) => {
    setCargoToEdit(cargo);
    setIsFormModalOpen(true);
  };

  const handleCargoSaved = (savedCargo: CargoEmpresa) => {
    setSuccessMessage(`Cargo "${savedCargo.nome}" salvo com sucesso!`);
    loadCargos();
    onCargosUpdated?.();
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleToggleStatus = async (cargo: CargoEmpresa) => {
    const nextStatus = cargo.status === 'ativo' ? 'inativo' : 'ativo';
    try {
      setErrorMessage('');
      await toggleCargoStatus(cargo.id, nextStatus);
      setCargos((prev) =>
        prev.map((c) => (c.id === cargo.id ? { ...c, status: nextStatus } : c))
      );
      setSuccessMessage(`Cargo "${cargo.nome}" marcado como ${nextStatus}.`);
      onCargosUpdated?.();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao alterar status do cargo.');
    }
  };

  const handleDelete = async (cargo: CargoEmpresa) => {
    if (!window.confirm(`Deseja realmente excluir o cargo "${cargo.nome}" da empresa ${empresa.nome}?`)) {
      return;
    }
    try {
      setErrorMessage('');
      const res = await deleteCargo(cargo.id);
      if (res.success) {
        setSuccessMessage(`Cargo "${cargo.nome}" excluído com sucesso.`);
        loadCargos();
        onCargosUpdated?.();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao excluir cargo.');
    }
  };

  const filteredCargos = cargos.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.nome.toLowerCase().includes(q) || (c.descricao && c.descricao.toLowerCase().includes(q));
  });

  const totalAtivos = cargos.filter((c) => c.status === 'ativo').length;
  const totalInativos = cargos.filter((c) => c.status === 'inativo').length;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17212B]/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white border border-[#DDE3E8] rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col text-[#17212B]">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#DDE3E8]">
            <div className="flex items-center space-x-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-2xs"
                style={{ backgroundColor: companyColor }}
              >
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-[#17212B]">
                    Cargos & Funções da Empresa
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F8FAFB] text-[#17212B] border border-[#DDE3E8]">
                    Isolamento por Empresa
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-[#687582]">
                  <Building2 className="w-3.5 h-3.5 text-[#176B87]" />
                  <span>Empresa: <strong className="text-[#17212B]">{empresa.nome}</strong> ({empresa.razaoSocial})</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#687582] hover:text-[#17212B] p-2 rounded-xl hover:bg-[#F4F6F8] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3 bg-[#FDEBEC] border border-[#F8B4B9] rounded-2xl flex items-center space-x-2.5 text-xs text-[#D64550] animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-[#E8F6F1] border border-[#B8E8D9] rounded-2xl flex items-center space-x-2.5 text-xs text-[#159A72] animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Action Bar & Stats */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cargos desta empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all"
              />
            </div>

            {/* Quick counters & New cargo button */}
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-1.5 text-xs text-[#687582] px-2.5 py-1.5 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl font-medium">
                <span>Total: <strong className="text-[#17212B]">{cargos.length}</strong></span>
                <span>•</span>
                <span className="text-[#159A72] font-semibold">{totalAtivos} ativos</span>
                {totalInativos > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-[#687582]">{totalInativos} inativos</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: companyColor }}
              >
                <Plus className="w-4 h-4" />
                <span>Novo Cargo</span>
              </button>
            </div>

          </div>

          {/* Explanatory concept banner */}
          <div className="p-3 bg-[#F0F7F9] border border-[#CDE5EC] rounded-2xl flex items-start space-x-2.5 text-xs text-[#176B87]">
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#176B87]" />
            <p className="leading-relaxed">
              <strong>Isolamento Multi-Tenant:</strong> Os cargos cadastrados aqui pertencem exclusivamente à <strong>{empresa.nome}</strong> e ficarão disponíveis para seleção na criação e edição de usuários vinculados a esta empresa.
            </p>
          </div>

          {/* Cargos List Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar border border-[#DDE3E8] rounded-2xl divide-y divide-[#EAEFF3]">
            {isLoading ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-6 h-6 border-2 border-[#176B87] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-[#687582]">Carregando cargos da empresa...</p>
              </div>
            ) : filteredCargos.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F4F6F8] text-[#8995A1] flex items-center justify-center">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-[#17212B]">Nenhum cargo encontrado</h4>
                <p className="text-xs text-[#687582] max-w-sm mx-auto">
                  {search
                    ? 'Nenhum cargo corresponde ao filtro de busca pesquisado.'
                    : `Esta empresa ainda não possui cargos cadastrados. Clique em "+ Novo Cargo" para adicionar.`}
                </p>
                {!search && (
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="px-4 py-2 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all inline-flex items-center space-x-1.5 cursor-pointer mt-2"
                    style={{ backgroundColor: companyColor }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Criar Primeiro Cargo</span>
                  </button>
                )}
              </div>
            ) : (
              filteredCargos.map((cargo) => (
                <div
                  key={cargo.id}
                  className="p-3.5 hover:bg-[#F8FAFB] transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-[#17212B] truncate">
                        {cargo.nome}
                      </span>
                      {cargo.status === 'ativo' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F6F1] text-[#159A72] border border-[#B8E8D9]">
                          Ativo
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F4F6F8] text-[#8995A1] border border-[#DDE3E8]">
                          Inativo
                        </span>
                      )}
                    </div>
                    {cargo.descricao ? (
                      <p className="text-xs text-[#687582] truncate">
                        {cargo.descricao}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#A2ACB5] italic">
                        Sem descrição informada
                      </p>
                    )}
                  </div>

                  {/* Actions for this cargo */}
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {/* Toggle status */}
                    <button
                      type="button"
                      title={cargo.status === 'ativo' ? 'Desativar Cargo' : 'Ativar Cargo'}
                      onClick={() => handleToggleStatus(cargo)}
                      className={`p-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        cargo.status === 'ativo'
                          ? 'text-[#687582] hover:text-[#D64550] hover:bg-[#FDEBEC]'
                          : 'text-[#159A72] hover:bg-[#E8F6F1]'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    {/* Edit cargo */}
                    <button
                      type="button"
                      title="Editar Cargo"
                      onClick={() => handleOpenEdit(cargo)}
                      className="p-2 rounded-xl text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete cargo */}
                    <button
                      type="button"
                      title="Excluir Cargo"
                      onClick={() => handleDelete(cargo)}
                      className="p-2 rounded-xl text-[#687582] hover:text-[#D64550] hover:bg-[#FDEBEC] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[#DDE3E8]">
            <span className="text-xs text-[#687582]">
              Mostrando <strong>{filteredCargos.length}</strong> de <strong>{cargos.length}</strong> cargos cadastrados
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-[#17212B] bg-[#F4F6F8] hover:bg-[#EAEFF3] rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>

        </div>
      </div>

      {/* Submodal for creating / editing cargo */}
      <CargoFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleCargoSaved}
        empresa={empresa}
        cargoToEdit={cargoToEdit}
      />
    </>
  );
};
