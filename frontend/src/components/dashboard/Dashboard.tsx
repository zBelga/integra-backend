import React from 'react';
import { useEffect, useState } from 'react';
import { ArrowRight, Lock, Sliders, FolderOpen, HardHat, Package, Users, Building2, Activity, Shield } from 'lucide-react';
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


/** Acabamento visual de cada módulo: gradiente, cor de destaque e anéis de luz */
const ESTILO_CARD: Record<ChaveModulo, { de: string; ate: string; cor: string; icone: string; anel: string; anelForte: string }> = {
  administrativo: { de: '#0A1B3D', ate: '#1E40AF', cor: '#3B82F6', icone: '#60A5FA', anel: 'rgba(59,130,246,0.18)', anelForte: 'rgba(96,165,250,0.45)' },
  documentacoes:  { de: '#0A0A0C', ate: '#B4470F', cor: '#F97316', icone: '#FB923C', anel: 'rgba(249,115,22,0.16)', anelForte: 'rgba(251,146,60,0.45)' },
  seguranca:      { de: '#1B1040', ate: '#0F1B3D', cor: '#8B5CF6', icone: '#A78BFA', anel: 'rgba(139,92,246,0.18)', anelForte: 'rgba(167,139,250,0.45)' },
  almoxarifado:   { de: '#1F2328', ate: '#065F46', cor: '#10B981', icone: '#34D399', anel: 'rgba(16,185,129,0.16)', anelForte: 'rgba(52,211,153,0.45)' },
};

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectModule,
  selectedEmpresa,
  onSwitchEmpresa,
  currentUser,
  permissoes,
}) => {

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

      {/* Módulos do sistema: ao clicar, a lateral mostra as telas daquele módulo */}
      <section id="modulos-sistema" className="space-y-4 scroll-mt-24">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-bold">Módulos do sistema</h2>
          <p className="text-xs text-[#6E8193] hidden sm:block">Escolha um módulo para abrir suas telas</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          {modulosVisiveis.map(mod => {
            const Icone = mod.icon;
            const disponivel = !mod.emBreve;
            const est = ESTILO_CARD[mod.chave];
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
                className={`group relative isolate overflow-hidden rounded-3xl border min-h-[300px] flex flex-col transition-all duration-300 ease-out ${
                  disponivel
                    ? 'border-white/10 hover:-translate-y-1.5 hover:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)] cursor-pointer'
                    : 'border-white/5 opacity-60 cursor-not-allowed select-none'
                }`}
                style={{
                  background: disponivel
                    ? `linear-gradient(155deg, ${est.de} 0%, ${est.ate} 100%)`
                    : 'linear-gradient(155deg, #0E1726 0%, #0A101B 100%)',
                  boxShadow: disponivel ? `inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px ${est.anel}` : undefined,
                }}
                onMouseEnter={disponivel ? e => { e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px ${est.anelForte}, 0 0 40px -10px ${est.cor}55`; } : undefined}
                onMouseLeave={disponivel ? e => { e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px ${est.anel}`; } : undefined}
              >
                {/* Textura sutil de fundo */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.07]"
                  style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)', backgroundSize: '18px 18px' }}
                  aria-hidden="true"
                />
                {/* Brilho de canto, mais forte no hover */}
                <div
                  className="pointer-events-none absolute -top-24 -right-20 w-64 h-64 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition-opacity duration-500"
                  style={{ backgroundColor: est.cor }}
                  aria-hidden="true"
                />
                {/* Ícone decorativo grande, quase invisível */}
                <Icone
                  className="pointer-events-none absolute -right-8 -bottom-8 w-48 h-48 opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-105 transition-all duration-500"
                  style={{ color: est.cor }}
                  aria-hidden="true"
                  strokeWidth={1}
                />

                <div className="relative p-6 flex-1 flex flex-col">
                  <div className="flex items-start justify-between">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={
                        disponivel
                          ? { backgroundColor: `${est.cor}26`, color: est.icone, boxShadow: `0 0 0 1px ${est.cor}40, 0 8px 24px -8px ${est.cor}90` }
                          : { backgroundColor: 'rgba(255,255,255,0.04)', color: '#6E8193' }
                      }
                    >
                      <Icone className="w-8 h-8" strokeWidth={1.75} />
                    </div>
                    {disponivel ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 uppercase tracking-wider backdrop-blur-sm">
                        Disponível
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 text-[#6E8193] border border-white/10 uppercase tracking-wider flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Em breve
                      </span>
                    )}
                  </div>

                  <h3 className={`mt-6 text-lg font-extrabold tracking-tight ${disponivel ? 'text-white' : 'text-[#6E8193]'}`}>
                    {mod.titulo}
                  </h3>
                  <p className={`mt-2 text-sm leading-relaxed ${disponivel ? 'text-[#C4CFDA]' : 'text-[#6E8193]'}`}>
                    {mod.descricao}
                  </p>

                  {disponivel && telasDoCard(mod).length > 0 && (
                    <ul className="mt-5 space-y-2">
                      {telasDoCard(mod).map(tela => (
                        <li key={tela.chave} className="flex items-center gap-2.5 text-xs text-[#E2E8F0]/85">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: est.icone, boxShadow: `0 0 8px ${est.icone}` }} />
                          {tela.nome}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-auto pt-6">
                    {disponivel ? (
                      <div
                        className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 group-hover:brightness-110 group-hover:shadow-xl"
                        style={{ background: `linear-gradient(90deg, ${est.cor} 0%, ${est.cor}CC 100%)`, boxShadow: `0 10px 24px -10px ${est.cor}` }}
                      >
                        <span>Acessar módulo</span>
                        <ArrowRight className="w-4.5 h-4.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center rounded-2xl px-4 py-3 text-xs font-semibold text-[#6E8193] bg-white/5 border border-white/10">
                        Módulo em desenvolvimento
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
