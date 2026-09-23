/**
 * Configurações → Documentos por Função
 *
 * Define quais documentos são obrigatórios para cada função/cargo da empresa.
 * As funções vêm do que JÁ existe no sistema (cargos cadastrados + funções dos
 * colaboradores e das admissões) — nenhuma função é criada aqui.
 *
 * Marcar/desmarcar mexe SÓ na regra. Arquivos já enviados nunca são tocados:
 * tirar a exigência apenas faz o documento parar de contar como pendência.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ListChecks,
  Search,
  Users,
  Save,
  AlertCircle,
  CheckCircle2,
  X,
  Info,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  fetchDocumentoTipos,
  fetchFuncoesEmpresa,
  fetchExigenciasResumo,
  salvarExigenciasFuncao,
} from '../../services/api';
import type { DocumentoTipo, FuncaoEmpresa } from '../../types';
import { iconeDoTipo } from '../../constants/documentosUI';

export const DocumentosPorFuncaoView: React.FC = () => {
  const [tipos, setTipos] = useState<DocumentoTipo[]>([]);
  const [funcoes, setFuncoes] = useState<FuncaoEmpresa[]>([]);
  const [exigencias, setExigencias] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [funcaoAtiva, setFuncaoAtiva] = useState<string>('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setIsLoading(true);
    setErro('');
    try {
      // 3 requisições leves, uma vez só — a matriz é montada no cliente
      const [t, f, e] = await Promise.all([
        fetchDocumentoTipos('ativo'),
        fetchFuncoesEmpresa(),
        fetchExigenciasResumo(),
      ]);
      setTipos(t.data || []);
      setFuncoes(f.data || []);
      setExigencias(e.data || {});

      const primeira = (f.data || [])[0];
      if (primeira) {
        setFuncaoAtiva(primeira.chave);
        setSelecionados(new Set((e.data || {})[primeira.chave] || []));
      }
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar as configurações.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvos = useMemo(() => new Set(exigencias[funcaoAtiva] || []), [exigencias, funcaoAtiva]);

  const houveMudanca = useMemo(() => {
    if (salvos.size !== selecionados.size) return true;
    for (const id of selecionados) if (!salvos.has(id)) return true;
    return false;
  }, [salvos, selecionados]);

  const trocarFuncao = (chave: string) => {
    if (houveMudanca && !confirm('Você tem alterações não salvas nesta função. Descartar?')) return;
    setFuncaoAtiva(chave);
    setSelecionados(new Set(exigencias[chave] || []));
    setAviso('');
  };

  const alternar = (tipoId: string) => {
    setSelecionados(prev => {
      const novo = new Set(prev);
      novo.has(tipoId) ? novo.delete(tipoId) : novo.add(tipoId);
      return novo;
    });
  };

  const salvar = async () => {
    if (!funcaoAtiva) return;
    setSalvando(true);
    setErro('');
    try {
      const ids: string[] = Array.from(selecionados);
      await salvarExigenciasFuncao(funcaoAtiva, ids);
      setExigencias(prev => ({ ...prev, [funcaoAtiva]: ids }));
      const nome = funcoes.find(f => f.chave === funcaoAtiva)?.nome || funcaoAtiva;
      setAviso(
        ids.length === 0
          ? `${nome} ficou sem documentos obrigatórios. Nenhum arquivo foi apagado.`
          : `${nome}: ${ids.length} documento(s) obrigatório(s) salvo(s).`
      );
    } catch (err: any) {
      setErro(err.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const funcoesFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return funcoes;
    return funcoes.filter(f => f.nome.toLowerCase().includes(q));
  }, [funcoes, busca]);

  const nomeFuncaoAtiva = funcoes.find(f => f.chave === funcaoAtiva)?.nome || '';
  const colaboradoresAfetados = funcoes.find(f => f.chave === funcaoAtiva)?.colaboradores || 0;

  return (
    <div className="p-5 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F7F4FE] border border-[#E1D9FB] flex items-center justify-center">
            <ListChecks className="w-5 h-5 text-[#7C3AED]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#17212B]">Documentos por Função</h1>
            <p className="text-xs text-[#687582] mt-0.5">
              Quais documentos cada função precisa entregar · {funcoes.length} {funcoes.length === 1 ? 'função' : 'funções'} no sistema
            </p>
          </div>
        </div>
        {houveMudanca && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelecionados(new Set(salvos))}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-[#DDE3E8] hover:border-[#B6C2CC] text-[#687582] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Desfazer
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {salvando ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <><Save className="w-3.5 h-3.5" /> Salvar exigências</>
              )}
            </button>
          </div>
        )}
      </header>

      <div className="flex items-start gap-2.5 rounded-xl border border-[#E1D9FB] bg-[#F7F4FE] px-3.5 py-2.5">
        <Info className="w-4 h-4 text-[#7C3AED] shrink-0 mt-px" />
        <p className="text-[11px] text-[#17212B] leading-snug">
          A regra vale para <strong>todos os colaboradores</strong> da função na empresa ativa e é aplicada na hora —
          inclusive quando alguém muda de função. Tirar a exigência de um documento{' '}
          <strong>não apaga nada</strong>: o que já foi enviado continua no histórico do colaborador.
        </p>
      </div>

      {(aviso || erro) && (
        <div
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 border ${
            erro ? 'bg-[#FDEBEC] border-[#F5B8BB]' : 'bg-[#E8F6F1] border-[#B8E8D9]'
          }`}
        >
          {erro ? <AlertCircle className="w-4 h-4 text-[#D64550] shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-[#159A72] shrink-0" />}
          <p className={`text-xs flex-1 ${erro ? 'text-[#D64550]' : 'text-[#0F7A5A]'}`}>{erro || aviso}</p>
          <button onClick={() => { setErro(''); setAviso(''); }} aria-label="Fechar aviso" className="cursor-pointer">
            <X className={`w-3.5 h-3.5 ${erro ? 'text-[#D64550]' : 'text-[#159A72]'}`} />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E4E9ED]">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-[#7C3AED] border-t-transparent" />
          <p className="mt-3 text-xs text-[#687582]">Carregando funções e catálogo...</p>
        </div>
      ) : funcoes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E4E9ED]">
          <Users className="w-11 h-11 text-[#B6C2CC] mx-auto mb-3" strokeWidth={1.4} />
          <h3 className="text-sm font-bold text-[#17212B]">Nenhuma função encontrada</h3>
          <p className="text-xs text-[#687582] mt-1 max-w-sm mx-auto">
            As funções aparecem aqui a partir dos cargos cadastrados e das funções usadas nas admissões e no efetivo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
          {/* Lista de funções */}
          <aside className="bg-white rounded-2xl border border-[#E4E9ED] overflow-hidden shadow-[0_1px_2px_rgba(23,33,43,0.04)]">
            <div className="p-3 border-b border-[#E4E9ED]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar função..."
                  aria-label="Buscar função"
                  className="w-full pl-8 pr-3 py-2 text-xs border border-[#DDE3E8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/25 focus:border-[#7C3AED]"
                />
              </div>
            </div>
            <div className="max-h-[560px] overflow-y-auto divide-y divide-[#EEF1F4]">
              {funcoesFiltradas.map(f => {
                const qtd = (exigencias[f.chave] || []).length;
                const ativa = f.chave === funcaoAtiva;
                return (
                  <button
                    key={f.chave}
                    onClick={() => trocarFuncao(f.chave)}
                    className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                      ativa ? 'bg-[#F7F4FE] border-l-[3px] border-l-[#7C3AED]' : 'hover:bg-[#F8FAFB] border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <p className={`text-xs font-semibold truncate ${ativa ? 'text-[#7C3AED]' : 'text-[#17212B]'}`}>
                      {f.nome}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[#687582]">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />{f.colaboradores}
                      </span>
                      <span className={qtd > 0 ? 'text-[#0F7A5A] font-semibold' : 'text-[#8995A1]'}>
                        {qtd > 0 ? `${qtd} obrigatório${qtd !== 1 ? 's' : ''}` : 'sem exigências'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Catálogo com as marcações */}
          <section className="bg-white rounded-2xl border border-[#E4E9ED] overflow-hidden shadow-[0_1px_2px_rgba(23,33,43,0.04)]">
            <div className="px-5 py-4 border-b border-[#E4E9ED] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[#17212B]">{nomeFuncaoAtiva || 'Selecione uma função'}</h2>
                <p className="text-[11px] text-[#687582] mt-0.5">
                  {tipos.filter(t => t.todos_colaboradores).length} básicos (todos) + {selecionados.size} específicos desta função ·{' '}
                  {colaboradoresAfetados} {colaboradoresAfetados === 1 ? 'colaborador' : 'colaboradores'} nesta função
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setSelecionados(new Set(tipos.filter(t => !t.todos_colaboradores).map(t => t.id)))}
                  className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-[#DDE3E8] text-[#687582] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors cursor-pointer"
                >
                  Marcar todos
                </button>
                <button
                  onClick={() => setSelecionados(new Set())}
                  className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-[#DDE3E8] text-[#687582] hover:border-[#B6C2CC] transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            {tipos.length === 0 ? (
              <div className="p-12 text-center">
                <ShieldCheck className="w-11 h-11 text-[#B6C2CC] mx-auto mb-3" strokeWidth={1.4} />
                <h3 className="text-sm font-bold text-[#17212B]">Nenhum tipo ativo no catálogo</h3>
                <p className="text-xs text-[#687582] mt-1">
                  Cadastre ou reative tipos em Configurações → Tipos de Documentos.
                </p>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {tipos.map(t => {
                  const Icone = iconeDoTipo(t.codigo);
                  // Básico de todos os colaboradores: sempre exigido, não se desmarca aqui
                  if (t.todos_colaboradores) {
                    return (
                      <div
                        key={t.id}
                        title="Obrigatório para todos os colaboradores. Altere em Tipos de Documentos."
                        className="flex items-start gap-3 p-3 rounded-xl border border-[#E1D9FB] bg-[#FBFAFF]"
                      >
                        <input type="checkbox" checked readOnly disabled className="mt-0.5 w-4 h-4 accent-[#7C3AED] shrink-0" />
                        <Icone className="w-5 h-5 shrink-0 mt-px text-[#7C3AED]" strokeWidth={1.7} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#17212B] truncate">{t.nome}</p>
                          <p className="text-[10px] text-[#6D28D9] font-semibold mt-0.5">Todos os colaboradores</p>
                        </div>
                      </div>
                    );
                  }
                  const marcado = selecionados.has(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        marcado
                          ? 'border-[#7C3AED] bg-[#F7F4FE]'
                          : 'border-[#E4E9ED] hover:border-[#B6C2CC] bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => alternar(t.id)}
                        className="mt-0.5 w-4 h-4 accent-[#7C3AED] cursor-pointer shrink-0"
                      />
                      <Icone
                        className={`w-5 h-5 shrink-0 mt-px ${marcado ? 'text-[#7C3AED]' : 'text-[#8995A1]'}`}
                        strokeWidth={1.7}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#17212B] truncate">{t.nome}</p>
                        <p className="text-[10px] font-mono text-[#687582] mt-0.5">
                          {t.codigo}
                          {t.tem_validade && t.validade_meses ? ` · ${t.validade_meses}m` : ''}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
