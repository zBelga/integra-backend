/**
 * Painel Master → Cargos & Permissões.
 *
 * Dois andares, como o modelo aprovado:
 *   módulo → Sem acesso · Escolher telas · Acesso total
 *     └── tela → ver · criar · editar · excluir + ações especiais da tela
 *                (contratar, baixar arquivo, exportar, aprovar…)
 *
 * A lista de módulos e telas vem do servidor (GET /api/permissoes/catalogo),
 * então tela nova do sistema aparece aqui sozinha, fechada para todo mundo.
 *
 * Nada aqui apaga registro: tirar uma permissão só tira o poder de fazer.
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
  Eraser,
  AlertTriangle,
  Eye,
  FilePlus2,
  Pencil,
} from 'lucide-react';
import { CargoEmpresa, Empresa, MapaTelas, ModuloCatalogo, PermissaoTela, AcaoTela } from '../../types';
import { getCompanyTheme } from '../../utils/theme';
import {
  fetchCargosByEmpresa,
  fetchCatalogoPermissoes,
  fetchPermissoesDoCargo,
  salvarPermissoesDoCargo,
  createCargo,
  deleteCargo,
} from '../../services/api';
import { ToastMessage } from '../ui/Toast';

interface PermissoesConfigViewProps {
  selectedEmpresa: Empresa | null;
  onShowToast: (toast: ToastMessage) => void;
  onNavigateToSolicitacoes?: () => void;
}

type ModoModulo = 'sem' | 'telas' | 'tudo';

const ACOES: { id: AcaoTela; label: string; Icone: React.ElementType }[] = [
  { id: 'ver', label: 'Ver', Icone: Eye },
  { id: 'criar', label: 'Criar', Icone: FilePlus2 },
  { id: 'editar', label: 'Editar', Icone: Pencil },
  { id: 'excluir', label: 'Excluir', Icone: Trash2 },
];

function telaVazia(): PermissaoTela {
  return { ver: false, criar: false, editar: false, excluir: false, extras: {} };
}

function telaCheia(mod: ModuloCatalogo, telaId: string): PermissaoTela {
  const tela = mod.telas.find(t => t.id === telaId);
  const extras: Record<string, boolean> = {};
  (tela?.extras || []).forEach(e => { extras[e.id] = true; });
  return { ver: true, criar: true, editar: true, excluir: true, extras };
}

/** Modo que a linha do módulo mostra, deduzido do que está marcado. */
function modoDoModulo(mod: ModuloCatalogo, mapa: MapaTelas): ModoModulo {
  let algum = false;
  let tudo = true;
  mod.telas.forEach(t => {
    const p = mapa[`${mod.id}.${t.id}`] || telaVazia();
    if (p.ver) algum = true;
    const semAcoes = t.semAcoes || [];
    const acoesOk = ACOES.every(a => semAcoes.includes(a.id) || p[a.id]);
    const extrasOk = (t.extras || []).every(e => p.extras?.[e.id]);
    if (!p.ver || !acoesOk || !extrasOk) tudo = false;
  });
  if (!algum) return 'sem';
  return tudo ? 'tudo' : 'telas';
}

function contarTelas(mapa: MapaTelas): number {
  return Object.values(mapa).filter(p => p?.ver).length;
}

// ─────────────────────────────────────────────────────────────
// Tabela módulo → telas
// ─────────────────────────────────────────────────────────────

const ArvorePermissoes: React.FC<{
  catalogo: ModuloCatalogo[];
  mapa: MapaTelas;
  cor: string;
  onModulo: (mod: ModuloCatalogo, modo: ModoModulo) => void;
  onTela: (mod: ModuloCatalogo, telaId: string, acao: AcaoTela) => void;
  onExtra: (mod: ModuloCatalogo, telaId: string, extraId: string) => void;
}> = ({ catalogo, mapa, cor, onModulo, onTela, onExtra }) => (
  <div>
    <div className="flex items-center px-5 py-2 border-b border-[#EEF1F4] text-[10px] font-bold uppercase tracking-wider text-[#8995A1]">
      <div className="flex-1 min-w-0">Módulo e suas telas</div>
      <div className="w-[300px] shrink-0">Acesso ao módulo</div>
      <div className="w-[176px] shrink-0 text-center">Ver · Criar · Editar · Excluir</div>
      <div className="w-[230px] shrink-0 pl-3">Ações especiais da tela</div>
    </div>

    {catalogo.map(mod => {
      const modo = modoDoModulo(mod, mapa);
      const liberadas = mod.telas.filter(t => mapa[`${mod.id}.${t.id}`]?.ver).length;

      return (
        <div key={mod.id}>
          <div className={`flex items-center px-5 py-3 border-b border-[#EEF1F4] ${modo === 'sem' ? 'bg-white' : 'bg-[#F8FAFB]'}`}>
            <div className="flex-1 min-w-0 flex items-center gap-2.5">
              <span className={`text-[10px] text-[#8995A1] transition-transform ${modo === 'sem' ? '' : 'rotate-90'}`}>▶</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#17212B] truncate">
                  {mod.nome}
                  {mod.emBreve && (
                    <span className="ml-2 px-1.5 py-0.5 bg-[#F4F6F8] text-[#8995A1] border border-[#E4E9ED] rounded text-[9px] font-bold align-middle">
                      EM BREVE
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-[#8995A1] mt-0.5 truncate">
                  {modo === 'sem'
                    ? 'Não aparece no menu desta pessoa'
                    : `${liberadas} de ${mod.telas.length} telas liberadas`}
                </p>
              </div>
            </div>

            <div className="w-[300px] shrink-0 flex gap-1.5">
              {([
                { id: 'sem' as ModoModulo, label: 'Sem acesso' },
                { id: 'telas' as ModoModulo, label: 'Escolher telas' },
                { id: 'tudo' as ModoModulo, label: 'Acesso total' },
              ]).map(op => {
                const ativo = modo === op.id;
                const perigo = op.id === 'sem' && ativo;
                return (
                  <button
                    key={op.id}
                    onClick={() => onModulo(mod, op.id)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                      perigo
                        ? 'bg-[#FDEBEC] text-[#A8323C] border-[#F5B8BB]'
                        : ativo
                          ? 'text-white border-transparent'
                          : 'bg-white text-[#17212B] border-[#DDE3E8] hover:border-[#8995A1]'
                    }`}
                    style={{ backgroundColor: ativo && !perigo ? cor : undefined }}
                  >
                    {op.label}
                  </button>
                );
              })}
            </div>

            <div className="w-[176px] shrink-0 text-center text-[11px] font-semibold text-[#687582]">
              {modo === 'tudo' ? 'tudo liberado' : modo === 'sem' ? '—' : ''}
            </div>
            <div className="w-[230px] shrink-0 text-[11px] text-[#8995A1]">
              {modo === 'tudo' ? 'inclui as ações especiais' : ''}
            </div>
          </div>

          {modo !== 'sem' && mod.telas.map(tela => {
            const chave = `${mod.id}.${tela.id}`;
            const p = mapa[chave] || telaVazia();
            const semAcoes = tela.semAcoes || [];
            return (
              <div key={chave} className="flex items-center pl-12 pr-5 py-2.5 border-b border-[#EEF1F4] bg-[#FBFCFD]">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#17212B] truncate">{tela.nome}</p>
                  <p className="text-[11px] text-[#8995A1] truncate">{tela.descricao}</p>
                </div>

                <div className="w-[300px] shrink-0" />

                <div className="w-[176px] shrink-0 flex justify-center gap-1.5">
                  {ACOES.map(acao => {
                    const indisponivel = semAcoes.includes(acao.id);
                    const ligado = !!p[acao.id];
                    const perigo = acao.id === 'excluir' && ligado;
                    return (
                      <button
                        key={acao.id}
                        onClick={() => !indisponivel && onTela(mod, tela.id, acao.id)}
                        disabled={indisponivel}
                        title={indisponivel ? `${tela.nome} não tem ${acao.label.toLowerCase()}` : `${acao.label} em ${tela.nome}`}
                        aria-label={`${acao.label} em ${tela.nome}`}
                        aria-pressed={ligado}
                        className={`w-[30px] h-[30px] rounded-lg border flex items-center justify-center transition-colors ${
                          indisponivel
                            ? 'border-dashed border-[#E4E9ED] bg-[#F8FAFB] text-[#D3DBE1] cursor-not-allowed'
                            : perigo
                              ? 'border-[#D64550] bg-[#D64550] text-white cursor-pointer'
                              : ligado
                                ? 'border-transparent text-white cursor-pointer'
                                : 'border-[#DDE3E8] bg-white text-[#C6CFD6] hover:border-[#8995A1] cursor-pointer'
                        }`}
                        style={{ backgroundColor: ligado && !perigo && !indisponivel ? cor : undefined }}
                      >
                        <acao.Icone className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>

                <div className="w-[230px] shrink-0 flex flex-wrap gap-1.5">
                  {(tela.extras || []).length === 0 ? (
                    <span className="text-[11px] text-[#C6CFD6]">—</span>
                  ) : (
                    tela.extras.map(extra => {
                      const ligado = !!p.extras?.[extra.id];
                      return (
                        <button
                          key={extra.id}
                          onClick={() => onExtra(mod, tela.id, extra.id)}
                          title={extra.descricao}
                          aria-pressed={ligado}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                            ligado
                              ? 'bg-[#E8F6F1] text-[#0F7A5A] border-[#B8E8D9]'
                              : 'bg-white text-[#8995A1] border-[#DDE3E8] hover:border-[#8995A1]'
                          }`}
                        >
                          {extra.nome}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Modal de criação
// ─────────────────────────────────────────────────────────────

const NovoCargoModal: React.FC<{
  cor: string;
  catalogo: ModuloCatalogo[];
  cargos: CargoEmpresa[];
  carregarDe: (cargoId: string) => Promise<MapaTelas>;
  onCancelar: () => void;
  onCriar: (dados: { nome: string; descricao: string; telas: MapaTelas }) => Promise<void>;
}> = ({ cor, catalogo, cargos, carregarDe, onCancelar, onCriar }) => {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [mapa, setMapa] = useState<MapaTelas>({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const aplicarModulo = (mod: ModuloCatalogo, modo: ModoModulo) => {
    setMapa(prev => {
      const novo = { ...prev };
      mod.telas.forEach(t => {
        const chave = `${mod.id}.${t.id}`;
        if (modo === 'sem') novo[chave] = telaVazia();
        else if (modo === 'tudo') novo[chave] = telaCheia(mod, t.id);
        else if (!novo[chave]?.ver) novo[chave] = { ...telaVazia(), ver: true };
      });
      return novo;
    });
  };

  const alternarTela = (mod: ModuloCatalogo, telaId: string, acao: AcaoTela) => {
    setMapa(prev => {
      const chave = `${mod.id}.${telaId}`;
      const atual = prev[chave] || telaVazia();
      let nova: PermissaoTela = { ...atual, extras: { ...atual.extras }, [acao]: !atual[acao] } as PermissaoTela;
      if (acao === 'ver' && !nova.ver) nova = telaVazia();
      if (acao !== 'ver' && nova[acao]) nova.ver = true;
      return { ...prev, [chave]: nova };
    });
  };

  const alternarExtra = (mod: ModuloCatalogo, telaId: string, extraId: string) => {
    setMapa(prev => {
      const chave = `${mod.id}.${telaId}`;
      const atual = prev[chave] || telaVazia();
      if (!atual.ver) return prev;
      return {
        ...prev,
        [chave]: { ...atual, extras: { ...atual.extras, [extraId]: !atual.extras?.[extraId] } },
      };
    });
  };

  const copiar = async (cargoId: string) => {
    if (!cargoId) return;
    try {
      setMapa(await carregarDe(cargoId));
    } catch {
      setErro('Não foi possível copiar as permissões desse cargo.');
    }
  };

  const criar = async () => {
    if (nome.trim().length < 2) return setErro('Informe o nome do cargo.');
    setSalvando(true);
    setErro('');
    try {
      await onCriar({ nome: nome.trim(), descricao: descricao.trim(), telas: mapa });
    } catch (e: any) {
      setErro(e.message || 'Não foi possível criar o cargo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1620]/60 flex items-start justify-center p-4 overflow-y-auto" onClick={onCancelar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1120px] my-8 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#DDE3E8] flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#17212B]">Novo cargo</h2>
            <p className="text-xs text-[#687582] mt-0.5">
              Nome e, na mesma tela, o acesso de cada módulo — e de cada tela dentro dele.
            </p>
          </div>
          <button onClick={onCancelar} aria-label="Fechar" className="p-1.5 text-[#687582] hover:bg-[#F4F6F8] rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="novo-cargo-nome" className="block text-[11px] font-semibold text-[#17212B] mb-1">Nome do cargo *</label>
              <input
                id="novo-cargo-nome"
                autoFocus
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex.: Técnico de Segurança"
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
            <div>
              <label htmlFor="copiar-de" className="block text-[11px] font-semibold text-[#17212B] mb-1">Copiar permissões de</label>
              <select
                id="copiar-de"
                defaultValue=""
                onChange={e => copiar(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-xl bg-white cursor-pointer"
              >
                <option value="">começar do zero</option>
                {cargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-[#DDE3E8] overflow-hidden">
            <ArvorePermissoes
              catalogo={catalogo}
              mapa={mapa}
              cor={cor}
              onModulo={aplicarModulo}
              onTela={alternarTela}
              onExtra={alternarExtra}
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
          <p className="text-[11px] text-[#687582]">{contarTelas(mapa)} telas no menu desse cargo</p>
          <div className="flex gap-2">
            <button onClick={onCancelar} className="px-4 py-2.5 text-xs font-semibold text-[#687582] bg-white border border-[#DDE3E8] rounded-xl hover:bg-[#F4F6F8] cursor-pointer">
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

  const [catalogo, setCatalogo] = useState<ModuloCatalogo[]>([]);
  const [cargos, setCargos] = useState<CargoEmpresa[]>([]);
  const [cargoId, setCargoId] = useState('');
  const [mapa, setMapa] = useState<MapaTelas>({});
  const [mapaSalvo, setMapaSalvo] = useState<MapaTelas>({});
  const [busca, setBusca] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showNovo, setShowNovo] = useState(false);

  const loadCargos = useCallback(async (selecionar?: string) => {
    setIsLoading(true);
    try {
      const [cat, cgs] = await Promise.all([
        fetchCatalogoPermissoes(),
        fetchCargosByEmpresa(selectedEmpresa?.id),
      ]);
      setCatalogo(cat.data?.modulos || []);
      if (cgs.success) {
        setCargos(cgs.data);
        setCargoId(atual => selecionar || atual || cgs.data[0]?.id || '');
      }
    } catch (err: any) {
      onShowToast({ id: Date.now().toString(), type: 'error', title: 'Erro', message: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmpresa?.id, onShowToast]);

  useEffect(() => { loadCargos(); }, [loadCargos]);

  const carregarDe = useCallback(async (id: string): Promise<MapaTelas> => {
    const res = await fetchPermissoesDoCargo(id);
    return res.data?.telas || {};
  }, []);

  /** Cargo que ainda não foi salvo neste formato (veio traduzido do antigo). */
  const [vindoDoAntigo, setVindoDoAntigo] = useState(false);

  useEffect(() => {
    if (!cargoId) return;
    let ativo = true;
    fetchPermissoesDoCargo(cargoId)
      .then(res => {
        if (!ativo) return;
        const m = res.data?.telas || {};
        setMapa(m);
        setMapaSalvo(m);
        setVindoDoAntigo(!res.data?.migrado);
      })
      .catch(() => {});
    return () => { ativo = false; };
  }, [cargoId, carregarDe]);

  const houveMudanca = useMemo(
    () => JSON.stringify(mapa) !== JSON.stringify(mapaSalvo),
    [mapa, mapaSalvo]
  );

  const aplicarModulo = (mod: ModuloCatalogo, modo: ModoModulo) => {
    setMapa(prev => {
      const novo = { ...prev };
      mod.telas.forEach(t => {
        const chave = `${mod.id}.${t.id}`;
        if (modo === 'sem') novo[chave] = telaVazia();
        else if (modo === 'tudo') novo[chave] = telaCheia(mod, t.id);
        else if (!novo[chave]?.ver) novo[chave] = { ...telaVazia(), ver: true };
      });
      return novo;
    });
  };

  const alternarTela = (mod: ModuloCatalogo, telaId: string, acao: AcaoTela) => {
    setMapa(prev => {
      const chave = `${mod.id}.${telaId}`;
      const atual = prev[chave] || telaVazia();
      let nova: PermissaoTela = { ...atual, extras: { ...atual.extras }, [acao]: !atual[acao] } as PermissaoTela;
      if (acao === 'ver' && !nova.ver) nova = telaVazia();
      if (acao !== 'ver' && nova[acao]) nova.ver = true;
      return { ...prev, [chave]: nova };
    });
  };

  const alternarExtra = (mod: ModuloCatalogo, telaId: string, extraId: string) => {
    setMapa(prev => {
      const chave = `${mod.id}.${telaId}`;
      const atual = prev[chave] || telaVazia();
      if (!atual.ver) return prev;
      return { ...prev, [chave]: { ...atual, extras: { ...atual.extras, [extraId]: !atual.extras?.[extraId] } } };
    });
  };

  const salvar = async () => {
    if (!cargoId) return;
    setIsSaving(true);
    try {
      await salvarPermissoesDoCargo(cargoId, mapa, selectedEmpresa?.id);
      setMapaSalvo(mapa);
      setVindoDoAntigo(false);
      onShowToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Permissões salvas',
        message: 'Valem na próxima vez que a pessoa abrir o sistema.',
      });
    } catch (err: any) {
      onShowToast({ id: Date.now().toString(), type: 'error', title: 'Erro ao salvar', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const criarCargo = async ({ nome, descricao, telas }: { nome: string; descricao: string; telas: MapaTelas }) => {
    const res = await createCargo({
      nome,
      descricao,
      empresa_id: selectedEmpresa?.id || '',
      status: 'ativo',
      telas,
    });
    if (res.success && res.data) {
      setShowNovo(false);
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
    if (!window.confirm(`Excluir o cargo "${nome}"?\n\nUsuários ligados a ele ficam sem acesso até você escolher outro cargo.`)) return;
    try {
      await deleteCargo(id);
      onShowToast({ id: Date.now().toString(), type: 'info', title: 'Cargo excluído', message: `"${nome}" foi removido.` });
      if (cargoId === id) setCargoId('');
      await loadCargos();
    } catch (err: any) {
      onShowToast({ id: Date.now().toString(), type: 'error', title: 'Erro', message: err.message });
    }
  };

  const cargoAtual = cargos.find(c => c.id === cargoId);
  const cargosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? cargos.filter(c => c.nome.toLowerCase().includes(q)) : cargos;
  }, [cargos, busca]);

  const telasLiberadas = contarTelas(mapa);
  const modulosLiberados = catalogo.filter(m => modoDoModulo(m, mapa) !== 'sem').length;
  const temExclusao = Object.values(mapa).some(
    (p: any) => p && p.ver && p.excluir
  );

  /** Resumo em português do que o cargo enxerga. */
  const resumo = useMemo(() => {
    const linhas: string[] = [];
    catalogo.forEach(mod => {
      mod.telas.forEach(tela => {
        const p = mapa[`${mod.id}.${tela.id}`];
        if (!p?.ver) return;
        const acoes: string[] = [];
        if (p.criar) acoes.push('criar');
        if (p.editar) acoes.push('editar');
        if (p.excluir) acoes.push('excluir');
        (tela.extras || []).forEach(e => { if (p.extras?.[e.id]) acoes.push(e.nome.toLowerCase()); });
        linhas.push(`${mod.nome} › ${tela.nome}: ${acoes.length ? `ver, ${acoes.join(', ')}` : 'apenas ver'}`);
      });
    });
    return linhas;
  }, [catalogo, mapa]);

  return (
    <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="bg-white rounded-2xl border border-[#DDE3E8] p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-2xs shrink-0"
            style={{ backgroundColor: companyColor, boxShadow: theme.shadowLight }}
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-[#17212B]">Cargos &amp; Permissões</h1>
            <p className="text-xs text-[#687582] mt-0.5">
              Primeiro o módulo, depois tela por tela — e as ações especiais de cada tela.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNovo(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white rounded-xl cursor-pointer"
          style={{ backgroundColor: companyColor }}
        >
          <Plus className="w-4 h-4" /> Novo cargo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-5 items-start">
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

          <div className="max-h-[560px] overflow-y-auto divide-y divide-[#EBF0F3]">
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
                const ativo = cargo.id === cargoId;
                return (
                  <div
                    key={cargo.id}
                    onClick={() => setCargoId(cargo.id)}
                    className={`group flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-l-[3px] ${
                      ativo ? 'bg-[#F8FAFB]' : 'border-l-transparent hover:bg-[#F8FAFB]'
                    }`}
                    style={{ borderLeftColor: ativo ? companyColor : undefined }}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#17212B] truncate" style={{ color: ativo ? companyColor : undefined }}>
                        {cargo.nome}
                      </p>
                      {cargo.descricao && <p className="text-[10px] text-[#687582] truncate mt-0.5">{cargo.descricao}</p>}
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

          <div className="px-4 py-3 border-t border-[#EEF1F4]">
            <p className="text-[11px] font-bold text-[#17212B]">Painel Master</p>
            <p className="text-[11px] text-[#8995A1] leading-snug mt-1">
              Empresas, usuários, cargos e estas permissões: exclusivo do administrador geral. Nenhum cargo libera.
            </p>
          </div>
        </div>

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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#17212B] truncate">{cargoAtual.nome}</p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        houveMudanca || vindoDoAntigo
                          ? 'bg-[#FEF3E0] text-[#A9690A] border-[#F8D99B]'
                          : 'bg-[#E8F6F1] text-[#0F7A5A] border-[#B8E8D9]'
                      }`}
                    >
                      {houveMudanca
                        ? 'alterações não salvas'
                        : vindoDoAntigo
                          ? 'confira e salve'
                          : 'salvo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#687582] mt-0.5">
                    {modulosLiberados} de {catalogo.length} módulos · {telasLiberadas} telas no menu dessa pessoa
                  </p>
                  {vindoDoAntigo && !houveMudanca && (
                    <p className="text-[11px] text-[#A9690A] mt-1">
                      Este cargo ainda está no formato antigo. O que aparece abaixo é a tradução
                      do que ele já tinha — confira e clique em Salvar para fixar.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value=""
                    onChange={async e => {
                      if (!e.target.value) return;
                      try { setMapa(await carregarDe(e.target.value)); } catch { /* ignora */ }
                    }}
                    aria-label="Copiar permissões de outro cargo"
                    className="px-3 py-2 text-[11px] font-semibold border border-[#DDE3E8] rounded-xl bg-white cursor-pointer"
                  >
                    <option value="">Copiar de outro cargo...</option>
                    {cargos.filter(c => c.id !== cargoId).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  <button
                    onClick={() => setMapa({})}
                    className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border border-[#DDE3E8] rounded-xl text-[#687582] hover:bg-white cursor-pointer"
                  >
                    <Eraser className="w-3.5 h-3.5" /> Limpar tudo
                  </button>
                  {houveMudanca && (
                    <button
                      onClick={() => setMapa(mapaSalvo)}
                      className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border border-[#DDE3E8] rounded-xl text-[#687582] hover:bg-white cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> Desfazer
                    </button>
                  )}
                  <button
                    onClick={salvar}
                    disabled={(!houveMudanca && !vindoDoAntigo) || isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: companyColor }}
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>

              <ArvorePermissoes
                catalogo={catalogo}
                mapa={mapa}
                cor={companyColor}
                onModulo={aplicarModulo}
                onTela={alternarTela}
                onExtra={alternarExtra}
              />

              <div className="px-5 py-3.5 bg-[#F7F4FE] border-t border-[#E1D9FB]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6D28D9]">
                  O que este cargo enxerga no menu
                </p>
                <div className="mt-2 grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-1">
                  {resumo.length === 0 ? (
                    <p className="text-xs text-[#687582]">Nada: o menu desta pessoa fica vazio.</p>
                  ) : (
                    resumo.map(l => <p key={l} className="text-xs text-[#17212B]">• {l}</p>)
                  )}
                </div>
              </div>

              <div
                className={`px-5 py-3 text-[11px] border-t ${
                  temExclusao
                    ? 'bg-[#FDEBEC] border-[#F5B8BB] text-[#A8323C]'
                    : 'bg-white border-[#EEF1F4] text-[#8995A1]'
                }`}
              >
                {temExclusao
                  ? 'Atenção: este cargo pode excluir. Em Documentação a exclusão é reversível (fica no histórico); em Obras e Admissões, não.'
                  : 'As alterações valem na próxima vez que a pessoa abrir o sistema. Tirar uma permissão nunca apaga registro.'}
              </div>
            </>
          )}
        </div>
      </div>

      {showNovo && (
        <NovoCargoModal
          cor={companyColor}
          catalogo={catalogo}
          cargos={cargos}
          carregarDe={carregarDe}
          onCancelar={() => setShowNovo(false)}
          onCriar={criarCargo}
        />
      )}
    </div>
  );
};
