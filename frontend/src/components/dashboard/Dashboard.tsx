import React from 'react';
import { useEffect, useState } from 'react';
import { ArrowRight, Lock, RefreshCw, Crown, ShieldCheck, Sliders, FolderOpen, HardHat, Package, Users, Building2, Activity, Shield } from 'lucide-react';
import { fetchDashboardResumo, type DashboardResumo } from '../../services/api';
import { ActiveView, ChaveModulo, Empresa } from '../../types';
import { moduloVisivel, podeNaTela } from '../../utils/permissoes';

interface DashboardProps {
  onSelectModule: (view: ActiveView) => void;
  selectedEmpresa?: Empresa | null;
  onSwitchEmpresa?: () => void;
  currentUser?: { email: string; name: string; role: string };
  /** Permissões do cargo — módulos sem "visualizar" não aparecem */
  permissoes?: import('../../types').PermissoesUsuario | null;
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
  /** Telas que aparecem na lateral depois de entrar (com a chave de permissão) */
  telas: Array<{ nome: string; chave: string }>;
  emBreve?: boolean;
}

const MODULOS: ModuloCard[] = [
  {
    chave: 'administrativo',
    view: 'administrativo',
    titulo: 'ADMINISTRATIVO',
    descricao: 'Admissões, quadro de efetivo e alocação de colaboradores em obras.',
    icon: Sliders,
    cor: '#3B82F6', bg: '#0F1E3A', borda: '#1E3A66',
    telas: [
      { nome: 'Admissões', chave: 'administrativo.admissoes' },
      { nome: 'Efetivo Geral', chave: 'administrativo.efetivo' },
      { nome: 'Efetivo por Obra', chave: 'administrativo.efetivoObra' },
    ],
  },
  {
    chave: 'documentacoes',
    view: 'documentos',
    titulo: 'DOCUMENTAÇÕES',
    descricao: 'Documentos por colaborador, vencimentos e exigências por função.',
    icon: FolderOpen,
    cor: '#F97316', bg: '#2A1608', borda: '#4A2A10',
    telas: [
      { nome: 'Documentos', chave: 'documentacao.documentos' },
      { nome: 'Tipos de Documentos', chave: 'documentacao.tipos' },
      { nome: 'Documentos por Função', chave: 'documentacao.porFuncao' },
    ],
  },
  {
    chave: 'seguranca',
    view: 'seguranca',
    titulo: 'SEGURANÇA',
    descricao: 'Gerar documentos de EPI e manter os kits de cada função.',
    icon: HardHat,
    cor: '#8B5CF6', bg: '#1A1433', borda: '#2E2458',
    telas: [
      { nome: 'Ficha de EPI', chave: 'seguranca.epis' },
    ],
  },
  {
    chave: 'almoxarifado',
    view: 'almoxarifado',
    titulo: 'ALMOXARIFADO',
    descricao: 'Estoque de materiais, fornecedores, entradas e saídas.',
    icon: Package,
    cor: '#10B981', bg: '#0B2620', borda: '#174A3D',
    telas: [],
    emBreve: true,
  },
];

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectModule,
  selectedEmpresa,
  onSwitchEmpresa,
  currentUser,
  permissoes,
}) => {
  const companyColor = selectedEmpresa?.corPrimaria || '#176B87';
  const isMasterAdmin = !!permissoes?.master;

  // Indicadores reais, vindos do banco (nada fixo)
  const [resumo, setResumo] = useState<DashboardResumo | null>(null);
  const [erroResumo, setErroResumo] = useState(false);
  useEffect(() => {
    let cancelado = false;
    fetchDashboardResumo()
      .then(r => { if (!cancelado) setResumo(r.data); })
      .catch(() => { if (!cancelado) setErroResumo(true); });
    return () => { cancelado = true; };
  }, [selectedEmpresa?.id]);

  /** Só lista as telas do módulo que o cargo enxerga. */
  const telasDoCard = (mod: ModuloCard) =>
    permissoes?.master
      ? mod.telas
      : mod.telas.filter(t => podeNaTela(permissoes, t.chave, 'ver'));

  const modulosVisiveis = MODULOS.filter(mod => {
    if (!permissoes) return mod.emBreve === true ? true : false; // sem resposta ainda: não mostra dado
    if (permissoes.master) return true;
    if (mod.chave === 'administrativo') return moduloVisivel(permissoes, 'administrativo');
    if (mod.chave === 'documentacoes') return moduloVisivel(permissoes, 'documentacao');
    return true; // módulos "em breve" continuam visíveis
  });

  const primeiroNome = (currentUser?.name || '').split(' ')[0];
  const numero = (v?: number) => (resumo ? v?.toLocaleString('pt-BR') ?? '0' : erroResumo ? '—' : '…');

  const indicadores = [
    { rotulo: 'Empresas cadastradas', valor: numero(resumo?.empresas), icone: Building2, cor: '#F97316' },
    { rotulo: 'Colaboradores ativos', valor: numero(resumo?.colaboradores_ativos), icone: Users, cor: '#3B82F6' },
    { rotulo: 'Permissões ativas', valor: numero(resumo?.permissoes_ativas), icone: Shield, cor: '#8B5CF6' },
  ];
  const operacional = resumo?.sistema === 'operacional';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7 text-[#E8EEF3]">
      {/* Boas-vindas */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#14102A] via-[#0E1726] to-[#1A0F07] p-6 sm:p-9">
        <div className="pointer-events-none absolute -top-24 -right-16 w-80 h-80 rounded-full bg-[#F97316]/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#F97316]">
              {primeiroNome ? `Olá, ${primeiroNome}` : 'MW Engenharia'}
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bem-vindo ao <span className="text-[#F97316]">INTEGRA</span>!
            </h1>
            <p className="mt-2 text-sm text-[#93A4B5] max-w-xl">
              Gerencie sua empresa de forma mais simples, rápida e inteligente.
            </p>
          </div>
          <button
            onClick={() => document.getElementById('modulos-sistema')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex items-center gap-2 self-start px-5 py-3 rounded-xl bg-[#F97316] hover:bg-[#EA6A0C] text-white text-sm font-bold shadow-sm transition-colors cursor-pointer"
          >
            Acessar módulos <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Indicadores reais */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {indicadores.map(ind => {
          const Icone = ind.icone;
          return (
            <div key={ind.rotulo} className="rounded-2xl border border-white/10 bg-[#0E1726] p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${ind.cor}1F`, color: ind.cor }}>
                <Icone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold tabular-nums">{ind.valor}</p>
                <p className="text-xs text-[#93A4B5] truncate">{ind.rotulo}</p>
              </div>
            </div>
          );
        })}
        <div className="rounded-2xl border border-white/10 bg-[#0E1726] p-5 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${operacional ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-white/5 text-[#6E8193]'}`}>
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold">{operacional ? 'Sistema operacional' : erroResumo ? 'Indisponível' : 'Verificando…'}</p>
            <p className="text-xs text-[#93A4B5] truncate">Status do sistema</p>
          </div>
        </div>
      </section>

      {/* Empresa ativa */}
      {selectedEmpresa && (
        <div className="rounded-2xl border border-white/10 bg-[#0E1726] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {selectedEmpresa.logoUrl ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex-shrink-0 flex items-center justify-center">
                <img src={selectedEmpresa.logoUrl} alt={selectedEmpresa.nome} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-white text-sm flex-shrink-0"
                style={{ backgroundColor: companyColor }}
              >
                {selectedEmpresa.nome.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold truncate">{selectedEmpresa.nome}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                  {(selectedEmpresa.status || 'ativa').toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#93A4B5] mt-0.5 font-mono truncate">
                CNPJ: {selectedEmpresa.cnpj} • {selectedEmpresa.segmento}
              </p>
            </div>
          </div>
          {onSwitchEmpresa && (
            <button
              onClick={onSwitchEmpresa}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[#E8EEF3] rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" style={{ color: companyColor }} />
              <span>Trocar de Empresa</span>
            </button>
          )}
        </div>
      )}

      {/* Painel Master */}
      {isMasterAdmin && (
        <div
          onClick={() => onSelectModule('usuarios')}
          className="group rounded-2xl border border-white/10 bg-[#0E1726] hover:border-[#F97316]/40 p-5 sm:p-6 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-amber-400/15 text-amber-300 flex-shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">Gestão de Usuários & Vínculos</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> MASTER
                </span>
              </div>
              <p className="text-xs text-[#93A4B5] mt-1">
                Crie usuários, defina credenciais e vincule cada colaborador à sua empresa.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#F97316]">
            <span>Gerenciar usuários</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      )}

      {/* Módulos do sistema: ao clicar, a lateral mostra as telas daquele módulo */}
      <section id="modulos-sistema" className="space-y-4 scroll-mt-24">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-bold">Módulos do sistema</h2>
          <p className="text-xs text-[#6E8193] hidden sm:block">Escolha um módulo para abrir suas telas</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {modulosVisiveis.map(mod => {
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
                className={`group relative rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 ${
                  disponivel
                    ? 'bg-[#0E1726] border-white/10 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer'
                    : 'bg-[#0A101B] border-white/5 opacity-60 cursor-not-allowed select-none'
                }`}
                style={disponivel ? { backgroundImage: `linear-gradient(160deg, ${mod.bg} 0%, #0E1726 70%)` } : undefined}
                onMouseEnter={disponivel ? e => { e.currentTarget.style.borderColor = `${mod.cor}66`; } : undefined}
                onMouseLeave={disponivel ? e => { e.currentTarget.style.borderColor = ''; } : undefined}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={disponivel ? { backgroundColor: `${mod.cor}22`, color: mod.cor } : { backgroundColor: '#ffffff0d', color: '#6E8193' }}
                    >
                      <Icone className="w-5 h-5" />
                    </div>
                    {disponivel ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 uppercase tracking-wider">
                        Disponível
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-[#6E8193] border border-white/10 uppercase tracking-wider flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Em breve
                      </span>
                    )}
                  </div>

                  <h3 className={`text-sm font-bold ${disponivel ? 'text-[#E8EEF3]' : 'text-[#6E8193]'}`}>{mod.titulo}</h3>
                  <p className={`text-xs mt-1.5 leading-relaxed ${disponivel ? 'text-[#93A4B5]' : 'text-[#6E8193]'}`}>
                    {mod.descricao}
                  </p>

                  {disponivel && telasDoCard(mod).length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {telasDoCard(mod).map(tela => (
                        <li key={tela.chave} className="flex items-center gap-2 text-[11px] text-[#93A4B5]">
                          <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: mod.cor }} />
                          {tela.nome}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold">
                  {disponivel ? (
                    <>
                      <span style={{ color: mod.cor }}>Acessar módulo</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: mod.cor }} />
                    </>
                  ) : (
                    <span className="text-[#6E8193]">Módulo em desenvolvimento</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
