/**
 * Painel Master → Cargos & Permissões.
 *
 * É aqui que o administrador geral decide, cargo por cargo, o que cada pessoa
 * pode fazer em cada módulo. A matriz é a única fonte de verdade do sistema:
 * o servidor confere estas marcações em toda ação de escrita.
 *
 * O cargo já nasce com a matriz definida — o modal de criação traz os mesmos
 * controles da tela de edição, com modelos prontos e a opção de copiar de um
 * cargo existente.
 *
 * Nada aqui apaga registro: desmarcar uma ação só tira o poder de fazê-la.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Save,
  Check,
  X,
  Users,
  Loader2,
  Search,
  Copy,
  RotateCcw,
  Info,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { CargoEmpresa, CargoPermissao, Empresa } from '../../types';
import { getCompanyTheme } from '../../utils/theme';
import {
  fetchCargosByEmpresa,
  fetchPermissoes,
  updateCargoPermissoes,
  createCargo,
  deleteCargo,
} from '../../services/api';
import { ToastMessage } from '../ui/Toast';

interface PermissoesConfigViewProps {
  selectedEmpresa: Empresa | null;
  onShowToast: (toast: ToastMessage) => void;
  onNavigateToSolicitacoes?: () => void;
}

// ─────────────────────────────────────────────────────────────
// Catálogo: os módulos e as ações que a matriz controla
// ─────────────────────────────────────────────────────────────

interface ModuloInfo {
  id: string;
  nome: string;
  resumo: string;
}

const MODULOS: ModuloInfo[] = [
  { id: 'admissoes',  nome: 'Admissões',          resumo: 'Fichas de admissão, importação e contratação' },
  { id: 'efetivo',    nome: 'Efetivo',            resumo: 'Colaboradores já contratados' },
  { id: 'obras',      nome: 'Obras',              resumo: 'Cadastro das obras da empresa' },
  { id: 'documentos', nome: 'Documentação',       resumo: 'Documentos dos colaboradores, tipos e exigências' },
  { id: 'rh',         nome: 'Recursos Humanos',   resumo: 'Rotinas de RH' },
  { id: 'relatorios', nome: 'Relatórios',         resumo: 'Consultas e exportações' },
  { id: 'usuarios',   nome: 'Gestão de Usuários', resumo: 'Somente leitura: criar usuário é exclusivo do administrador geral' },
];

type Acao = 'visualizar' | 'criar' | 'editar' | 'excluir' | 'solicitar' | 'aprovar';

const ACOES: { id: Acao; label: string; ajuda: string }[] = [
  { id: 'visualizar', label: 'Ver',      ajuda: 'Abrir o módulo e consultar os registros' },
  { id: 'criar',      label: 'Criar',    ajuda: 'Cadastrar registro novo' },
  { id: 'editar',     label: 'Editar',   ajuda: 'Alterar registro existente' },
  { id: 'excluir',    label: 'Excluir',  ajuda: 'Remover registro' },
  { id: 'solicitar',  label: 'Solicitar',ajuda: 'Pedir alteração para outra pessoa aprovar' },
  { id: 'aprovar',    label: 'Aprovar',  ajuda: 'Aprovar ou recusar as solicitações deste módulo' },
];

type Matriz = Record<string, Record<Acao, boolean>>;

const VAZIO: Record<Acao, boolean> = {
  visualizar: false, criar: false, editar: false, excluir: false, solicitar: false, aprovar: false,
};

function matrizPadrao(preenche: (mod: ModuloInfo) => Record<Acao, boolean>): Matriz {
  const m: Matriz = {};
  MODULOS.forEach(mod => { m[mod.id] = preenche(mod); });
  return m;
}

/** Modelos prontos — ponto de partida, tudo ajustável depois. */
const MODELOS: { id: string; nome: string; descricao: string; montar: () => Matriz }[] = [
  {
    id: 'leitura',
    nome: 'Somente consulta',
    descricao: 'Vê tudo, não altera nada. Bom para diretoria.',
    montar: () => matrizPadrao(() => ({ ...VAZIO, visualizar: true })),
  },
  {
    id: 'operacional',
    nome: 'Operacional',
    descricao: 'Vê, cadastra e anexa; não exclui. Bom para encarregado.',
    montar: () =>
      matrizPadrao(mod => ({
        ...VAZIO,
        visualizar: true,
        solicitar: true,
        criar: ['admissoes', 'documentos'].includes(mod.id),
        editar: ['admissoes', 'documentos'].includes(mod.id),
      })),
  },
  {
    id: 'assistente',
    nome: 'Assistente (pede aprovação)',
    descricao: 'Vê e solicita alteração, sem alterar direto.',
    montar: () => matrizPadrao(() => ({ ...VAZIO, visualizar: true, solicitar: true })),
  },
  {
    id: 'gestao',
    nome: 'Gestão de RH',
    descricao: 'Controla admissões, efetivo e documentos, e aprova solicitações.',
    montar: () =>
      matrizPadrao(mod => ({
        visualizar: true,
        solicitar: true,
        criar: mod.id !== 'usuarios' && mod.id !== 'relatorios',
        editar: mod.id !== 'usuarios' && mod.id !== 'relatorios',
        excluir: ['admissoes', 'efetivo', 'documentos'].includes(mod.id),
        aprovar: ['admissoes', 'efetivo', 'obras', 'documentos', 'rh'].includes(mod.id),
      })),
  },
  {
    id: 'nada',
    nome: 'Começar do zero',
    descricao: 'Nenhuma marcação: você escolhe uma a uma.',
    montar: () => matrizPadrao(() => ({ ...VAZIO })),
  },
];

/** Ver é a base: sem ela nada mais vale; marcar outra ação acende Ver. */
function aplicarRegra(linha: Record<Acao, boolean>, acao: Acao): Record<Acao, boolean> {
  const nova = { ...linha, [acao]: !linha[acao] };
  if (acao === 'visualizar' && !nova.visualizar) {
    return { ...VAZIO };
  }
  if (nova[acao] && acao !== 'visualizar') nova.visualizar = true;
  return nova;
}

function contarLiberacoes(m: Matriz): number {
  return Object.values(m).reduce(
    (t, linha) => t + ACOES.filter(a => a.id !== 'visualizar' && linha?.[a.id]).length,
    0
  );
}

/** Frase curta do que o cargo faz, para conferência antes de salvar. */
function resumoDoCargo(m: Matriz): string[] {
  const frases: string[] = [];
  MODULOS.forEach(mod => {
    const l = m[mod.id];
    if (!l || !l.visualizar) return;
    const podeFazer = ACOES.filter(a => a.id !== 'visualizar' && l[a.id]).map(a => a.label.toLowerCase());
    frases.push(podeFazer.length ? `${mod.nome}: ver, ${podeFazer.join(', ')}` : `${mod.nome}: apenas ver`);
  });
  return frases;
}

// ─────────────────────────────────────────────────────────────
// Tabela de marcação — usada na edição e na criação
// ─────────────────────────────────────────────────────────────

const TabelaPermissoes: React.FC<{
  matriz: Matriz;
  cor: string;
  onToggle: (modulo: string, acao: Acao) => void;
  onLinhaToda: (modulo: string, ligar: boolean) => void;
  onColunaToda: (acao: Acao, ligar: boolean) => void;
}> = ({ matriz, cor, onToggle, onLinhaToda, onColunaToda }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-[#F8FAFB] text-[#687582] text-[11px] uppercase font-bold border-b border-[#DDE3E8]">
          <th className="py-3 px-5 w-full min-w-[220px]">Módulo</th>
          {ACOES.map(a => {
            const todas = MODULOS.every(m => matriz[m.id]?.[a.id]);
            return (
              <th key={a.id} className="py-2.5 px-3 text-center whitespace-nowrap" title={a.ajuda}>
                <button
                  onClick={() => onColunaToda(a.id, !todas)}
                  className="flex flex-col items-center gap-0.5 mx-auto cursor-pointer group"
                  title={`${todas ? 'Desmarcar' : 'Marcar'} ${a.label} em todos os módulos`}
                >
                  <span className="group-hover:text-[#17212B] transition-colors">{a.label}</span>
                  <span className="text-[9px] font-semibold text-[#B6C2CC] group-hover:text-[#7C3AED]">
                    {todas ? 'limpar' : 'todos'}
                  </span>
                </button>
              </th>
            );
          })}
          <th className="py-3 px-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-[#EBF0F3]">
        {MODULOS.map(mod => {
          const linha = matriz[mod.id] || { ...VAZIO };
          const tudo = ACOES.every(a => linha[a.id]);
          return (
            <tr key={mod.id} className="hover:bg-[#F9FBFC]">
              <td className="py-3 px-5">
                <p className="text-sm font-semibold text-[#17212B]">{mod.nome}</p>
                <p className="text-[11px] text-[#8995A1] mt-0.5">{mod.resumo}</p>
              </td>
              {ACOES.map(acao => (
                <td key={acao.id} className="py-3 px-3 text-center">
                  <button
                    onClick={() => onToggle(mod.id, acao.id)}
                    aria-label={`${mod.nome} — ${acao.label}`}
                    aria-pressed={linha[acao.id]}
                    title={acao.ajuda}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer mx-auto ${
                      linha[acao.id] ? 'border-transparent text-white' : 'border-[#DDE3E8] bg-white hover:border-[#8995A1]'
                    }`}
                    style={{ backgroundColor: linha[acao.id] ? cor : undefined }}
                  >
                    {linha[acao.id] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                </td>
              ))}
              <td className="py-3 px-3 text-right">
                <button
                  onClick={() => onLinhaToda(mod.id, !tudo)}
                  className="text-[10px] font-bold text-[#8995A1] hover:text-[#7C3AED] cursor-pointer whitespace-nowrap"
                >
                  {tudo ? 'limpar' : 'tudo'}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Modal de criação: nome + matriz completa, antes de existir
// ─────────────────────────────────────────────────────────────

const NovoCargoModal: React.FC<{
  cor: string;
  cargos: CargoEmpresa[];
  carregarMatrizDe: (cargoId: string) => Promise<Matriz>;
  onCancelar: () => void;
  onCriar: (dados: { nome: string; descricao: string; matriz: Matriz }) => Promise<void>;
}> = ({ cor, cargos, carregarMatrizDe, onCancelar, onCriar }) => {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [matriz, setMatriz] = useState<Matriz>(() => MODELOS[1].montar());
  const [modelo, setModelo] = useState('operacional');
  const [copiandoDe, setCopiandoDe] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const aplicarModelo = (id: string) => {
    const m = MODELOS.find(x => x.id === id);
    if (!m) return;
    setModelo(id);
    setCopiandoDe('');
    setMatriz(m.montar());
  };

  const copiarDe = async (cargoId: string) => {
    setCopiandoDe(cargoId);
    if (!cargoId) return;
    try {
      setMatriz(await carregarMatrizDe(cargoId));
      setModelo('');
    } catch {
      setErro('Não foi possível copiar as permissões desse cargo.');
    }
  };

  const criar = async () => {
    if (nome.trim().length < 2) return setErro('Informe o nome do cargo.');
    setSalvando(true);
    setErro('');
    try {
      await onCriar({ nome: nome.trim(), descricao: descricao.trim(), matriz });
    } catch (e: any) {
      setErro(e.message || 'Não foi possível criar o cargo.');
    } finally {
      setSalvando(false);
    }
  };

  const liberacoes = contarLiberacoes(matriz);

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1620]/60 flex items-start justify-center p-4 overflow-y-auto" onClick={onCancelar}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#DDE3E8] flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#17212B]">Novo cargo</h2>
            <p className="text-xs text-[#687582] mt-0.5">
              Defina o nome e, na mesma tela, exatamente o que este cargo pode fazer.
            </p>
          </div>
          <button onClick={onCancelar} aria-label="Fechar" className="p-1.5 text-[#687582] hover:bg-[#F4F6F8] rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="novo-cargo-nome" className="block text-[11px] font-semibold text-[#17212B] mb-1">
                Nome do cargo *
              </label>
              <input
                id="novo-cargo-nome"
                autoFocus
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex.: Encarregado de obra"
                className="w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#176B87]/25"
              />
            </div>
            <div>
              <label htmlFor="novo-cargo-desc" className="block text-[11px] font-semibold text-[#17212B] mb-1">
                Descrição <span className="font-normal text-[#8995A1]">(opcional)</span>
              </label>
              <input
                id="novo-cargo-desc"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Para que serve este cargo"
                className="w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#176B87]/25"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#E4E9ED] bg-[#F8FAFB] p-3.5 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#687582]">Começar a partir de</p>
            <div className="flex flex-wrap gap-2">
              {MODELOS.map(m => (
                <button
                  key={m.id}
                  onClick={() => aplicarModelo(m.id)}
                  title={m.descricao}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                    modelo === m.id ? 'text-white border-transparent' : 'bg-white text-[#17212B] border-[#DDE3E8] hover:border-[#8995A1]'
                  }`}
                  style={{ backgroundColor: modelo === m.id ? cor : undefined }}
                >
                  {m.nome}
                </button>
              ))}
            </div>
            {cargos.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Copy className="w-3.5 h-3.5 text-[#687582]" />
                <span className="text-[11px] text-[#687582]">ou copiar as permissões de</span>
                <select
                  value={copiandoDe}
                  onChange={e => copiarDe(e.target.value)}
                  className="px-2.5 py-1.5 text-[11px] border border-[#DDE3E8] rounded-lg bg-white cursor-pointer"
                >
                  <option value="">outro cargo...</option>
                  {cargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            )}
            <p className="text-[11px] text-[#8995A1]">
              O modelo é só um ponto de partida: marque e desmarque o que quiser na tabela abaixo.
            </p>
          </div>

          <div className="rounded-xl border border-[#DDE3E8] overflow-hidden">
            <TabelaPermissoes
              matriz={matriz}
              cor={cor}
              onToggle={(mod, acao) => setMatriz(p => ({ ...p, [mod]: aplicarRegra(p[mod] || { ...VAZIO }, acao) }))}
              onLinhaToda={(mod, ligar) =>
                setMatriz(p => ({
                  ...p,
                  [mod]: ligar
                    ? { visualizar: true, criar: true, editar: true, excluir: true, solicitar: true, aprovar: true }
                    : { ...VAZIO },
                }))
              }
              onColunaToda={(acao, ligar) =>
                setMatriz(p => {
                  const nova: Matriz = { ...p };
                  MODULOS.forEach(m => {
                    const linha = { ...(nova[m.id] || VAZIO), [acao]: ligar };
                    if (ligar && acao !== 'visualizar') linha.visualizar = true;
                    if (acao === 'visualizar' && !ligar) Object.assign(linha, VAZIO);
                    nova[m.id] = linha;
                  });
                  return nova;
                })
              }
            />
          </div>

          {erro && (
            <div className="flex items-center gap-2 bg-[#FDEBEC] border border-[#F5B8BB] rounded-xl px-3.5 py-2.5">
              <AlertTriangle className="w-4 h-4 text-[#D64550] shrink-0" />
              <p className="text-xs text-[#D64550]">{erro}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#DDE3E8] bg-[#F8FAFB] flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-[#687582]">
            {liberacoes === 0
              ? 'Nenhuma liberação além de consultar.'
              : `${liberacoes} liberação${liberacoes > 1 ? 'ões' : ''} além de consultar.`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancelar}
              className="px-4 py-2.5 text-xs font-semibold text-[#687582] bg-white border border-[#DDE3E8] rounded-xl hover:bg-[#F4F6F8] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={criar}
              disabled={salvando}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white rounded-xl cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: cor }}
            >
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {salvando ? 'Criando...' : 'Criar cargo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Tela
// ─────────────────────────────────────────────────────────────

export const PermissoesConfigView: React.FC<PermissoesConfigViewProps> = ({
  selectedEmpresa,
  onShowToast,
}) => {
  const companyColor = selectedEmpresa?.corPrimaria || '#176B87';
  const theme = getCompanyTheme(companyColor);

  const [cargos, setCargos] = useState<CargoEmpresa[]>([]);
  const [selectedCargoId, setSelectedCargoId] = useState('');
  const [matriz, setMatriz] = useState<Matriz>({});
  const [matrizSalva, setMatrizSalva] = useState<Matriz>({});
  const [busca, setBusca] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showNovoCargo, setShowNovoCargo] = useState(false);
  const [showResumo, setShowResumo] = useState(false);

  const loadCargos = useCallback(async (selecionar?: string) => {
    setIsLoading(true);
    try {
      const res = await fetchCargosByEmpresa(selectedEmpresa?.id);
      if (res.success) {
        setCargos(res.data);
        setSelectedCargoId(atual => selecionar || atual || res.data[0]?.id || '');
      }
    } catch (err: any) {
      onShowToast({ id: Date.now().toString(), type: 'error', title: 'Erro', message: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmpresa?.id, onShowToast]);

  useEffect(() => { loadCargos(); }, [loadCargos]);

  /** Lê a matriz de um cargo (também usada pelo "copiar de"). */
  const carregarMatrizDe = useCallback(async (cargoId: string): Promise<Matriz> => {
    const res = await fetchPermissoes({ empresa_id: selectedEmpresa?.id, cargo_id: cargoId });
    const m: Matriz = {};
    MODULOS.forEach(mod => {
      const achado = (res.data || []).find(
        (p: CargoPermissao) => p.modulo === mod.id && p.cargo_id === cargoId
      );
      m[mod.id] = {
        visualizar: Boolean(achado?.visualizar ?? true),
        criar: Boolean(achado?.criar ?? false),
        editar: Boolean(achado?.editar ?? false),
        excluir: Boolean(achado?.excluir ?? false),
        solicitar: Boolean(achado?.solicitar ?? true),
        aprovar: Boolean(achado?.aprovar ?? false),
      };
    });
    return m;
  }, [selectedEmpresa?.id]);

  useEffect(() => {
    if (!selectedCargoId) return;
    let ativo = true;
    carregarMatrizDe(selectedCargoId)
      .then(m => {
        if (!ativo) return;
        setMatriz(m);
        setMatrizSalva(m);
      })
      .catch(() => {});
    return () => { ativo = false; };
  }, [selectedCargoId, carregarMatrizDe]);

  const houveMudanca = useMemo(
    () => JSON.stringify(matriz) !== JSON.stringify(matrizSalva),
    [matriz, matrizSalva]
  );

  const salvar = async () => {
    if (!selectedCargoId) return;
    setIsSaving(true);
    try {
      const payload = MODULOS.map(mod => ({
        id: `prm-${selectedCargoId}-${mod.id}`,
        empresa_id: selectedEmpresa?.id || '',
        cargo_id: selectedCargoId,
        modulo: mod.id,
        ...(matriz[mod.id] || VAZIO),
      }));
      await updateCargoPermissoes(selectedCargoId, payload as any, selectedEmpresa?.id);
      setMatrizSalva(matriz);
      onShowToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Permissões salvas',
        message: 'Vale na próxima vez que a pessoa abrir o sistema.',
      });
    } catch (err: any) {
      onShowToast({ id: Date.now().toString(), type: 'error', title: 'Erro ao salvar', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const criarCargo = async ({ nome, descricao, matriz: nova }: { nome: string; descricao: string; matriz: Matriz }) => {
    const res = await createCargo({
      nome,
      descricao,
      empresa_id: selectedEmpresa?.id || '',
      status: 'ativo',
      permissoes: MODULOS.map(mod => ({ modulo: mod.id, ...(nova[mod.id] || VAZIO) })),
    });
    if (res.success && res.data) {
      setShowNovoCargo(false);
      onShowToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Cargo criado',
        message: `"${res.data.nome}" já está com as permissões que você marcou.`,
      });
      await loadCargos(res.data.id);
    }
  };

  const excluirCargo = async (id: string, nome: string) => {
    if (!window.confirm(`Excluir o cargo "${nome}"?\n\nUsuários ligados a ele ficam sem cargo e sem acesso até você escolher outro.`)) return;
    try {
      await deleteCargo(id);
      onShowToast({ id: Date.now().toString(), type: 'info', title: 'Cargo excluído', message: `"${nome}" foi removido.` });
      if (selectedCargoId === id) setSelectedCargoId('');
      await loadCargos();
    } catch (err: any) {
      onShowToast({ id: Date.now().toString(), type: 'error', title: 'Erro', message: err.message });
    }
  };

  const cargoAtual = cargos.find(c => c.id === selectedCargoId);
  const cargosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? cargos.filter(c => c.nome.toLowerCase().includes(q)) : cargos;
  }, [cargos, busca]);

  const aplicarModeloNoCargo = (id: string) => {
    const m = MODELOS.find(x => x.id === id);
    if (!m) return;
    setMatriz(m.montar());
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Cabeçalho */}
      <div className="bg-white rounded-2xl border border-[#DDE3E8] p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-2xs shrink-0"
            style={{ backgroundColor: companyColor, boxShadow: theme.shadowLight }}
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-[#17212B]">Cargos & Permissões</h1>
            <p className="text-xs text-[#687582] mt-0.5">
              O cargo decide o que a pessoa faz. O servidor confere estas marcações em toda ação.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNovoCargo(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white rounded-xl cursor-pointer"
          style={{ backgroundColor: companyColor }}
        >
          <Plus className="w-4 h-4" /> Novo cargo
        </button>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-[#C6E3EB] bg-[#EEF4F7] px-3.5 py-2.5">
        <Info className="w-4 h-4 text-[#176B87] shrink-0 mt-px" />
        <p className="text-[11px] text-[#17212B] leading-snug">
          Cadastrar empresa, usuário, cargo e estas permissões continuam <strong>exclusivos do administrador geral</strong> —
          nenhuma marcação aqui libera isso. Desmarcar uma ação nunca apaga registro: só tira o poder de fazê-la.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
        {/* Lista de cargos */}
        <div className="bg-white rounded-2xl border border-[#DDE3E8] shadow-xs overflow-hidden">
          <div className="p-3 border-b border-[#DDE3E8]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar cargo..."
                aria-label="Buscar cargo"
                className="w-full pl-8 pr-3 py-2 text-xs border border-[#DDE3E8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#176B87]/25"
              />
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto divide-y divide-[#EBF0F3]">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#687582]" />
              </div>
            ) : cargosFiltrados.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#687582]">
                <Users className="w-8 h-8 mx-auto mb-2 text-[#DDE3E8]" />
                Nenhum cargo encontrado.
              </div>
            ) : (
              cargosFiltrados.map(cargo => {
                const ativo = cargo.id === selectedCargoId;
                return (
                  <div
                    key={cargo.id}
                    onClick={() => setSelectedCargoId(cargo.id)}
                    className={`group flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-l-[3px] ${
                      ativo ? 'bg-[#F8FAFB]' : 'border-l-transparent hover:bg-[#F8FAFB]'
                    }`}
                    style={{ borderLeftColor: ativo ? companyColor : undefined }}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#17212B] truncate" style={{ color: ativo ? companyColor : undefined }}>
                        {cargo.nome}
                      </p>
                      {cargo.descricao && (
                        <p className="text-[10px] text-[#687582] truncate mt-0.5">{cargo.descricao}</p>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); excluirCargo(cargo.id, cargo.nome); }}
                      aria-label={`Excluir ${cargo.nome}`}
                      className="p-1 rounded ml-2 shrink-0 text-[#DDE3E8] hover:text-[#D64550] hover:bg-[#FDEBEC] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Matriz do cargo */}
        <div className="bg-white rounded-2xl border border-[#DDE3E8] shadow-xs overflow-hidden">
          {!cargoAtual ? (
            <div className="p-12 text-center">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-[#DDE3E8]" />
              <p className="text-sm font-semibold text-[#687582]">Selecione um cargo</p>
              <p className="text-xs text-[#8995A1] mt-1">ou crie um novo para definir o que ele pode fazer</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3.5 border-b border-[#DDE3E8] bg-[#F8FAFB] flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#17212B] truncate">{cargoAtual.nome}</p>
                  <p className="text-[11px] text-[#687582]">
                    {contarLiberacoes(matriz)} liberações além de consultar
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value=""
                    onChange={e => e.target.value && aplicarModeloNoCargo(e.target.value)}
                    aria-label="Aplicar modelo"
                    className="px-3 py-2 text-[11px] font-semibold border border-[#DDE3E8] rounded-xl bg-white cursor-pointer"
                  >
                    <option value="">Aplicar modelo...</option>
                    {MODELOS.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                  <button
                    onClick={() => setShowResumo(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border border-[#DDE3E8] rounded-xl text-[#17212B] hover:bg-white cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> {showResumo ? 'Ocultar resumo' : 'Ver resumo'}
                  </button>
                  {houveMudanca && (
                    <button
                      onClick={() => setMatriz(matrizSalva)}
                      className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border border-[#DDE3E8] rounded-xl text-[#687582] hover:bg-white cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Desfazer
                    </button>
                  )}
                  <button
                    onClick={salvar}
                    disabled={!houveMudanca || isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: companyColor }}
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>

              {showResumo && (
                <div className="px-5 py-3 border-b border-[#DDE3E8] bg-[#F7F4FE]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6D28D9] mb-1.5">
                    Quem tiver este cargo poderá
                  </p>
                  {resumoDoCargo(matriz).length === 0 ? (
                    <p className="text-xs text-[#687582]">Nada: o cargo não enxerga nenhum módulo.</p>
                  ) : (
                    <ul className="text-xs text-[#17212B] space-y-0.5">
                      {resumoDoCargo(matriz).map(l => <li key={l}>• {l}</li>)}
                    </ul>
                  )}
                </div>
              )}

              <TabelaPermissoes
                matriz={matriz}
                cor={companyColor}
                onToggle={(mod, acao) => setMatriz(p => ({ ...p, [mod]: aplicarRegra(p[mod] || { ...VAZIO }, acao) }))}
                onLinhaToda={(mod, ligar) =>
                  setMatriz(p => ({
                    ...p,
                    [mod]: ligar
                      ? { visualizar: true, criar: true, editar: true, excluir: true, solicitar: true, aprovar: true }
                      : { ...VAZIO },
                  }))
                }
                onColunaToda={(acao, ligar) =>
                  setMatriz(p => {
                    const nova: Matriz = { ...p };
                    MODULOS.forEach(m => {
                      const linha = { ...(nova[m.id] || VAZIO), [acao]: ligar };
                      if (ligar && acao !== 'visualizar') linha.visualizar = true;
                      if (acao === 'visualizar' && !ligar) Object.assign(linha, VAZIO);
                      nova[m.id] = linha;
                    });
                    return nova;
                  })
                }
              />

              {houveMudanca && (
                <div className="px-5 py-3 border-t border-[#DDE3E8] bg-amber-50 text-xs text-amber-800 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Alterações não salvas neste cargo.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showNovoCargo && (
        <NovoCargoModal
          cor={companyColor}
          cargos={cargos}
          carregarMatrizDe={carregarMatrizDe}
          onCancelar={() => setShowNovoCargo(false)}
          onCriar={criarCargo}
        />
      )}
    </div>
  );
};
