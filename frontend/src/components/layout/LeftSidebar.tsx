import React from 'react';
import {
  LayoutDashboard,
  Building2,
  ChevronLeft,
  ChevronRight,
  HardHat,
  Boxes,
  FileSpreadsheet,
  Briefcase,
  LogOut,
  ShieldCheck,
  Users,
  Crown,
  Send,
  Sliders,
  FolderOpen,
} from 'lucide-react';
import { ActiveView, Empresa } from '../../types';
import { getCompanyTheme } from '../../utils/theme';

interface LeftSidebarProps {
  currentView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  selectedEmpresa?: Empresa | null;
  currentUser?: { email: string; name: string; role: string };
  onLogout?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentView,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  selectedEmpresa,
  currentUser = { email: 'fabriciooliveira2431@gmail.com', name: 'Fabrício Oliveira', role: 'Administrador Geral' },
  onLogout,
}) => {
  const companyColor = selectedEmpresa?.corPrimaria || '#176B87';
  const theme = getCompanyTheme(companyColor);

  const handleNavClick = (view: ActiveView) => {
    onNavigate(view);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const disabledModules = [
    { name: 'Almoxarifado', icon: Boxes, desc: 'Estoque de materiais' },
    { name: 'Segurança', icon: HardHat, desc: 'EPIs & NRs' },
    { name: 'Relatórios', icon: FileSpreadsheet, desc: 'Indicadores & BI' },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-zinc-900/70 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        id="app-left-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white text-[#17212B] flex flex-col border-r border-[#DDE3E8] transition-all duration-300 ease-in-out shadow-xs ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand / Logo Top Bar */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#DDE3E8] bg-white">
          <button
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center space-x-3 text-left focus:outline-none group overflow-hidden cursor-pointer"
          >
            {selectedEmpresa?.logoUrl ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#DDE3E8] bg-white shadow-2xs flex-shrink-0 flex items-center justify-center">
                <img
                  src={selectedEmpresa.logoUrl}
                  alt={selectedEmpresa.nome}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white shadow-2xs transition-opacity group-hover:opacity-90"
                style={{ backgroundColor: companyColor }}
              >
                <Building2 className="w-6 h-6" />
              </div>
            )}

            {!isCollapsed && (
              <div className="leading-tight overflow-hidden">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-[#17212B]">ÍNTEGRA</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.2 border rounded"
                    style={{
                      backgroundColor: theme.bgLight,
                      borderColor: theme.borderLight,
                      color: companyColor,
                    }}
                  >
                    SaaS
                  </span>
                </div>
                <p className="text-[11px] text-[#687582] truncate">
                  {selectedEmpresa ? selectedEmpresa.nome : 'Gestão Operacional'}
                </p>
              </div>
            )}
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            className="hidden lg:flex p-1.5 rounded-lg text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] transition-colors focus:outline-none cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar bg-white">
          {/* Main Navigation Section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <span className="block px-3 text-[10px] font-bold uppercase tracking-wider text-[#687582] mb-2">
                Navegação
              </span>
            )}

            {/* Empresas Switcher */}
            <button
              id="sidebar-nav-empresas"
              onClick={() => handleNavClick('empresas')}
              title={isCollapsed ? 'Selecionar Empresa' : undefined}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'empresas'
                  ? 'text-white shadow-xs'
                  : 'text-[#17212B] hover:bg-[#F4F6F8]'
              }`}
              style={{
                backgroundColor: currentView === 'empresas' ? companyColor : undefined,
                boxShadow: currentView === 'empresas' ? theme.shadowLight : undefined,
              }}
            >
              <Briefcase className={`w-4 h-4 flex-shrink-0 ${currentView === 'empresas' ? 'text-white' : 'text-[#687582]'}`} />
              {!isCollapsed && <span>Empresas</span>}
            </button>

            {/* Dashboard Link */}
            <button
              id="sidebar-nav-dashboard"
              onClick={() => handleNavClick('dashboard')}
              title={isCollapsed ? 'Painel de Módulos (Sistema)' : undefined}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'dashboard'
                  ? 'text-white shadow-xs'
                  : 'text-[#17212B] hover:bg-[#F4F6F8]'
              }`}
              style={{
                backgroundColor: currentView === 'dashboard' ? companyColor : undefined,
                boxShadow: currentView === 'dashboard' ? theme.shadowLight : undefined,
              }}
            >
              <LayoutDashboard className={`w-4 h-4 flex-shrink-0 ${currentView === 'dashboard' ? 'text-white' : 'text-[#687582]'}`} />
              {!isCollapsed && <span>Módulos do Sistema</span>}
            </button>
          </div>

          {/* Módulo Administrativo Section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#687582]">
                  Módulo Ativo
                </span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.2 border rounded"
                  style={{
                    backgroundColor: theme.bgLight,
                    borderColor: theme.borderLight,
                    color: companyColor,
                  }}
                >
                  Ativo
                </span>
              </div>
            )}

            {/* Admissões Button */}
            <button
              id="sidebar-nav-admin"
              onClick={() => handleNavClick('administrativo')}
              title={isCollapsed ? 'Admissões' : undefined}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'administrativo'
                  ? 'text-white shadow-xs'
                  : 'text-[#17212B] hover:bg-[#F4F6F8]'
              }`}
              style={{
                backgroundColor: currentView === 'administrativo' ? companyColor : undefined,
                boxShadow: currentView === 'administrativo' ? theme.shadowLight : undefined,
              }}
            >
              <Sliders className={`w-4 h-4 flex-shrink-0 ${currentView === 'administrativo' ? 'text-white' : 'text-[#687582]'}`} />
              {!isCollapsed && <span>Admissões</span>}
            </button>

            {/* Efetivo Button */}
            <button
              id="sidebar-nav-efetivo"
              onClick={() => handleNavClick('efetivo')}
              title={isCollapsed ? 'Quadro de Efetivo' : undefined}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'efetivo'
                  ? 'text-white shadow-xs'
                  : 'text-[#17212B] hover:bg-[#F4F6F8]'
              }`}
              style={{
                backgroundColor: currentView === 'efetivo' ? companyColor : undefined,
                boxShadow: currentView === 'efetivo' ? theme.shadowLight : undefined,
              }}
            >
              <Users className={`w-4 h-4 flex-shrink-0 ${currentView === 'efetivo' ? 'text-white' : 'text-[#687582]'}`} />
              {!isCollapsed && <span>Efetivo</span>}
            </button>

            {/* Documentos Button */}
            <button
              id="sidebar-nav-documentos"
              onClick={() => handleNavClick('documentos')}
              title={isCollapsed ? 'Documentos dos Colaboradores' : undefined}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'documentos' || currentView === 'colaborador-perfil'
                  ? 'text-white shadow-xs'
                  : 'text-[#17212B] hover:bg-[#F4F6F8]'
              }`}
              style={{
                backgroundColor: currentView === 'documentos' || currentView === 'colaborador-perfil' ? companyColor : undefined,
                boxShadow: currentView === 'documentos' || currentView === 'colaborador-perfil' ? theme.shadowLight : undefined,
              }}
            >
              <FolderOpen className={`w-4 h-4 flex-shrink-0 ${currentView === 'documentos' || currentView === 'colaborador-perfil' ? 'text-white' : 'text-[#687582]'}`} />
              {!isCollapsed && <span>Documentos</span>}
            </button>

            {/* Central de Solicitações */}
            <button
              id="sidebar-nav-solicitacoes"
              onClick={() => handleNavClick('solicitacoes')}
              title={isCollapsed ? 'Central de Solicitações & Aprovações' : undefined}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'solicitacoes'
                  ? 'text-white shadow-xs'
                  : 'text-[#17212B] hover:bg-[#F4F6F8]'
              }`}
              style={{
                backgroundColor: currentView === 'solicitacoes' ? companyColor : undefined,
                boxShadow: currentView === 'solicitacoes' ? theme.shadowLight : undefined,
              }}
            >
              <Send className={`w-4 h-4 flex-shrink-0 ${currentView === 'solicitacoes' ? 'text-white' : 'text-[#687582]'}`} />
              {!isCollapsed && <span>Solicitações</span>}
            </button>

            {/* Permissões por Cargo */}
            <button
              id="sidebar-nav-permissoes"
              onClick={() => handleNavClick('permissoes')}
              title={isCollapsed ? 'Permissões e Aprovações por Cargo' : undefined}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'permissoes'
                  ? 'text-white shadow-xs'
                  : 'text-[#17212B] hover:bg-[#F4F6F8]'
              }`}
              style={{
                backgroundColor: currentView === 'permissoes' ? companyColor : undefined,
                boxShadow: currentView === 'permissoes' ? theme.shadowLight : undefined,
              }}
            >
              <ShieldCheck className={`w-4 h-4 flex-shrink-0 ${currentView === 'permissoes' ? 'text-white' : 'text-[#687582]'}`} />
              {!isCollapsed && <span>Permissões por Cargo</span>}
            </button>
          </div>

          {/* Master Admin Exclusive Section: Gestão de Usuários & Vínculos */}
          {currentUser.email.toLowerCase() === 'fabriciooliveira2431@gmail.com' && (
            <div className="space-y-1 pt-2 border-t border-[#DDE3E8]">
              {!isCollapsed && (
                <div className="flex items-center justify-between px-3 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#176B87] flex items-center space-x-1">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span>Painel Master</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#E8F6F1] text-[#159A72] border border-[#B8E8D9] rounded">
                    Exclusivo
                  </span>
                </div>
              )}

              <button
                id="sidebar-nav-usuarios"
                onClick={() => handleNavClick('usuarios')}
                title={isCollapsed ? 'Gestão de Usuários (Master)' : undefined}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'usuarios'
                    ? 'text-white shadow-xs'
                    : 'text-[#17212B] hover:bg-[#E8F3F6]'
                }`}
                style={{
                  backgroundColor: currentView === 'usuarios' ? companyColor : undefined,
                  boxShadow: currentView === 'usuarios' ? theme.shadowLight : undefined,
                }}
              >
                <Users className={`w-4 h-4 flex-shrink-0 ${currentView === 'usuarios' ? 'text-white' : 'text-[#176B87]'}`} />
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">Gestão de Usuários</span>
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Inactive / Future Modules */}
          <div className="space-y-1 pt-2 border-t border-[#DDE3E8]">
            {!isCollapsed && (
              <span className="block px-3 text-[10px] font-bold uppercase tracking-wider text-[#687582] mb-2">
                Outros Módulos
              </span>
            )}

            {disabledModules.map((mod) => {
              const ModIcon = mod.icon;
              return (
                <div
                  key={mod.name}
                  title={isCollapsed ? `${mod.name} (Em breve)` : undefined}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-[#8995A1] cursor-not-allowed opacity-80 select-none"
                >
                  <div className="flex items-center space-x-3">
                    <ModIcon className="w-4 h-4 text-[#8995A1] flex-shrink-0" />
                    {!isCollapsed && <span>{mod.name}</span>}
                  </div>
                  {!isCollapsed && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-[#F4F6F8] text-[#8995A1] border border-[#DDE3E8] rounded">
                      Em breve
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer: User / Status info */}
        <div className="p-3 border-t border-[#DDE3E8] bg-[#F8FAFB]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-2xs"
                style={{ backgroundColor: companyColor }}
              >
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#17212B] truncate">{currentUser.name}</p>
                  <div className="flex items-center space-x-1 text-[10px] text-[#687582]">
                    <ShieldCheck className="w-3 h-3 text-[#159A72] flex-shrink-0" />
                    <span className="truncate">LGPD & SSL</span>
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && onLogout && (
              <button
                onClick={onLogout}
                title="Sair do sistema"
                className="p-1.5 text-[#687582] hover:text-[#D64550] hover:bg-[#FDEBEC] rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
