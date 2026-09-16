import React from 'react';
import { ChevronRight, Home, Building2 } from 'lucide-react';
import { ActiveView, Empresa } from '../../types';
import { getCompanyTheme } from '../../utils/theme';

interface BreadcrumbsProps {
  currentView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  selectedEmpresa?: Empresa | null;
  subTitle?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ 
  currentView, 
  onNavigate, 
  selectedEmpresa, 
  subTitle 
}) => {
  const companyColor = selectedEmpresa?.corPrimaria || '#176B87';
  const theme = getCompanyTheme(companyColor);

  return (
    <nav className="flex items-center text-xs font-medium text-[#687582] py-2.5 px-4 sm:px-6 lg:px-8 w-full bg-white border-b border-[#DDE3E8] overflow-x-auto">
      {/* Root: Empresas */}
      <button
        onClick={() => onNavigate('empresas')}
        className={`flex items-center space-x-1.5 transition-colors cursor-pointer ${
          currentView === 'empresas'
            ? 'font-bold text-[#17212B]'
            : 'hover:text-[#17212B] text-[#687582]'
        }`}
      >
        <Building2 className="w-3.5 h-3.5" />
        <span>EMPRESAS</span>
      </button>

      {/* Selected Empresa / Sistema (Only when inside an enterprise view like dashboard or administrativo) */}
      {currentView !== 'empresas' && currentView !== 'usuarios' && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-[#8995A1] mx-1.5 flex-shrink-0" />
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center space-x-1.5 transition-colors cursor-pointer ${
              currentView === 'dashboard'
                ? 'font-bold text-[#17212B]'
                : 'hover:text-[#17212B] text-[#687582]'
            }`}
          >
            {selectedEmpresa?.logoUrl ? (
              <img 
                src={selectedEmpresa.logoUrl} 
                alt="Logo" 
                className="w-3.5 h-3.5 rounded object-cover mr-0.5" 
              />
            ) : (
              <Home className="w-3.5 h-3.5 mr-0.5" />
            )}
            <span>{selectedEmpresa ? selectedEmpresa.nome.toUpperCase() : 'SISTEMA'}</span>
          </button>
        </>
      )}

      {/* Module: Administrativo */}
      {currentView === 'administrativo' && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-[#8995A1] mx-1.5 flex-shrink-0" />
          <button
            onClick={() => onNavigate('administrativo')}
            className={`flex items-center space-x-1 transition-colors cursor-pointer ${
              !subTitle ? 'font-bold text-[#17212B]' : 'hover:text-[#17212B] text-[#687582]'
            }`}
          >
            <span 
              className="px-2 py-0.5 rounded border text-[11px] font-bold"
              style={{
                backgroundColor: theme.bgLight,
                borderColor: theme.borderLight,
                color: companyColor,
              }}
            >
              EFETIVO & ADMISSÕES
            </span>
          </button>
        </>
      )}

      {/* Module: Solicitações */}
      {currentView === 'solicitacoes' && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-[#8995A1] mx-1.5 flex-shrink-0" />
          <button
            onClick={() => onNavigate('solicitacoes')}
            className="flex items-center space-x-1 font-bold text-[#17212B] cursor-pointer"
          >
            <span 
              className="px-2 py-0.5 rounded border text-[11px] font-bold"
              style={{
                backgroundColor: theme.bgLight,
                borderColor: theme.borderLight,
                color: companyColor,
              }}
            >
              CENTRAL DE SOLICITAÇÕES & APROVAÇÕES
            </span>
          </button>
        </>
      )}

      {/* Module: Permissões */}
      {currentView === 'permissoes' && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-[#8995A1] mx-1.5 flex-shrink-0" />
          <button
            onClick={() => onNavigate('permissoes')}
            className="flex items-center space-x-1 font-bold text-[#17212B] cursor-pointer"
          >
            <span 
              className="px-2 py-0.5 rounded border text-[11px] font-bold"
              style={{
                backgroundColor: theme.bgLight,
                borderColor: theme.borderLight,
                color: companyColor,
              }}
            >
              PERMISSÕES & APROVAÇÕES POR CARGO
            </span>
          </button>
        </>
      )}

      {/* Module: Gestão de Usuários (Master Global) */}
      {currentView === 'usuarios' && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-[#8995A1] mx-1.5 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-[#687582]">PAINEL MASTER GLOBAL</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#8995A1] mx-1.5 flex-shrink-0" />
          <button
            onClick={() => onNavigate('usuarios')}
            className="flex items-center space-x-1 font-bold text-[#17212B] cursor-pointer"
          >
            <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-[#E8F3F6] border-[#C6E3EB] text-[#176B87]">
              GESTÃO DE USUÁRIOS & VÍNCULOS MULTI-EMPRESAS
            </span>
          </button>
        </>
      )}

      {/* SubSection (if any) */}
      {subTitle && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-[#8995A1] mx-1.5 flex-shrink-0" />
          <span 
            className="font-bold px-2 py-0.5 rounded border uppercase text-[11px]"
            style={{
              backgroundColor: theme.bgLight,
              borderColor: theme.borderLight,
              color: companyColor,
            }}
          >
            {subTitle}
          </span>
        </>
      )}
    </nav>
  );
};
