/**
 * Segurança → Kits de EPI por função.
 *
 * Duas coisas, uma do lado da outra:
 *   · o kit de cada grupo ("Ajudante", "Eletricista"...) — o que a pessoa
 *     recebe quando entra;
 *   · o mapa função → grupo, para o sistema saber qual kit sugerir na ficha.
 *
 * As funções da lista vêm do próprio Efetivo: se alguém for contratado numa
 * função nova, ela aparece aqui sem ninguém precisar cadastrar nada.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft, Plus, Trash2, Save, AlertCircle, CheckCircle2, Loader2,
  Settings2, Users, Package,
} from 'lucide-react';
import {
  fetchEpiConfig, salvarKitEpi, vincularFuncaoEpi,
  criarEpiCatalogo, fetchColaboradores,
} from '../../services/api';
import type { EpiConfig, EpiItemKit, PermissoesUsuario } from '../../types';
import { podeNaTela } from '../../utils/permissoes';

const TELA = 'seguranca.epis';

function chaveFuncao(s: string): string {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
}

type ItemEditavel = Pick<EpiItemKit, 'qtde' | 'ca' | 'descricao'>;

interface Props {
  onVoltar: () => void;
  permissoes?: PermissoesUsuario | null;
}

export const KitsEpiView: React.FC<Props> = ({ onVoltar, permissoes }) => {
  const podeEditar = podeNaTela(permissoes, TELA, 'editar');

  const [config, setConfig] = useState<EpiConfig | null>(null);
  const [funcoes, setFuncoes] = useState<{ nome: string; pessoas: number }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const [grupoAtivo, setGrupoAtivo] = useState('');
  const [itens, setItens] = useState<ItemEditavel[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [novoEpi, setNovoEpi] = useState({ descricao: '', ca: '' });

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const [cfg, cols] = await Promise.all([
        fetchEpiConfig(),
        fetchColaboradores({ limit: 500 }),
      ]);
      if (cfg.success) {
        setConfig(cfg.data);
        setGrupoAtivo(atual => atual || cfg.data.grupos[0]?.id || '');
      }
      // Quantas pessoas em cada função — ajuda a priorizar o que vincular
      const conta = new Map<string, number>();
      (cols.data || []).forEach(c => {
        const f = String(c.funcao || '').trim();
        if (f) conta.set(f, (conta.get(f) || 0) + 1);
      });
      setFuncoes([...conta.entries()]
        .map(([nome, pessoas]) => ({ nome, pessoas }))
        .sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (e: any) {
      setErro(e.message || 'Não foi possível carregar os kits.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Troca de grupo: carrega o kit dele para edição
  useEffect(() => {
    const g = config?.grupos.find(x => x.id === grupoAtivo);
    setItens((g?.itens || []).map(i => ({ qtde: i.qtde, ca: i.ca, descricao: i.descricao })));
  }, [grupoAtivo, config]);

  const grupoPorFuncao = useMemo(() => {
    const m = new Map<string, string>();
    config?.mapa.forEach(v => m.set(v.chave, v.grupo_id));
    return m;
  }, [config]);

  const semKit = useMemo(
    () => funcoes.filter(f => !grupoPorFuncao.get(chaveFuncao(f.nome))).length,
    [funcoes, grupoPorFuncao]
  );

  const mudarItem = (idx: number, campo: keyof ItemEditavel, valor: string) => {
    setItens(prev => prev.map((i, n) => n !== idx ? i : {
      ...i, [campo]: campo === 'qtde' ? (Number(valor) || 0) : valor,
    }));
  };

  const salvarKit = async () => {
    const validos = itens.filter(i => String(i.descricao || '').trim());
    setErro(''); setAviso(''); setSalvando(true);
    try {
      const res = await salvarKitEpi(grupoAtivo, validos.map(i => ({
        qtde: Number(i.qtde) || 1, ca: i.ca || '', descricao: i.descricao.trim(),
      })));
      setAviso(res.message || 'Kit salvo.');
      await carregar();
    } catch (e: any) {
      setErro(e.message || 'Não foi possível salvar o kit.');
    } finally {
      setSalvando(false);
    }
  };

  const vincular = async (nomeFuncao: string, novoGrupo: string) => {
    setErro(''); setAviso('');
    // Mostra a mudança já; se o servidor recusar, o carregar() devolve a verdade
    setConfig(prev => {
      if (!prev) return prev;
      const k = chaveFuncao(nomeFuncao);
      const resto = prev.mapa.filter(m => m.chave !== k);
      return {
        ...prev,
        mapa: novoGrupo
          ? [...resto, { id: `tmp-${k}`, funcao: nomeFuncao, grupo_id: novoGrupo, chave: k }]
          : resto,
      };
    });
    try {
      await vincularFuncaoEpi(nomeFuncao, novoGrupo);
    } catch (e: any) {
      setErro(e.message || 'Não foi possível vincular a função.');
      carregar();
    }
  };

  const adicionarAoCatalogo = async () => {
    const d = novoEpi.descricao.trim();
    if (!d) return;
    setErro(''); setAviso('');
    try {
      await criarEpiCatalogo(d, novoEpi.ca.trim());
      setNovoEpi({ descricao: '', ca: '' });
      setAviso(`"${d}" entrou no catálogo.`);
      await carregar();
    } catch (e: any) {
      setErro(e.message || 'Não foi possível cadastrar o EPI.');
    }
  };

  if (!podeEditar) {
    return (
      <div className="p-6 text-sm text-[#687582]">
        Seu cargo pode gerar fichas, mas não alterar os kits de EPI.
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onVoltar}
          className="p-2 rounded-lg border border-[#DDE3E8] bg-white hover:bg-[#F4F6F8] transition-colors cursor-pointer"
          title="Voltar"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-[#17212B] flex items-center gap-2">
            <Settings2 size={18} className="text-[#176B87]" />
            Kits de EPI por função
          </h1>
          <p className="text-xs text-[#687582]">
            O que cada grupo recebe e qual função usa qual kit
          </p>
        </div>
      </div>

      {erro && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FDEBEC] border border-[#F5C6CA] text-[#9B2C33] text-xs">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{erro}</span>
        </div>
      )}
      {aviso && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#E7F6F0] border border-[#B5E4D3] text-[#0F6B4F] text-xs">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" /><span>{aviso}</span>
        </div>
      )}

      {carregando ? (
        <div className="flex items-center gap-2 text-sm text-[#687582] p-6">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          {/* ── Kit do grupo ── */}
          <div className="bg-white border border-[#DDE3E8] rounded-xl p-4">
            <h2 className="text-xs font-bold text-[#17212B] uppercase tracking-wide mb-3 flex items-center gap-2">
              <Package size={14} className="text-[#176B87]" /> Kit do grupo
            </h2>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {config?.grupos.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGrupoAtivo(g.id)}
                  className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                    grupoAtivo === g.id
                      ? 'bg-[#176B87] text-white border-[#176B87]'
                      : 'bg-white text-[#17212B] border-[#DDE3E8] hover:bg-[#F4F6F8]'
                  }`}
                >
                  {g.nome} <span className="opacity-70">{g.itens.length}</span>
                </button>
              ))}
            </div>

            <div className="rolagem-visivel overflow-auto max-h-[400px]">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-[#F4F6F8]">
                  <tr className="text-left text-[10px] uppercase tracking-wide text-[#687582]">
                    <th className="px-2 py-2 w-14">Qtde</th>
                    <th className="px-2 py-2 w-24">C.A.</th>
                    <th className="px-2 py-2">Descrição</th>
                    <th className="px-2 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {itens.map((i, idx) => (
                    <tr key={idx} className="border-t border-[#EDF1F4]">
                      <td className="px-1 py-1">
                        <input type="number" min={0} value={i.qtde}
                          onChange={e => mudarItem(idx, 'qtde', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-[#DDE3E8] rounded-md outline-none focus:border-[#176B87]" />
                      </td>
                      <td className="px-1 py-1">
                        <input value={i.ca} onChange={e => mudarItem(idx, 'ca', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-[#DDE3E8] rounded-md outline-none focus:border-[#176B87]" />
                      </td>
                      <td className="px-1 py-1">
                        <input value={i.descricao} onChange={e => mudarItem(idx, 'descricao', e.target.value)}
                          list="epi-catalogo-kits"
                          className="w-full px-2 py-1.5 text-xs border border-[#DDE3E8] rounded-md outline-none focus:border-[#176B87]" />
                      </td>
                      <td className="px-1 py-1 text-center">
                        <button
                          onClick={() => setItens(prev => prev.filter((_, n) => n !== idx))}
                          className="p-1.5 rounded-md text-[#D64550] hover:bg-[#FDEBEC] transition-colors cursor-pointer"
                          title="Tirar do kit"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="epi-catalogo-kits">
                {config?.catalogo.map(c => <option key={c.id} value={c.descricao} />)}
              </datalist>
            </div>

            <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
              <button
                onClick={() => setItens(prev => [...prev, { qtde: 1, ca: '', descricao: '' }])}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-[#176B87] border border-[#B8D4DD] bg-[#E8F3F6] hover:bg-[#d8ebf0] rounded-lg transition-colors cursor-pointer"
              >
                <Plus size={12} /> Item
              </button>
              <button
                onClick={salvarKit}
                disabled={salvando || !grupoAtivo}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#176B87] hover:bg-[#135a73] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar kit
              </button>
            </div>

            {/* Catálogo: fica junto porque é daqui que saem as sugestões acima */}
            <div className="mt-5 pt-4 border-t border-[#EDF1F4]">
              <p className="text-[11px] font-semibold text-[#687582] mb-2">
                Catálogo da empresa ({config?.catalogo.length || 0} EPIs)
              </p>
              <div className="flex gap-2 flex-wrap">
                <input
                  value={novoEpi.descricao}
                  onChange={e => setNovoEpi(v => ({ ...v, descricao: e.target.value }))}
                  placeholder="Descrição do novo EPI"
                  className="flex-1 min-w-[180px] px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg outline-none focus:border-[#176B87]"
                />
                <input
                  value={novoEpi.ca}
                  onChange={e => setNovoEpi(v => ({ ...v, ca: e.target.value }))}
                  placeholder="C.A."
                  className="w-24 px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg outline-none focus:border-[#176B87]"
                />
                <button
                  onClick={adicionarAoCatalogo}
                  className="px-3 py-2 text-[11px] font-semibold text-[#176B87] border border-[#B8D4DD] bg-[#E8F3F6] hover:bg-[#d8ebf0] rounded-lg transition-colors cursor-pointer"
                >
                  Cadastrar
                </button>
              </div>
            </div>
          </div>

          {/* ── Mapa função → grupo ── */}
          <div className="bg-white border border-[#DDE3E8] rounded-xl p-4">
            <h2 className="text-xs font-bold text-[#17212B] uppercase tracking-wide mb-1 flex items-center gap-2">
              <Users size={14} className="text-[#176B87]" /> Função → kit
            </h2>
            <p className="text-[11px] text-[#687582] mb-3">
              {funcoes.length} funções no efetivo
              {semKit > 0 && <> · <span className="text-[#8A6100] font-semibold">{semKit} sem kit</span></>}
            </p>

            <div className="rolagem-visivel overflow-auto max-h-[560px] border border-[#EDF1F4] rounded-lg">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-[#F4F6F8]">
                  <tr className="text-left text-[10px] uppercase tracking-wide text-[#687582]">
                    <th className="px-3 py-2">Função</th>
                    <th className="px-3 py-2 w-16 text-center">Pessoas</th>
                    <th className="px-3 py-2 w-44">Kit</th>
                  </tr>
                </thead>
                <tbody>
                  {funcoes.map(f => {
                    const atual = grupoPorFuncao.get(chaveFuncao(f.nome)) || '';
                    return (
                      <tr key={f.nome} className={`border-t border-[#EDF1F4] ${atual ? '' : 'bg-[#FFFCF2]'}`}>
                        <td className="px-3 py-1.5 text-[#17212B]">{f.nome}</td>
                        <td className="px-3 py-1.5 text-center text-[#687582]">{f.pessoas}</td>
                        <td className="px-2 py-1.5">
                          <select
                            value={atual}
                            onChange={e => vincular(f.nome, e.target.value)}
                            className="w-full px-2 py-1.5 text-[11px] border border-[#DDE3E8] rounded-md outline-none focus:border-[#176B87] bg-white"
                          >
                            <option value="">— sem kit —</option>
                            {config?.grupos.map(g => (
                              <option key={g.id} value={g.id}>{g.nome}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
