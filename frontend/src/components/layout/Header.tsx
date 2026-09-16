import React, { useState } from 'react';
import { Building2, Menu, RefreshCw, LogOut, ChevronDown, Users, Crown } from 'lucide-react';
import { ActiveView, Empresa } from '../../types';
import { getCompanyTheme } from '../../utils/theme';

export interface UserSession {
  email: string;
  name: string;
  role: string;
}

interface HeaderProps {
  currentView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onToggleMobileMenu?: () => void;
  showMobileToggle?: boolean;
  selectedEmpresa?: Empresa | null;
  onSwitchEmpresa?: () => void;
  currentUser?: UserSession;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentView, 
  onNavigate, 
  onToggleMobileMenu, 
  showMobileToggle = true,
  selectedEmpresa,
  onSwitchEmpresa,
  currentUser = { email: 'fabriciooliveira2431@gmail.com', name: 'Fabrício Oliveira', role: 'Administrador Geral' },
  onLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const companyColor = selectedEmpresa?.corPrimaria || '#176B87';
  const theme = getCompanyTheme(companyColor);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <>
      <header className="bg-white border-b border-[#DDE3E8] text-[#17212B] sticky top-0 z-30 shadow-2xs">
        {/* Top micro brand color line */}
        {currentView === 'usuarios' ? (
          <div className="h-0.5 w-full bg-[#176B87]" />
        ) : (
          selectedEmpresa && (
            <div className="h-0.5 w-full" style={{ backgroundColor: companyColor }} />
          )
        )}

        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Mobile hamburger & Brand */}
          <div className="flex items-center space-x-3">
            {showMobileToggle && onToggleMobileMenu && currentView !== 'usuarios' && (
              <button
                onClick={onToggleMobileMenu}
                className="lg:hidden p-2 rounded-lg text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] focus:outline-none cursor-pointer"
                title="Abrir menu lateral"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {currentView === 'usuarios' ? (
              <div 
                onClick={() => onNavigate('usuarios')} 
                className="flex items-center space-x-3 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#176B87] text-white shadow-2xs">
                  <Crown className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#17212B]">ÍNTEGRA</span>
                    <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded border bg-[#E8F3F6] border-[#C6E3EB] text-[#176B87] flex items-center space-x-1">
                      <span>PAINEL MASTER</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-[#687582] hidden sm:block">Gestão Global Multi-Empresas</p>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => onNavigate('dashboard')} 
                className="flex items-center space-x-3 cursor-pointer group"
              >
                {selectedEmpresa?.logoUrl ? (
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#DDE3E8] bg-white shadow-2xs flex items-center justify-center">
                    <img 
                      src={selectedEmpresa.logoUrl} 
                      alt={selectedEmpresa.nome} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-2xs transition-opacity group-hover:opacity-90"
                    style={{ backgroundColor: companyColor }}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#17212B]">ÍNTEGRA</span>
                    <span 
                      className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded border"
                      style={{
                        backgroundColor: theme.bgLight,
                        borderColor: theme.borderLight,
                        color: companyColor,
                      }}
                    >
                      {selectedEmpresa ? selectedEmpresa.nome.split(' ')[0].toUpperCase() : 'EMPRESARIAL'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#687582] hidden sm:block">Gestão Operacional & RH</p>
                </div>
              </div>
            )}
          </div>

          {/* Center/Right: Empresa Selector Chip & User Profile */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* In usuarios view: Direct button to Go to Enterprises */}
            {currentView === 'usuarios' && (
              <button
                id="header-btn-ir-empresas"
                onClick={() => onNavigate('empresas')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-[#DDE3E8] bg-[#F8FAFB] hover:bg-white text-xs font-bold text-[#17212B] transition-all cursor-pointer shadow-2xs"
                title="Ir para tela de seleção de empresas"
              >
                <Building2 className="w-3.5 h-3.5 text-[#176B87]" />
                <span className="hidden sm:inline">Painel de Empresas</span>
                <span className="sm:hidden">Empresas</span>
              </button>
            )}

            {/* Active Company Badge with Switch Button (ONLY when NOT in master usuarios view) */}
            {currentView !== 'usuarios' && selectedEmpresa && onSwitchEmpresa && (
              <button
                onClick={onSwitchEmpresa}
                className="flex items-center space-x-2 bg-[#F8FAFB] hover:bg-white px-3 py-1.5 rounded-xl border border-[#DDE3E8] text-left transition-all focus:outline-none group cursor-pointer shadow-2xs hover:shadow-xs"
                title="Clique para trocar de empresa"
              >
                {selectedEmpresa.logoUrl ? (
                  <div className="w-6 h-6 rounded-lg overflow-hidden border border-[#DDE3E8] bg-white flex-shrink-0 flex items-center justify-center">
                    <img 
                      src={selectedEmpresa.logoUrl} 
                      alt={selectedEmpresa.nome} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                ) : (
                  <div 
                    className="w-6 h-6 rounded-lg text-white font-bold text-xs flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: companyColor }}
                  >
                    {selectedEmpresa.nome.substring(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block max-w-[160px] truncate">
                  <p className="text-[10px] text-[#687582] font-semibold uppercase leading-none">Empresa Ativa</p>
                  <p className="text-xs font-bold text-[#17212B] truncate mt-0.5">
                    {selectedEmpresa.nome}
                  </p>
                </div>
                <RefreshCw 
                  className="w-3.5 h-3.5 group-hover:rotate-180 transition-all flex-shrink-0 ml-1" 
                  style={{ color: companyColor }}
                />
              </button>
            )}

            {/* User Profile with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2.5 border-l border-[#DDE3E8] pl-3 sm:pl-4 focus:outline-none group text-left cursor-pointer"
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-2xs transition-opacity group-hover:opacity-90"
                  style={{ backgroundColor: companyColor }}
                >
                  {getInitials(currentUser.name)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-[#17212B]">{currentUser.name}</p>
                  <p className="text-[10px] text-[#687582] truncate max-w-[130px]">{currentUser.role}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#687582] group-hover:text-[#17212B] transition-transform" />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-[#DDE3E8] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in duration-150">
                    <div className="px-4 py-2.5 border-b border-[#DDE3E8] bg-[#F8FAFB]">
                      <p className="text-xs font-bold text-[#17212B] truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-[#687582] truncate font-mono">{currentUser.email}</p>
                      <div className="flex items-center space-x-1.5 mt-1.5">
                        <span 
                          className="px-2 py-0.5 rounded text-[10px] font-bold border"
                          style={{
                            backgroundColor: theme.bgLight,
                            borderColor: theme.borderLight,
                            color: companyColor,
                          }}
                        >
                          {currentUser.role}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#E8F6F1] text-[#159A72] border border-[#B8E8D9]">
                          Admin
                        </span>
                      </div>
                    </div>

                    <div className="p-2 border-b border-[#DDE3E8] space-y-1">
                      {currentUser.email.toLowerCase() === 'fabriciooliveira2431@gmail.com' && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onNavigate('usuarios');
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-bold text-[#176B87] hover:bg-[#E8F3F6] rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center space-x-2">
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                            <span>Gestão de Usuários (Master)</span>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#E8F6F1] text-[#159A72] border border-[#B8E8D9] rounded">
                            Master
                          </span>
                        </button>
                      )}
                    </div>

                    {onLogout && (
                      <div className="pt-1">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full px-4 py-2 text-left text-xs text-[#D64550] hover:text-[#B53640] hover:bg-[#FDEBEC] flex items-center space-x-2 transition-colors font-semibold cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sair do Sistema</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
