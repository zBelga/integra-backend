import React from 'react';
import { UserCheck, Package, ShieldAlert, FileText, ArrowRight, Lock, RefreshCw, Building2, Palette, Users, Crown, ShieldCheck, Send, Sliders, FolderOpen } from 'lucide-react';
import { ActiveView, Empresa } from '../../types';
import { getCompanyTheme } from '../../utils/theme';

interface DashboardProps {
  onSelectModule: (view: ActiveView) => void;
  selectedEmpresa?: Empresa | null;
  onSwitchEmpresa?: () => void;
  currentUser?: { email: string; name: string; role: string };
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  onSelectModule,
  selectedEmpresa,
  onSwitchEmpresa,
  currentUser,
}) => {
  const companyColor = selectedEmpresa?.corPrimaria || '#176B87';
  const theme = getCompanyTheme(companyColor);
  const isMasterAdmin = currentUser?.email.toLowerCase() === 'fabriciooliveira2431@gmail.com';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Active Empresa Banner - Themed Corporate Card */}
      {selectedEmpresa && (
        <div 
          className="bg-white rounded-2xl p-5 sm:p-6 text-[#17212B] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border"
          style={{
            borderColor: theme.borderLight,
            boxShadow: theme.shadowLight,
          }}
        >
          <div className="flex items-center space-x-4">
            {selectedEmpresa.logoUrl ? (
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white flex-shrink-0 flex items-center justify-center">
                <img 
                  src={selectedEmpresa.logoUrl} 
                  alt={selectedEmpresa.nome} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-white text-lg shadow-md flex-shrink-0"
                style={{ backgroundColor: companyColor }}
              >
                {selectedEmpresa.nome.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-[#17212B]">{selectedEmpresa.nome}</h2>
                <span className="bg-[#E8F6F1] text-[#159A72] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#B8E8D9]">
                  {selectedEmpresa.status.toUpperCase()}
                </span>
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center space-x-1"
                  style={{
                    backgroundColor: theme.bgLight,
                    borderColor: theme.borderLight,
                    color: companyColor,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: companyColor }} />
                  <span>TEMA DA EMPRESA</span>
                </span>
              </div>
              <p className="text-xs text-[#687582] mt-0.5 font-mono">
                CNPJ: {selectedEmpresa.cnpj} • {selectedEmpresa.segmento}
              </p>
            </div>
          </div>

          {onSwitchEmpresa && (
            <button
              onClick={onSwitchEmpresa}
              className="px-3.5 py-2 bg-[#F8FAFB] hover:bg-white border border-[#DDE3E8] text-[#17212B] rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" style={{ color: companyColor }} />
              <span>Trocar de Empresa</span>
            </button>
          )}
        </div>
      )}

      {/* Title section */}
      <div className="border-b border-[#DDE3E8] pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#17212B] tracking-tight">PAINEL ÍNTEGRA</h1>
          <p className="text-sm text-[#687582] mt-1">
            Selecione um dos módulos corporativos para acessar o painel de controle operacional da empresa.
          </p>
        </div>
        <div 
          className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 w-fit border"
          style={{
            backgroundColor: theme.bgLight,
            borderColor: theme.borderLight,
            color: companyColor,
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: companyColor }}></span>
          <span>ÍNTEGRA ATIVO v1.0.0</span>
        </div>
      </div>

      {/* Master Admin Section (Only for fabriciooliveira2431@gmail.com) */}
      {isMasterAdmin && (
        <div 
          onClick={() => onSelectModule('usuarios')}
          className="group relative bg-white border border-[#C6E3EB] rounded-3xl p-6 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-[#E8F3F6]"
        >
          <div className="flex items-center space-x-4">
            <div 
              className="w-13 h-13 rounded-2xl flex items-center justify-center text-white font-bold shadow-xs flex-shrink-0"
              style={{ backgroundColor: companyColor }}
            >
              <Crown className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-[#17212B]">Gestão de Usuários & Vínculos (Painel Master)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F6F1] text-[#159A72] border border-[#B8E8D9] flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>MASTER</span>
                </span>
              </div>
              <p className="text-xs text-[#687582] mt-1">
                Funcionalidade exclusiva: Crie usuários, defina credenciais e vincule cada colaborador à sua respectiva empresa no SaaS.
              </p>
            </div>
          </div>

          <div 
            className="flex items-center space-x-2 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
            style={{ color: companyColor, backgroundColor: theme.bgLight }}
          >
            <span>Gerenciar Usuários</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      )}

      {/* Grid of Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. ADMISSÕES */}
        <div
          onClick={() => onSelectModule('administrativo')}
          className="group relative bg-white rounded-2xl border border-[#DDE3E8] p-6 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = companyColor;
            e.currentTarget.style.boxShadow = theme.shadowLight;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#DDE3E8';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center border transition-colors shadow-2xs"
                style={{
                  backgroundColor: theme.bgLight,
                  borderColor: theme.borderLight,
                  color: companyColor,
                }}
              >
                <UserCheck className="w-6 h-6" />
              </div>
              <span className="bg-[#E8F6F1] text-[#159A72] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#B8E8D9] uppercase tracking-wider">
                Ativo
              </span>
            </div>

            <h2 className="text-base font-bold text-[#17212B] transition-colors">
              ADMISSÕES
            </h2>
            <p className="text-xs text-[#687582] mt-2 leading-relaxed">
              Cadastro de pré-admissões, vinculação de obras e gestão de contratações para {selectedEmpresa ? selectedEmpresa.nome : 'a empresa'}.
            </p>
          </div>

          <div 
            className="mt-6 pt-4 border-t border-[#DDE3E8] flex items-center justify-between text-xs font-semibold transition-colors"
            style={{ color: companyColor }}
          >
            <span>Acessar Admissões</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 2. EFETIVO */}
        <div
          onClick={() => onSelectModule('efetivo')}
          className="group relative bg-white rounded-2xl border border-[#DDE3E8] p-6 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = companyColor;
            e.currentTarget.style.boxShadow = theme.shadowLight;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#DDE3E8';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center border transition-colors shadow-2xs"
                style={{
                  backgroundColor: theme.bgLight,
                  borderColor: theme.borderLight,
                  color: companyColor,
                }}
              >
                <Users className="w-6 h-6" />
              </div>
              <span className="bg-[#E8F6F1] text-[#159A72] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#B8E8D9] uppercase tracking-wider">
                Ativo
              </span>
            </div>

            <h2 className="text-base font-bold text-[#17212B] transition-colors">
              EFETIVO
            </h2>
            <p className="text-xs text-[#687582] mt-2 leading-relaxed">
              Quadro de colaboradores ativos, alocação em canteiros e acompanhamento por função e obra.
            </p>
          </div>

          <div 
            className="mt-6 pt-4 border-t border-[#DDE3E8] flex items-center justify-between text-xs font-semibold transition-colors"
            style={{ color: companyColor }}
          >
            <span>Acessar Efetivo</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 2. CENTRAL DE SOLICITAÇÕES */}
        <div
          onClick={() => onSelectModule('solicitacoes')}
          className="group relative bg-white rounded-2xl border border-[#DDE3E8] p-6 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = companyColor;
            e.currentTarget.style.boxShadow = theme.shadowLight;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#DDE3E8';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center border transition-colors shadow-2xs"
                style={{
                  backgroundColor: '#FEF3C7',
                  borderColor: '#FDE68A',
                  color: '#D97706',
                }}
              >
                <Send className="w-6 h-6" />
              </div>
              <span className="bg-[#FEF3C7] text-[#B45309] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#FDE68A] uppercase tracking-wider">
                Fila de Aprovação
              </span>
            </div>

            <h2 className="text-base font-bold text-[#17212B] transition-colors">
              SOLICITAÇÕES & APROVAÇÕES
            </h2>
            <p className="text-xs text-[#687582] mt-2 leading-relaxed">
              Central de aprovação de alterações cadastrais enviadas por assistentes e cargos sem permissão de edição direta.
            </p>
          </div>

          <div 
            className="mt-6 pt-4 border-t border-[#DDE3E8] flex items-center justify-between text-xs font-semibold transition-colors text-[#D97706]"
          >
            <span>Gerenciar Solicitações</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 3. PERMISSÕES POR CARGO */}
        <div
          onClick={() => onSelectModule('permissoes')}
          className="group relative bg-white rounded-2xl border border-[#DDE3E8] p-6 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = companyColor;
            e.currentTarget.style.boxShadow = theme.shadowLight;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#DDE3E8';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center border transition-colors shadow-2xs"
                style={{
                  backgroundColor: '#E8F3F6',
                  borderColor: '#C6E3EB',
                  color: '#176B87',
                }}
              >
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="bg-[#E8F3F6] text-[#176B87] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#C6E3EB] uppercase tracking-wider">
                Governança
              </span>
            </div>

            <h2 className="text-base font-bold text-[#17212B] transition-colors">
              PERMISSÕES POR CARGO
            </h2>
            <p className="text-xs text-[#687582] mt-2 leading-relaxed">
              Configure a matriz granular de acessos por cargo: Visualizar, Criar, Editar Direto, Excluir e Solicitar Alteração.
            </p>
          </div>

          <div 
            className="mt-6 pt-4 border-t border-[#DDE3E8] flex items-center justify-between text-xs font-semibold transition-colors text-[#176B87]"
          >
            <span>Configurar Matriz</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 4. ALMOXARIFADO (Em breve) */}
        <div className="relative bg-[#F8FAFB] rounded-2xl border border-[#DDE3E8] p-6 shadow-none opacity-70 flex flex-col justify-between cursor-not-allowed select-none">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-white text-[#8995A1] flex items-center justify-center border border-[#DDE3E8]">
                <Package className="w-6 h-6" />
              </div>
              <span className="bg-[#F4F6F8] text-[#8995A1] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#DDE3E8] uppercase tracking-wider flex items-center space-x-1">
                <Lock className="w-3 h-3 inline mr-0.5" /> Em breve
              </span>
            </div>

            <h2 className="text-base font-bold text-[#687582]">
              ALMOXARIFADO & MATERIAIS
            </h2>
            <p className="text-xs text-[#8995A1] mt-2 leading-relaxed">
              Controle de estoque, fornecedores, entradas e saídas de materiais.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#DDE3E8] flex items-center justify-between text-xs font-medium text-[#8995A1]">
            <span>Módulo em desenvolvimento</span>
          </div>
        </div>

        {/* 5. SEGURANÇA (Em breve) */}
        <div className="relative bg-[#F8FAFB] rounded-2xl border border-[#DDE3E8] p-6 shadow-none opacity-70 flex flex-col justify-between cursor-not-allowed select-none">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-white text-[#8995A1] flex items-center justify-center border border-[#DDE3E8]">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <span className="bg-[#F4F6F8] text-[#8995A1] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#DDE3E8] uppercase tracking-wider flex items-center space-x-1">
                <Lock className="w-3 h-3 inline mr-0.5" /> Em breve
              </span>
            </div>

            <h2 className="text-base font-bold text-[#687582]">
              SEGURANÇA & EPIS
            </h2>
            <p className="text-xs text-[#8995A1] mt-2 leading-relaxed">
              Gestão de EPIs, registros de treinamentos e normas de segurança do trabalho.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#DDE3E8] flex items-center justify-between text-xs font-medium text-[#8995A1]">
            <span>Módulo em desenvolvimento</span>
          </div>
        </div>

        {/* 6. DOCUMENTOS DOS COLABORADORES */}
        <div
          onClick={() => onSelectModule('documentos')}
          className="group relative bg-white rounded-2xl border border-[#DDE3E8] p-6 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = companyColor;
            e.currentTarget.style.boxShadow = theme.shadowLight;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#DDE3E8';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center border transition-colors shadow-2xs"
                style={{
                  backgroundColor: '#EDE9FE',
                  borderColor: '#DDD6FE',
                  color: '#7C3AED',
                }}
              >
                <FolderOpen className="w-6 h-6" />
              </div>
              <span className="bg-[#E8F6F1] text-[#159A72] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#B8E8D9] uppercase tracking-wider">
                Ativo
              </span>
            </div>

            <h2 className="text-base font-bold text-[#17212B] transition-colors">
              DOCUMENTOS & CERTIDÕES
            </h2>
            <p className="text-xs text-[#687582] mt-2 leading-relaxed">
              Repositório de documentos por colaborador: ASO, NRs, contratos e certidões, com controle de vencimento e pendências.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#DDE3E8] flex items-center justify-between text-xs font-semibold transition-colors text-[#7C3AED]">
            <span>Acessar Documentos</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
