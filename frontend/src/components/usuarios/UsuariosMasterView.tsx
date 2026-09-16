import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Building2,
  Filter,
  ShieldCheck,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Briefcase,
  Layers,
  Crown,
  KeyRound,
  ArrowUpDown,
  Lock,
  User,
  X,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { Empresa, UsuarioSistema, UsuarioFormData, ActiveView, CargoEmpresa } from '../../types';
import { ToastMessage } from '../ui/Toast';
import { getCompanyTheme } from '../../utils/theme';
import { fetchUsuarios, createUsuario, updateUsuario, toggleUsuarioStatus, deleteUsuario, fetchCargos } from '../../services/api';
import { UsuarioFormModal } from './UsuarioFormModal';
import { DeleteUsuarioModal } from './DeleteUsuarioModal';
import { GerenciarCargosModal } from './GerenciarCargosModal';

interface UsuariosMasterViewProps {
  empresas: Empresa[];
  selectedEmpresa?: Empresa | null;
  currentUser: { email: string; name: string; role: string };
  onShowToast: (toast: ToastMessage) => void;
  onSelectEmpresa?: (empresa: Empresa) => void;
  onNavigate?: (view: ActiveView) => void;
}

const MASTER_EMAIL = 'fabriciooliveira2431@gmail.com';

export const UsuariosMasterView: React.FC<UsuariosMasterViewProps> = ({
  empresas,
  selectedEmpresa,
  currentUser,
  onShowToast,
  onSelectEmpresa,
  onNavigate,
}) => {
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filtering States
  const [filterEmpresaId, setFilterEmpresaId] = useState<string>(() => {
    return selectedEmpresa?.id || empresas[0]?.id || '';
  });
  const [filterCargo, setFilterCargo] = useState<string>('all');
  const [filterUsuarioId, setFilterUsuarioId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPerfil, setFilterPerfil] = useState<string>('all');

  // Company specific cargos list
  const [companyCargos, setCompanyCargos] = useState<CargoEmpresa[]>([]);
  const [isLoadingCargos, setIsLoadingCargos] = useState(false);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [usuarioToEdit, setUsuarioToEdit] = useState<UsuarioSistema | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<UsuarioSistema | null>(null);
  const [isGerenciarCargosOpen, setIsGerenciarCargosOpen] = useState(false);

  // Active selected empresa object
  const activeEmpresa = useMemo(() => {
    if (!filterEmpresaId || filterEmpresaId === 'all') return null;
    return empresas.find((e) => e.id === filterEmpresaId) || null;
  }, [empresas, filterEmpresaId]);

  // Master console primary color
  const companyColor = activeEmpresa?.corPrimaria || '#176B87';
  const theme = getCompanyTheme(companyColor);

  const isMasterAdmin = currentUser.email.toLowerCase() === MASTER_EMAIL.toLowerCase();

  // Load Cargos for the currently filtered company
  const loadCargos = async (empresaId: string) => {
    if (!empresaId || empresaId === 'all') {
      setCompanyCargos([]);
      return;
    }
    try {
      setIsLoadingCargos(true);
      const res = await fetchCargos(empresaId);
      if (res.success) {
        setCompanyCargos(res.data);
      }
    } catch (err) {
      console.error('Erro ao carregar cargos da empresa:', err);
    } finally {
      setIsLoadingCargos(false);
    }
  };

  useEffect(() => {
    if (filterEmpresaId && filterEmpresaId !== 'all') {
      loadCargos(filterEmpresaId);
    } else {
      setCompanyCargos([]);
    }
  }, [filterEmpresaId]);

  const loadUsuarios = async () => {
    try {
      setIsLoading(true);
      const res = await fetchUsuarios({
        search: search || undefined,
        empresa_id: filterEmpresaId && filterEmpresaId !== 'all' ? filterEmpresaId : undefined,
        cargo: filterCargo !== 'all' ? filterCargo : undefined,
        usuario_id: filterUsuarioId !== 'all' ? filterUsuarioId : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        perfil: filterPerfil !== 'all' ? filterPerfil : undefined,
      });
      if (res.success) {
        setUsuarios(res.data);
      }
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
      onShowToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erro ao Carregar',
        message: err.message || 'Falha ao buscar usuários do sistema.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsuarios();
  }, [filterEmpresaId, filterCargo, filterUsuarioId, filterStatus, filterPerfil]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsuarios();
  };

  // Base list of users for the selected company to populate dropdowns and quick counts
  const companyBaseUsers = useMemo(() => {
    if (!filterEmpresaId || filterEmpresaId === 'all') return usuarios;
    return usuarios.filter((u) => u.empresa_id === filterEmpresaId);
  }, [usuarios, filterEmpresaId]);

  // Unique cargos with count of users for the interactive chips & dropdown
  const uniqueCargosWithCounts = useMemo(() => {
    const countsMap = new Map<string, { nome: string; count: number; cargo_id?: string }>();

    // First populate from registered company cargos
    companyCargos.forEach((c) => {
      countsMap.set(c.nome.toLowerCase(), {
        nome: c.nome,
        count: 0,
        cargo_id: c.id,
      });
    });

    // Count users in each cargo
    companyBaseUsers.forEach((u) => {
      const cargoName = (u.cargo || 'Não especificado').trim();
      const key = cargoName.toLowerCase();
      const existing = countsMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        countsMap.set(key, {
          nome: cargoName,
          count: 1,
          cargo_id: u.cargo_id,
        });
      }
    });

    return Array.from(countsMap.values()).sort((a, b) => b.count - a.count || a.nome.localeCompare(b.nome));
  }, [companyCargos, companyBaseUsers]);

  // Filtered in memory for smooth typing search & instant reactions
  const displayedUsuarios = useMemo(() => {
    return usuarios.filter((u) => {
      // Must match active empresa
      if (filterEmpresaId && filterEmpresaId !== 'all' && u.empresa_id !== filterEmpresaId) {
        return false;
      }
      // Filter by Cargo
      if (filterCargo !== 'all') {
        const matchesCargoId = u.cargo_id && u.cargo_id === filterCargo;
        const matchesCargoNome = u.cargo && u.cargo.toLowerCase() === filterCargo.toLowerCase();
        if (!matchesCargoId && !matchesCargoNome) {
          return false;
        }
      }
      // Filter by specific User
      if (filterUsuarioId !== 'all' && u.id !== filterUsuarioId) {
        return false;
      }
      // Filter by Status
      if (filterStatus !== 'all' && u.status !== filterStatus) {
        return false;
      }
      // Filter by Perfil
      if (filterPerfil !== 'all' && u.perfil !== filterPerfil) {
        return false;
      }
      // Search text
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = u.nome.toLowerCase().includes(query);
        const matchesEmail = u.email.toLowerCase().includes(query);
        const matchesCargo = u.cargo.toLowerCase().includes(query);
        const matchesDepto = u.departamento ? u.departamento.toLowerCase().includes(query) : false;
        const matchesPhone = u.telefone ? u.telefone.toLowerCase().includes(query) : false;
        if (!matchesName && !matchesEmail && !matchesCargo && !matchesDepto && !matchesPhone) {
          return false;
        }
      }
      return true;
    });
  }, [usuarios, search, filterEmpresaId, filterCargo, filterUsuarioId, filterStatus, filterPerfil]);

  // Statistics specific to the filtered list
  const stats = useMemo(() => {
    const total = displayedUsuarios.length;
    const ativos = displayedUsuarios.filter((u) => u.status === 'ativo').length;
    const inativos = displayedUsuarios.filter((u) => u.status === 'inativo').length;

    return { total, ativos, inativos };
  }, [displayedUsuarios]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterCargo !== 'all') count++;
    if (filterUsuarioId !== 'all') count++;
    if (filterStatus !== 'all') count++;
    if (filterPerfil !== 'all') count++;
    if (search.trim()) count++;
    return count;
  }, [filterCargo, filterUsuarioId, filterStatus, filterPerfil, search]);

  const handleClearAllFilters = () => {
    setFilterCargo('all');
    setFilterUsuarioId('all');
    setFilterStatus('all');
    setFilterPerfil('all');
    setSearch('');
  };

  const handleEmpresaSelection = (empresaId: string) => {
    setFilterEmpresaId(empresaId);
    // Reset subordinate filters
    setFilterCargo('all');
    setFilterUsuarioId('all');
  };

  const handleOpenCreate = () => {
    setUsuarioToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: UsuarioSistema) => {
    setUsuarioToEdit(user);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (user: UsuarioSistema) => {
    if (user.email.toLowerCase() === MASTER_EMAIL.toLowerCase()) {
      onShowToast({
        id: Date.now().toString(),
        type: 'warning',
        title: 'Operação Não Permitida',
        message: 'A conta Master de Fabrício Oliveira não pode ser excluída.',
      });
      return;
    }
    setUsuarioToDelete(user);
    setIsDeleteOpen(true);
  };

  const handleSaveUsuario = async (formData: UsuarioFormData, id?: string) => {
    if (id) {
      const res = await updateUsuario(id, formData);
      if (res.success) {
        onShowToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Usuário Atualizado',
          message: `Dados e vínculo de ${formData.nome} foram salvos com sucesso!`,
        });
        loadUsuarios();
      }
    } else {
      const res = await createUsuario(formData);
      if (res.success) {
        onShowToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Usuário Criado com Sucesso',
          message: `${formData.nome} foi cadastrado e vinculado à empresa selecionada!`,
        });
        loadUsuarios();
      }
    }
  };

  const handleToggleStatus = async (user: UsuarioSistema) => {
    if (user.email.toLowerCase() === MASTER_EMAIL.toLowerCase()) {
      onShowToast({
        id: Date.now().toString(),
        type: 'warning',
        title: 'Operação Não Permitida',
        message: 'O Administrador Master sempre permanece ativo.',
      });
      return;
    }

    const nextStatus = user.status === 'ativo' ? 'inativo' : 'ativo';
    try {
      await toggleUsuarioStatus(user.id, nextStatus);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      );
      onShowToast({
        id: Date.now().toString(),
        type: 'info',
        title: `Status Alterado`,
        message: `Usuário ${user.nome} agora está ${nextStatus}.`,
      });
    } catch (err: any) {
      onShowToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Erro',
        message: err.message || 'Falha ao alterar status.',
      });
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    const res = await deleteUsuario(id);
    if (res.success) {
      onShowToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Usuário Removido',
        message: 'O acesso do usuário foi excluído do sistema.',
      });
      loadUsuarios();
    }
  };

  if (!isMasterAdmin) {
    return (
      <div className="w-full max-w-5xl mx-auto p-6 sm:p-8">
        <div className="bg-white border border-[#F8B4B9] rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FDEBEC] text-[#D64550] flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-[#17212B]">Acesso Restrito ao Administrador Master</h2>
          <p className="text-xs text-[#687582] max-w-md mx-auto">
            Este módulo de provisionamento e vinculação de usuários é exclusivo do administrador geral Fabrício Oliveira (<span className="font-mono text-[#17212B]">fabriciooliveira2431@gmail.com</span>).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Master Top Hero Card */}
      <div className="bg-white border border-[#DDE3E8] rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div 
          className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full opacity-10 pointer-events-none"
          style={{ backgroundColor: '#176B87' }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="flex items-start space-x-4">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold shadow-xs flex-shrink-0 bg-[#176B87]"
            >
              <Crown className="w-7 h-7 text-amber-300" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-[#17212B] tracking-tight">
                  Gestão de Usuários por Empresa
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F6F1] text-[#159A72] border border-[#B8E8D9] flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>PAINEL MASTER</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#687582] max-w-3xl leading-relaxed">
                Selecione uma empresa para visualizar e gerenciar exclusivamente os colaboradores vinculados a ela.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            {activeEmpresa && (
              <button
                onClick={() => setIsGerenciarCargosOpen(true)}
                className="px-4 py-2.5 bg-[#F8FAFB] hover:bg-[#E8F3F6] border border-[#DDE3E8] text-[#17212B] rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shadow-2xs hover:shadow-xs"
              >
                <Briefcase className="w-4 h-4 text-[#176B87]" />
                <span>Cargos de {activeEmpresa.nome.split(' ')[0]}</span>
              </button>
            )}

            {onNavigate && (
              <button
                onClick={() => onNavigate('empresas')}
                className="px-4 py-2.5 bg-[#F8FAFB] hover:bg-[#E8F3F6] border border-[#DDE3E8] text-[#17212B] rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shadow-2xs hover:shadow-xs"
              >
                <Building2 className="w-4 h-4 text-[#176B87]" />
                <span>Painel de Empresas</span>
              </button>
            )}

            <button
              onClick={loadUsuarios}
              title="Atualizar lista"
              className="p-2.5 bg-[#F8FAFB] hover:bg-[#E8F3F6] border border-[#DDE3E8] text-[#17212B] rounded-2xl transition-all cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#176B87]' : 'text-[#687582]'}`} />
            </button>
            
            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-xs hover:shadow transition-all flex items-center space-x-2 cursor-pointer hover:opacity-95 bg-[#176B87]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Usuário para {activeEmpresa?.nome.split(' ')[0] || 'Empresa'}</span>
            </button>
          </div>
        </div>

        {/* Company Quick Selector Cards */}
        <div className="mt-6 pt-6 border-t border-[#DDE3E8] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#17212B] uppercase tracking-wider flex items-center space-x-1.5">
              <Building2 className="w-4 h-4 text-[#176B87]" />
              <span>1. Filtrar por Empresa:</span>
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleEmpresaSelection('all')}
                className={`text-[11px] font-bold px-3 py-1 rounded-xl transition-all cursor-pointer border ${
                  filterEmpresaId === 'all'
                    ? 'bg-[#176B87] text-white border-[#176B87] shadow-2xs'
                    : 'bg-[#F8FAFB] text-[#687582] border-[#DDE3E8] hover:text-[#17212B] hover:bg-white'
                }`}
              >
                🌐 Todas as Empresas ({empresas.length})
              </button>
              <span className="text-[11px] text-[#687582] font-medium hidden sm:inline">
                ou selecione uma abaixo:
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {empresas.map((emp) => {
              const isSelected = emp.id === filterEmpresaId;
              const empColor = emp.corPrimaria || '#176B87';
              const usersInEmpCount = usuarios.filter((u) => u.empresa_id === emp.id).length;
              
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleEmpresaSelection(emp.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'bg-white border-2 shadow-xs ring-2 ring-[#176B87]/20'
                      : 'bg-[#F8FAFB] hover:bg-white border-[#DDE3E8] hover:border-[#CBD5E1]'
                  }`}
                  style={{
                    borderColor: isSelected ? empColor : undefined,
                  }}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {emp.logoUrl ? (
                      <img
                        src={emp.logoUrl}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover border border-[#DDE3E8] bg-white flex-shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-2xs"
                        style={{ backgroundColor: empColor }}
                      >
                        {emp.nome.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs sm:text-sm text-[#17212B] truncate group-hover:text-[#176B87]">
                          {emp.nome}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#687582] truncate">
                        {usersInEmpCount} colaborador{usersInEmpCount === 1 ? '' : 'es'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center ml-2 flex-shrink-0">
                    {isSelected ? (
                      <span
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-white flex items-center space-x-1 shadow-2xs"
                        style={{ backgroundColor: empColor }}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Selecionada</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#8995A1] group-hover:text-[#176B87]">
                        Ver Usuários →
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats Bento Grid for Active Company */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-5 pt-5 border-t border-[#DDE3E8]">
          <div className="p-3.5 bg-[#F8FAFB] border border-[#DDE3E8] rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#687582] block">
                {activeEmpresa ? 'Empresa em Foco' : 'Visualização Global'}
              </span>
              <span className="text-sm sm:text-base font-bold text-[#17212B] truncate block mt-0.5 max-w-[200px]">
                {activeEmpresa ? activeEmpresa.nome : 'Todas as Empresas'}
              </span>
            </div>
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-2xs"
              style={{ backgroundColor: activeEmpresa?.corPrimaria || '#176B87' }}
            >
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 bg-[#E8F6F1] border border-[#B8E8D9] rounded-2xl">
            <span className="text-[11px] font-semibold text-[#159A72] block">Colaboradores Ativos</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-[#159A72]">{stats.ativos}</span>
              <span className="text-[10px] text-[#159A72] font-medium">com acesso liberado</span>
            </div>
          </div>

          <div className="p-3.5 bg-[#FDEBEC] border border-[#F8B4B9] rounded-2xl">
            <span className="text-[11px] font-semibold text-[#D64550] block">Inativos / Bloqueados</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-[#D64550]">{stats.inativos}</span>
              <span className="text-[10px] text-[#D64550]">sem acesso</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Multi-Filter & Search Toolbar */}
      <div className="bg-white border border-[#DDE3E8] rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-[#176B87]" />
            <h3 className="text-xs sm:text-sm font-bold text-[#17212B]">
              Filtros Avançados de Busca
            </h3>
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs font-bold text-[#D64550] hover:bg-[#FDEBEC] px-2.5 py-1 rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Filtros ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Row 1: Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-4 h-4 text-[#8995A1] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={`Buscar por nome do colaborador, e-mail, cargo ou telefone em ${activeEmpresa?.nome || 'todas as empresas'}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-[#F8FAFB] border border-[#DDE3E8] rounded-2xl text-xs sm:text-sm text-[#17212B] placeholder-[#8995A1] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all font-medium"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8995A1] hover:text-[#17212B] p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Row 2: Selectors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          
          {/* 1. Empresa Dropdown */}
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#687582] block mb-1">
              Empresa
            </label>
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filterEmpresaId}
                onChange={(e) => handleEmpresaSelection(e.target.value)}
                className="w-full pl-8 pr-7 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs font-semibold text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all cursor-pointer shadow-2xs appearance-none truncate"
              >
                <option value="all">🌐 Todas as Empresas</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    🏢 {emp.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Cargo / Função Dropdown */}
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#687582] block mb-1">
              Cargo da Empresa
            </label>
            <div className="relative">
              <Briefcase className="w-3.5 h-3.5 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filterCargo}
                onChange={(e) => setFilterCargo(e.target.value)}
                className="w-full pl-8 pr-7 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs font-semibold text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all cursor-pointer shadow-2xs appearance-none truncate"
              >
                <option value="all">💼 Todos os Cargos</option>
                {uniqueCargosWithCounts.map((c) => (
                  <option key={c.nome} value={c.nome}>
                    {c.nome} ({c.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Usuário / Colaborador Específico Dropdown */}
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#687582] block mb-1">
              Colaborador / Usuário
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filterUsuarioId}
                onChange={(e) => setFilterUsuarioId(e.target.value)}
                className="w-full pl-8 pr-7 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs font-semibold text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all cursor-pointer shadow-2xs appearance-none truncate"
              >
                <option value="all">👤 Todos os Usuários ({companyBaseUsers.length})</option>
                {companyBaseUsers
                  .slice()
                  .sort((a, b) => a.nome.localeCompare(b.nome))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.cargo})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* 4. Perfil de Acesso Dropdown */}
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#687582] block mb-1">
              Perfil de Acesso
            </label>
            <div className="relative">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filterPerfil}
                onChange={(e) => setFilterPerfil(e.target.value)}
                className="w-full pl-8 pr-7 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs font-semibold text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all cursor-pointer shadow-2xs appearance-none truncate"
              >
                <option value="all">🛡️ Todos os Perfis</option>
                <option value="master_admin">Super Admin Master</option>
                <option value="administrador">Administrador de Empresa</option>
                <option value="gestor_rh">Gestor de RH & DP</option>
                <option value="engenheiro">Engenheiro / Fiscal</option>
                <option value="operacional">Operacional</option>
                <option value="visualizador">Somente Leitura</option>
              </select>
            </div>
          </div>

          {/* 5. Status Dropdown */}
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#687582] block mb-1">
              Status de Acesso
            </label>
            <div className="relative">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-8 pr-7 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs font-semibold text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all cursor-pointer shadow-2xs appearance-none truncate"
              >
                <option value="all">⚡ Todos os Status</option>
                <option value="ativo">✅ Ativos</option>
                <option value="inativo">⛔ Inativos</option>
              </select>
            </div>
          </div>

        </div>

        {/* Active Filter Badges */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center space-x-2 pt-2 border-t border-[#DDE3E8] flex-wrap gap-y-2">
            <span className="text-[11px] font-bold text-[#687582] flex items-center space-x-1">
              <Filter className="w-3 h-3 text-[#176B87]" />
              <span>Filtros ativos:</span>
            </span>

            {filterCargo !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#E8F3F6] text-[#176B87] border border-[#C6E3EB]">
                <Briefcase className="w-3 h-3 mr-1" />
                <span>Cargo: {filterCargo}</span>
                <button
                  type="button"
                  onClick={() => setFilterCargo('all')}
                  className="ml-1.5 text-[#176B87] hover:text-[#0F536A] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filterUsuarioId !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]">
                <User className="w-3 h-3 mr-1" />
                <span>Usuário: {companyBaseUsers.find(u => u.id === filterUsuarioId)?.nome || filterUsuarioId}</span>
                <button
                  type="button"
                  onClick={() => setFilterUsuarioId('all')}
                  className="ml-1.5 text-[#6D28D9] hover:text-[#4C1D95] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filterPerfil !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                <ShieldCheck className="w-3 h-3 mr-1" />
                <span>Perfil: {filterPerfil}</span>
                <button
                  type="button"
                  onClick={() => setFilterPerfil('all')}
                  className="ml-1.5 text-[#D97706] hover:text-[#92400E] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filterStatus !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                <span>Status: {filterStatus === 'ativo' ? 'Ativo' : 'Inativo'}</span>
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className="ml-1.5 text-[#475569] hover:text-[#1E293B] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {search.trim() && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#F8FAFB] text-[#17212B] border border-[#DDE3E8]">
                <Search className="w-3 h-3 mr-1 text-[#8995A1]" />
                <span>Busca: "{search}"</span>
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="ml-1.5 text-[#8995A1] hover:text-[#17212B] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Users Table Card */}
      <div className="bg-white border border-[#DDE3E8] rounded-3xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#DDE3E8] flex items-center justify-between bg-[#F8FAFB] flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-[#176B87]" />
            <h2 className="text-xs sm:text-sm font-bold text-[#17212B]">
              Colaboradores de <span className="text-[#176B87] font-extrabold">{activeEmpresa?.nome || 'Todas as Empresas'}</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E8F3F6] text-[#176B87] border border-[#C6E3EB]">
              {displayedUsuarios.length} {displayedUsuarios.length === 1 ? 'usuário encontrado' : 'usuários encontrados'}
            </span>
          </div>
          <span className="text-[11px] text-[#687582]">
            {activeFiltersCount > 0 ? `${activeFiltersCount} filtro(s) aplicado(s)` : 'Exibindo todos os colaboradores cadastrados'}
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-[#DDE3E8] bg-white text-[11px] font-bold text-[#687582] uppercase tracking-wider">
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Empresa Vinculada</th>
                <th className="py-3 px-4">Cargo / Função</th>
                <th className="py-3 px-4">Perfil de Acesso</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3E8] text-xs font-medium text-[#17212B]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#687582]">
                    <div className="inline-block w-6 h-6 border-2 border-[#176B87] border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs font-medium">Carregando usuários...</p>
                  </td>
                </tr>
              ) : displayedUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#687582] space-y-3">
                    <Users className="w-10 h-10 text-[#8995A1] mx-auto opacity-50" />
                    <p className="text-sm font-bold text-[#17212B]">
                      Nenhum colaborador encontrado com os filtros selecionados
                    </p>
                    <p className="text-xs text-[#8995A1] max-w-md mx-auto">
                      {activeFiltersCount > 0
                        ? 'Tente ajustar ou limpar os filtros de busca, cargo ou usuário para visualizar os colaboradores cadastrados.'
                        : `Não há usuários cadastrados para ${activeEmpresa?.nome || 'esta empresa'}.`}
                    </p>
                    <div className="flex items-center justify-center space-x-3 pt-1">
                      {activeFiltersCount > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllFilters}
                          className="px-4 py-2 bg-[#F8FAFB] hover:bg-[#E8F3F6] border border-[#DDE3E8] text-[#176B87] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          Limpar Todos os Filtros
                        </button>
                      )}
                      <button
                        onClick={handleOpenCreate}
                        className="px-4 py-2 bg-[#176B87] text-white rounded-xl text-xs font-semibold hover:bg-[#0F536A] transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Cadastrar Colaborador</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedUsuarios.map((usr) => {
                  const isMaster = usr.email.toLowerCase() === MASTER_EMAIL.toLowerCase();
                  const targetEmpresa = empresas.find(e => e.id === usr.empresa_id);
                  const empColor = targetEmpresa?.corPrimaria || usr.empresa_cor || '#176B87';
                  const empName = targetEmpresa?.nome || usr.empresa_nome || 'Empresa Padrão';

                  return (
                    <tr key={usr.id} className="hover:bg-[#F8FAFB] transition-colors group">
                      
                      {/* User Avatar + Name + Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-2xs flex-shrink-0"
                            style={{ backgroundColor: isMaster ? '#176B87' : empColor }}
                          >
                            {isMaster ? '👑' : usr.nome.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-[#17212B] text-xs sm:text-sm">{usr.nome}</span>
                              {isMaster && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#E8F3F6] text-[#176B87] border border-[#C6E3EB] rounded">
                                  MASTER
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] text-[#687582] font-mono mt-0.5">
                              <span className="flex items-center space-x-1">
                                <Mail className="w-3 h-3 text-[#8995A1]" />
                                <span>{usr.email}</span>
                              </span>
                              {usr.telefone && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center space-x-1">
                                    <Phone className="w-3 h-3 text-[#8995A1]" />
                                    <span>{usr.telefone}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Linked Empresa */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          {targetEmpresa?.logoUrl ? (
                            <img 
                              src={targetEmpresa.logoUrl} 
                              alt="" 
                              className="w-7 h-7 rounded-lg object-cover border border-[#DDE3E8] bg-white flex-shrink-0 shadow-2xs" 
                            />
                          ) : (
                            <div 
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-2xs"
                              style={{ backgroundColor: empColor }}
                            >
                              <Building2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#17212B] truncate">{empName}</p>
                            <p className="text-[10px] text-[#687582] truncate">
                              CNPJ: {targetEmpresa?.cnpj || 'Vinculado'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Cargo / Departamento */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-[#176B87] flex-shrink-0" />
                            <span className="text-xs font-bold text-[#17212B]">{usr.cargo}</span>
                          </div>
                          <p className="text-[10px] text-[#687582] pl-5">{usr.departamento || 'Lotação Geral'}</p>
                        </div>
                      </td>

                      {/* Perfil Badge */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            usr.perfil === 'master_admin' || isMaster
                              ? 'bg-[#E8F3F6] text-[#176B87] border-[#C6E3EB]'
                              : usr.perfil === 'administrador'
                              ? 'bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]'
                              : usr.perfil === 'gestor_rh'
                              ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                              : usr.perfil === 'engenheiro'
                              ? 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                              : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                          }`}>
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            {usr.perfil === 'master_admin' || isMaster
                              ? 'Super Admin'
                              : usr.perfil === 'administrador'
                              ? 'Administrador'
                              : usr.perfil === 'gestor_rh'
                              ? 'Gestor de RH & DP'
                              : usr.perfil === 'engenheiro'
                              ? 'Engenheiro / Fiscal'
                              : usr.perfil === 'visualizador'
                              ? 'Somente Leitura'
                              : 'Operacional'}
                          </span>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(usr)}
                          disabled={isMaster}
                          title={isMaster ? 'Conta Master não pode ser inativada' : `Clique para ${usr.status === 'ativo' ? 'inativar' : 'ativar'}`}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                            usr.status === 'ativo'
                              ? 'bg-[#E8F6F1] text-[#159A72] border border-[#B8E8D9] hover:bg-[#D1EFE5]'
                              : 'bg-[#FDEBEC] text-[#D64550] border border-[#F8B4B9] hover:bg-[#FADBDD]'
                          } ${isMaster ? 'cursor-default opacity-90' : ''}`}
                        >
                          {usr.status === 'ativo' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-[#159A72]" />
                              <span>Ativo</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-[#D64550]" />
                              <span>Inativo</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(usr)}
                            title="Editar usuário e vínculo"
                            className="p-1.5 text-[#687582] hover:text-[#17212B] hover:bg-[#E8F3F6] rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isMaster && (
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(usr)}
                              title="Excluir usuário"
                              className="p-1.5 text-[#687582] hover:text-[#D64550] hover:bg-[#FDEBEC] rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <UsuarioFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveUsuario}
        usuarioToEdit={usuarioToEdit}
        empresas={empresas}
        selectedEmpresa={activeEmpresa}
      />

      <DeleteUsuarioModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        usuario={usuarioToDelete}
      />

      <GerenciarCargosModal
        isOpen={isGerenciarCargosOpen}
        onClose={() => setIsGerenciarCargosOpen(false)}
        empresa={activeEmpresa}
        onCargosUpdated={loadUsuarios}
      />

    </div>
  );
};
