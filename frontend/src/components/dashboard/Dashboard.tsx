import React from 'react';
import { ArrowRight, Lock, RefreshCw, Crown, ShieldCheck, Sliders, FolderOpen, HardHat, Package } from 'lucide-react';
import { ActiveView, ChaveModulo, Empresa } from '../../types';
import { getCompanyTheme } from '../../utils/theme';

interface DashboardProps {
  onSelectModule: (view: ActiveView) => void;
  selectedEmpresa?: Empresa | null;
  onSwitchEmpresa?: () => void;
  currentUser?: { email: string; name: string; role: string };
}

/** Um módulo do sistema mostrado no painel */
interface ModuloCard {
  chave: ChaveModulo;
  /** Tela que abre ao clicar */
  view: ActiveView;
  titulo: string;
  descricao: string;
  icon: React.ElementType;
  cor: string;
  bg: string;
  borda: string;
  /** Telas que aparecem na lateral depois de entrar */
  telas: string[];
  emBreve?: boolean;
}

const MODULOS: ModuloCard[] = [
  {
    chave: 'administrativo',
    view: 'administrativo',
    titulo: 'ADMINISTRATIVO',
    descricao: 'Admissões, quadro de efetivo e alocação de colaboradores em obras.',
    icon: Sliders,
    cor: '#176B87', bg: '#E8F3F6', borda: '#C6E3EB',
    telas: ['Admissões', 'Efetivo Geral', 'Efetivo por Obra'],
  },
  {
    chave: 'documentacoes',
    view: 'documentos',
    titulo: 'DOCUMENTAÇÕES',
    descricao: 'Documentos por colaborador, controle de vencimentos e pendências obrigatórias.',
    icon: FolderOpen,
    cor: '#7C3AED', bg: '#EDE9FE', borda: '#DDD6FE',
    telas: ['Documentos'],
  },
  {
    chave: 'seguranca',
    view: 'seguranca',
    titulo: 'SEGURANÇA',
    descricao: 'Gestão de EPIs, treinamentos e normas regulamentadoras.',
    icon: HardHat,
    cor: '#D97706', bg: '#FEF3C7', borda: '#FDE68A',
    telas: [],
    emBreve: true,
  },
  {
    chave: 'almoxarifado',
    view: 'almoxarifado',
    titulo: 'ALMOXARIFADO',
    descricao: 'Estoque de materiais, fornecedores, entradas e saídas.',
    icon: Package,
    cor: '#159A72', bg: '#E8F6F1', borda: '#B8E8D9',
    telas: [],
    emBreve: true,
  },
];

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
                  {(selectedEmpresa.status || 'ativa').toUpperCase()}
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

      {/* ─────────────────────────────────────────────────────────
          OS 4 MÓDULOS DO SISTEMA
          Ao clicar, a barra lateral passa a mostrar as telas
          daquele módulo. Para trocar, volta-se aqui.
          Para adicionar um módulo, basta acrescentar ao array.
         ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {MODULOS.map(mod => {
          const Icone = mod.icon;
          const disponivel = !mod.emBreve;

          return (
            <div
              key={mod.chave}
              id={`card-modulo-${mod.chave}`}
              onClick={disponivel ? () => onSelectModule(mod.view) : undefined}
              role={disponivel ? 'button' : undefined}
              tabIndex={disponivel ? 0 : undefined}
              onKeyDown={
                disponivel
                  ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectModule(mod.view); } }
                  : undefined
              }
              className={`group relative rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                disponivel
                  ? 'bg-white border-[#DDE3E8] shadow-xs hover:shadow-md cursor-pointer'
                  : 'bg-[#F8FAFB] border-[#DDE3E8] opacity-70 cursor-not-allowed select-none'
              }`}
              onMouseEnter={disponivel ? (e) => {
                e.currentTarget.style.borderColor = companyColor;
                e.currentTarget.style.boxShadow = theme.shadowLight;
              } : undefined}
              onMouseLeave={disponivel ? (e) => {
                e.currentTarget.style.borderColor = '#DDE3E8';
                e.currentTarget.style.boxShadow = 'none';
              } : undefined}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-2xs"
                    style={
                      disponivel
                        ? { backgroundColor: mod.bg, borderColor: mod.borda, color: mod.cor }
                        : { backgroundColor: '#FFFFFF', borderColor: '#DDE3E8', color: '#8995A1' }
                    }
                  >
                    <Icone className="w-6 h-6" />
                  </div>

                  {disponivel ? (
                    <span className="bg-[#E8F6F1] text-[#159A72] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#B8E8D9] uppercase tracking-wider">
                      Ativo
                    </span>
                  ) : (
                    <span className="bg-[#F4F6F8] text-[#8995A1] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#DDE3E8] uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Em breve
                    </span>
                  )}
                </div>

                <h2 className={`text-base font-bold ${disponivel ? 'text-[#17212B]' : 'text-[#687582]'}`}>
                  {mod.titulo}
                </h2>
                <p className={`text-xs mt-2 leading-relaxed ${disponivel ? 'text-[#687582]' : 'text-[#8995A1]'}`}>
                  {mod.descricao}
                </p>

                {/* O que tem dentro do módulo */}
                {disponivel && mod.telas.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {mod.telas.map(tela => (
                      <li key={tela} className="flex items-center gap-2 text-[11px] text-[#687582]">
                        <span
                          className="w-1 h-1 rounded-full shrink-0"
                          style={{ backgroundColor: mod.cor }}
                        />
                        {tela}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-[#DDE3E8] flex items-center justify-between text-xs font-semibold">
                {disponivel ? (
                  <>
                    <span style={{ color: mod.cor }}>Acessar</span>
                    <ArrowRight
                      className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                      style={{ color: mod.cor }}
                    />
                  </>
                ) : (
                  <span className="text-[#8995A1]">Módulo em desenvolvimento</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
