import React from 'react';
import {
  LayoutDashboard,
  Building2,
  ChevronLeft,
  ChevronRight,
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

/** Um item do menu */
interface ItemNav {
  view: ActiveView;
  label: string;
  icon: React.ElementType;
  /** Views que também devem deixar este item aceso */
  tambemAtivoEm?: ActiveView[];
  titulo?: string;
}

/** Um grupo de itens */
interface GrupoNav {
  titulo: string;
  itens: ItemNav[];
}

// ─────────────────────────────────────────────────────────────
// ESTRUTURA DO MENU
// Para adicionar/mover um item, mexa só aqui.
// ─────────────────────────────────────────────────────────────

const NAVEGACAO: ItemNav[] = [
  { view: 'empresas',  label: 'Empresas',           icon: Briefcase,       titulo: 'Selecionar Empresa' },
  { view: 'dashboard', label: 'Módulos do Sistema', icon: LayoutDashboard, titulo: 'Voltar ao painel de módulos' },
];

const GRUPOS: GrupoNav[] = [
  {
    titulo: 'Pessoal',
    itens: [
      { view: 'administrativo', label: 'Admissões',  icon: Sliders,    titulo: 'Admissões' },
      { view: 'efetivo',        label: 'Efetivo',    icon: Users,      titulo: 'Quadro de Efetivo' },
      {
        view: 'documentos',
        label: 'Documentos',
        icon: FolderOpen,
        tambemAtivoEm: ['colaborador-perfil'],
        titulo: 'Documentos dos Colaboradores',
      },
    ],
  },
  {
    titulo: 'Governança',
    itens: [
      { view: 'solicitacoes', label: 'Solicitações',       icon: Send,        titulo: 'Central de Solicitações & Aprovações' },
      { view: 'permissoes',   label: 'Permissões por Cargo', icon: ShieldCheck, titulo: 'Permissões e Aprovações por Cargo' },
    ],
  },
];

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
    onCloseMobile?.();
  };

  const estaAtivo = (item: ItemNav) =>
    currentView === item.view || (item.tambemAtivoEm?.includes(currentView) ?? false);

  /** Botão de navegação — mesma aparência em todos os grupos */
  const BotaoNav: React.FC<{ item: ItemNav }> = ({ item }) => {
    const ativo = estaAtivo(item);
    const Icone = item.icon;

    return (
      <button
        id={`sidebar-nav-${item.view}`}
        onClick={() => handleNavClick(item.view)}
        title={isCollapsed ? (item.titulo || item.label) : undefined}
        aria-current={ativo ? 'page' : undefined}
        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
          ativo ? 'text-white shadow-xs' : 'text-[#17212B] hover:bg-[#F4F6F8]'
        }`}
        style={{
          backgroundColor: ativo ? companyColor : undefined,
          boxShadow: ativo ? theme.shadowLight : undefined,
        }}
      >
        <Icone className={`w-4 h-4 flex-shrink-0 ${ativo ? 'text-white' : 'text-[#687582]'}`} />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </button>
    );
  };

  /** Rótulo de seção — vira um traço fino quando o menu está recolhido */
  const TituloSecao: React.FC<{ texto: string }> = ({ texto }) =>
    isCollapsed ? (
      <div className="mx-3 my-1 border-t border-[#DDE3E8]" aria-hidden="true" />
    ) : (
      <span className="block px-3 text-[10px] font-bold uppercase tracking-wider text-[#8995A1] mb-2">
        {texto}
      </span>
    );

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-zinc-900/70 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        id="app-left-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white text-[#17212B] flex flex-col border-r border-[#DDE3E8] transition-all duration-300 ease-in-out shadow-xs ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* ── Marca ── */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#DDE3E8] bg-white">
          <button
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center space-x-3 text-left focus:outline-none group overflow-hidden cursor-pointer"
          >
            {selectedEmpresa?.logoUrl ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#DDE3E8] bg-white shadow-2xs flex-shrink-0 flex items-center justify-center">
                <img src={selectedEmpresa.logoUrl} alt={selectedEmpresa.nome} className="w-full h-full object-cover" />
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
                    style={{ backgroundColor: theme.bgLight, borderColor: theme.borderLight, color: companyColor }}
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

          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            className="hidden lg:flex p-1.5 rounded-lg text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] transition-colors focus:outline-none cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* ── Navegação ── */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar bg-white">
          {/* Topo: trocar de empresa / voltar aos módulos */}
          <div className="space-y-1">
            <TituloSecao texto="Navegação" />
            {NAVEGACAO.map(item => <BotaoNav key={item.view} item={item} />)}
          </div>

          {/* Grupos do módulo ativo */}
          {GRUPOS.map(grupo => (
            <div key={grupo.titulo} className="space-y-1 pt-1 border-t border-[#F0F3F5]">
              <TituloSecao texto={grupo.titulo} />
              {grupo.itens.map(item => <BotaoNav key={item.view} item={item} />)}
            </div>
          ))}

          {/* Painel master — só para o administrador geral */}
          {currentUser.email.toLowerCase() === 'fabriciooliveira2431@gmail.com' && (
            <div className="space-y-1 pt-2 border-t border-[#DDE3E8]">
              {!isCollapsed ? (
                <div className="flex items-center justify-between px-3 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#176B87] flex items-center space-x-1">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span>Painel Master</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#E8F6F1] text-[#159A72] border border-[#B8E8D9] rounded">
                    Exclusivo
                  </span>
                </div>
              ) : (
                <div className="flex justify-center mb-1" title="Painel Master">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                </div>
              )}

              <BotaoNav
                item={{ view: 'usuarios', label: 'Gestão de Usuários', icon: Users, titulo: 'Gestão de Usuários (Master)' }}
              />
            </div>
          )}
        </nav>

        {/* ── Rodapé: usuário ── */}
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
