/**
 * Segurança → Gerar documentos → Ficha de EPI.
 *
 * Escolhe o colaborador, o sistema já traz nome, registro, função e obra do
 * Efetivo e sugere o kit de EPI da função dele. Tudo é editável antes de gerar:
 * a ficha pode sair com itens a mais, a menos, outro CA, outra data.
 *
 * O PDF é montado no navegador — nada é gravado no banco. A ficha é um
 * documento para imprimir e assinar, não um registro de entrega.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft, Search, FileDown, Plus, Trash2, AlertCircle, User,
  Loader2, HardHat, Settings2, CheckCircle2,
} from 'lucide-react';
import { fetchColaboradores, fetchEpiConfig } from '../../services/api';
import type { Colaborador, EpiConfig, PermissoesUsuario } from '../../types';
import { podeNaTela } from '../../utils/permissoes';
import { useDebounce } from '../../utils/debounce';
import {
  gerarFichaEpiPdf, nomeArquivoFicha, baixarBlob,
  type ItemFichaEpi,
} from '../../utils/fichaEpiPdf';

const TELA = 'seguranca.epis';

/** Mesma normalização do servidor: sem acento, maiúscula, espaço único. */
function chaveFuncao(s: string): string {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
}

function hojeIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface Props {
  onVoltar: () => void;
  onAbrirKits: () => void;
  permissoes?: PermissoesUsuario | null;
}

export const FichaEpiView: React.FC<Props> = ({ onVoltar, onAbrirKits, permissoes }) => {
  const podeGerar = podeNaTela(permissoes, TELA, 'ver');
  const podeEditarKits = podeNaTela(permissoes, TELA, 'editar');

  const [config, setConfig] = useState<EpiConfig | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [busca, setBusca] = useState('');
  const buscaAplicada = useDebounce(busca, 300);
  const [escolhido, setEscolhido] = useState<Colaborador | null>(null);

  // Campos da ficha — começam preenchidos pelo Efetivo e seguem editáveis
  const [nome, setNome] = useState('');
  const [registro, setRegistro] = useState('');
  const [funcao, setFuncao] = useState('');
  const [obra, setObra] = useState('');
  const [dataEntrega, setDataEntrega] = useState(hojeIso());
  const [grupoId, setGrupoId] = useState('');
  const [itens, setItens] = useState<ItemFichaEpi[]>([]);
  const [comVerso, setComVerso] = useState(true);
  const [linhasExtras, setLinhasExtras] = useState(2);
  const [gerando, setGerando] = useState(false);
  const [feito, setFeito] = useState('');

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [cfg, cols] = await Promise.all([
          fetchEpiConfig(),
          fetchColaboradores({ limit: 500 }),
        ]);
        if (!ativo) return;
        if (cfg.success) setConfig(cfg.data);
        setColaboradores(cols.data || []);
      } catch (e: any) {
        if (ativo) setErro(e.message || 'Não foi possível carregar os dados.');
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  const filtrados = useMemo(() => {
    const t = chaveFuncao(buscaAplicada);
    if (!t) return colaboradores.slice(0, 40);
    return colaboradores
      .filter(c =>
        chaveFuncao(c.nome).includes(t) ||
        String(c.numero_chapa || '').includes(buscaAplicada.trim()))
      .slice(0, 40);
  }, [colaboradores, buscaAplicada]);

  /** Qual grupo de EPI atende esta função, segundo o mapa. */
  const grupoDaFuncao = useCallback((f: string): string => {
    if (!config) return '';
    const k = chaveFuncao(f);
    return config.mapa.find(m => m.chave === k)?.grupo_id || '';
  }, [config]);

  const aplicarKit = useCallback((id: string) => {
    const g = config?.grupos.find(x => x.id === id);
    setItens((g?.itens || []).map(i => ({ qtde: i.qtde, ca: i.ca, descricao: i.descricao, tamanho: '' })));
  }, [config]);

  const escolher = (c: Colaborador) => {
    setEscolhido(c);
    setNome(c.nome || '');
    setRegistro(c.numero_chapa || '');
    setFuncao(c.funcao || '');
    setObra(c.obra_codigo || c.obra_nome || '');
    setFeito('');
    const g = grupoDaFuncao(c.funcao || '');
    setGrupoId(g);
    aplicarKit(g);
  };

  const trocarGrupo = (id: string) => {
    setGrupoId(id);
    aplicarKit(id);
  };

  const mudarItem = (idx: number, campo: keyof ItemFichaEpi, valor: string) => {
    setItens(prev => prev.map((i, n) => n !== idx ? i : {
      ...i,
      [campo]: campo === 'qtde' ? (Number(valor) || 0) : valor,
    }));
  };

  const gerar = async () => {
    setErro('');
    setFeito('');
    if (!nome.trim()) return setErro('A ficha precisa do nome do colaborador.');
    const validos = itens.filter(i => String(i.descricao || '').trim());
    if (!validos.length) return setErro('Inclua pelo menos um EPI na ficha.');

    setGerando(true);
    try {
      const blob = await gerarFichaEpiPdf({
        nome: nome.trim(), registro: registro.trim(), funcao: funcao.trim(),
        obra: obra.trim(), dataEntrega, comVerso, itens: validos, linhasExtras,
      });
      baixarBlob(blob, nomeArquivoFicha(registro, nome));
      setFeito(`Ficha de ${nome.trim()} gerada.`);
    } catch (e: any) {
      setErro(e.message || 'Não foi possível gerar o PDF.');
    } finally {
      setGerando(false);
    }
  };

  const nomeGrupo = config?.grupos.find(g => g.id === grupoId)?.nome || '';
  const semVinculo = !!escolhido && !grupoId;

  if (!podeGerar) {
    return (
      <div className="p-6 text-sm text-[#687582]">
        Seu cargo não tem acesso à ficha de EPI.
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onVoltar}
            className="p-2 rounded-lg border border-[#DDE3E8] bg-white hover:bg-[#F4F6F8] transition-colors cursor-pointer"
            title="Voltar aos modelos"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#17212B] flex items-center gap-2">
              <HardHat size={18} className="text-[#176B87]" />
              Ficha de Entrega de EPI
            </h1>
            <p className="text-xs text-[#687582]">FO-RH-05-V2 · gera o PDF pronto para imprimir e assinar</p>
          </div>
        </div>
        {podeEditarKits && (
          <button
            onClick={onAbrirKits}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#176B87] border border-[#B8D4DD] bg-[#E8F3F6] hover:bg-[#d8ebf0] rounded-lg transition-colors cursor-pointer"
          >
            <Settings2 size={14} />
            Kits por função
          </button>
        )}
      </div>

      {erro && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FDEBEC] border border-[#F5C6CA] text-[#9B2C33] text-xs">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}
      {feito && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#E7F6F0] border border-[#B5E4D3] text-[#0F6B4F] text-xs">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          <span>{feito}</span>
        </div>
      )}

      {carregando ? (
        <div className="flex items-center gap-2 text-sm text-[#687582] p-6">
          <Loader2 size={16} className="animate-spin" /> Carregando colaboradores e kits...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
          {/* ── Quem recebe ── */}
          <div className="bg-white border border-[#DDE3E8] rounded-xl p-4">
            <h2 className="text-xs font-bold text-[#17212B] uppercase tracking-wide mb-3">
              1. Colaborador
            </h2>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#687582]" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Nome ou registro..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-[#DDE3E8] rounded-lg outline-none focus:border-[#176B87]"
              />
            </div>
            <div className="rolagem-visivel overflow-auto max-h-[380px] border border-[#EDF1F4] rounded-lg">
              {filtrados.length === 0 && (
                <p className="p-3 text-xs text-[#687582]">Nenhum colaborador encontrado.</p>
              )}
              {filtrados.map(c => (
                <button
                  key={c.id}
                  onClick={() => escolher(c)}
                  className={`w-full text-left px-3 py-2 border-b border-[#F0F3F6] last:border-0 transition-colors cursor-pointer ${
                    escolhido?.id === c.id ? 'bg-[#E8F3F6]' : 'hover:bg-[#F7F9FB]'
                  }`}
                >
                  <p className="text-xs font-semibold text-[#17212B] truncate">{c.nome}</p>
                  <p className="text-[11px] text-[#687582] truncate">
                    {c.numero_chapa ? `${c.numero_chapa} · ` : ''}{c.funcao}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* ── A ficha ── */}
          <div className="space-y-4">
            <div className="bg-white border border-[#DDE3E8] rounded-xl p-4">
              <h2 className="text-xs font-bold text-[#17212B] uppercase tracking-wide mb-3">
                2. Dados da ficha
              </h2>
              {!escolhido && (
                <p className="flex items-center gap-2 text-xs text-[#687582] mb-3">
                  <User size={14} /> Escolha alguém na lista — ou preencha à mão, se for uma ficha avulsa.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] font-semibold text-[#687582]">Nome</span>
                  <input value={nome} onChange={e => setNome(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg outline-none focus:border-[#176B87]" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold text-[#687582]">Registro</span>
                  <input value={registro} onChange={e => setRegistro(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg outline-none focus:border-[#176B87]" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold text-[#687582]">Função</span>
                  <input value={funcao} onChange={e => setFuncao(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg outline-none focus:border-[#176B87]" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold text-[#687582]">Obra</span>
                  <input value={obra} onChange={e => setObra(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg outline-none focus:border-[#176B87]" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold text-[#687582]">Data da entrega</span>
                  <input type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg outline-none focus:border-[#176B87]" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold text-[#687582]">Kit de EPI</span>
                  <select value={grupoId} onChange={e => trocarGrupo(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg outline-none focus:border-[#176B87] bg-white">
                    <option value="">— escolher o kit —</option>
                    {config?.grupos.map(g => (
                      <option key={g.id} value={g.id}>{g.nome} ({g.itens.length} itens)</option>
                    ))}
                  </select>
                </label>
              </div>
              {semVinculo && (
                <p className="mt-3 text-[11px] text-[#8A6100] bg-[#FFF6E0] border border-[#F5DFA6] rounded-lg p-2">
                  A função <strong>{funcao || '—'}</strong> ainda não está ligada a nenhum kit.
                  Escolha o kit acima{podeEditarKits ? ' ou ligue a função em "Kits por função"' : ''}.
                </p>
              )}
              {!!nomeGrupo && !semVinculo && (
                <p className="mt-3 text-[11px] text-[#687582]">
                  Kit sugerido pela função: <strong className="text-[#176B87]">{nomeGrupo}</strong>
                </p>
              )}
            </div>

            {/* ── Itens ── */}
            <div className="bg-white border border-[#DDE3E8] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <h2 className="text-xs font-bold text-[#17212B] uppercase tracking-wide">
                  3. EPIs entregues ({itens.length})
                </h2>
                <button
                  onClick={() => setItens(prev => [...prev, { qtde: 1, ca: '', descricao: '', tamanho: '' }])}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-[#176B87] border border-[#B8D4DD] bg-[#E8F3F6] hover:bg-[#d8ebf0] rounded-lg transition-colors cursor-pointer"
                >
                  <Plus size={12} /> Item
                </button>
              </div>

              {itens.length === 0 ? (
                <p className="text-xs text-[#687582] py-4 text-center">
                  Nenhum EPI na ficha. Escolha um kit acima ou adicione item por item.
                </p>
              ) : (
                <div className="rolagem-visivel overflow-auto max-h-[420px]">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-[#F4F6F8]">
                      <tr className="text-left text-[10px] uppercase tracking-wide text-[#687582]">
                        <th className="px-2 py-2 w-14">Qtde</th>
                        <th className="px-2 py-2 w-24">C.A.</th>
                        <th className="px-2 py-2">Descrição do EPI</th>
                        <th className="px-2 py-2 w-20">Tam.</th>
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
                              list="epi-catalogo"
                              className="w-full px-2 py-1.5 text-xs border border-[#DDE3E8] rounded-md outline-none focus:border-[#176B87]" />
                          </td>
                          <td className="px-1 py-1">
                            <input value={i.tamanho || ''} onChange={e => mudarItem(idx, 'tamanho', e.target.value)}
                              placeholder="—"
                              className="w-full px-2 py-1.5 text-xs border border-[#DDE3E8] rounded-md outline-none focus:border-[#176B87]" />
                          </td>
                          <td className="px-1 py-1 text-center">
                            <button
                              onClick={() => setItens(prev => prev.filter((_, n) => n !== idx))}
                              className="p-1.5 rounded-md text-[#D64550] hover:bg-[#FDEBEC] transition-colors cursor-pointer"
                              title="Tirar da ficha"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <datalist id="epi-catalogo">
                    {config?.catalogo.map(c => <option key={c.id} value={c.descricao} />)}
                  </datalist>
                </div>
              )}
            </div>

            {/* ── Gerar ── */}
            <div className="bg-white border border-[#DDE3E8] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-[#17212B] cursor-pointer">
                  <input type="checkbox" checked={comVerso} onChange={e => setComVerso(e.target.checked)} />
                  Incluir o verso em branco (para as próximas entregas)
                </label>
                <label className="flex items-center gap-2 text-xs text-[#17212B]">
                  Linhas em branco no fim da tabela
                  <input type="number" min={0} max={10} value={linhasExtras}
                    onChange={e => setLinhasExtras(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
                    className="w-16 px-2 py-1 text-xs border border-[#DDE3E8] rounded-md outline-none focus:border-[#176B87]" />
                </label>
              </div>
              <button
                onClick={gerar}
                disabled={gerando}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#176B87] hover:bg-[#135a73] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {gerando ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                {gerando ? 'Gerando...' : 'Gerar ficha em PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
