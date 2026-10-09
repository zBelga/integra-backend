import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Users, Search, Edit2, FileText, Columns3, Check, Download } from 'lucide-react';
import { EditColaboradorModal } from './EditColaboradorModal';
import { updateColaborador, fetchColaboradores, fetchObras } from '../../services/api';
import { Colaborador, PermissoesUsuario } from '../../types';
import { applyCPFMask, formatDateBR } from '../../utils/cpfMask';
import { useDebounce } from '../../utils/debounce';
import { podeExtra } from '../../utils/permissoes';

type ObraSimples = { id: string; nome: string; codigo: string };

interface AdminSubModuleViewProps {
  section: 'efetivo' | 'desligados' | 'ferias';
  /** Lista pronta de obras. Sem ela, a tela busca sozinha. */
  obras?: ObraSimples[];
  onBackToAdmissao: () => void;
  onOpenPerfil?: (colaborador: Colaborador) => void;
  permissoes?: PermissoesUsuario | null;
}

const TELA_EFETIVO = 'administrativo.efetivo';

/**
 * Colunas que o usuário pode ligar/desligar no Efetivo.
 * Nome e o botão de editar ficam sempre visíveis.
 */
type ColunaId = 'registro' | 'funcao' | 'admissao' | 'venc1' | 'venc2' | 'rg' | 'cpf' | 'aso' | 'asoVenc' | 'obra';

const COLUNAS: { id: ColunaId; rotulo: string; curto: string }[] = [
  { id: 'registro', rotulo: 'Registro', curto: 'Registro' },
  { id: 'funcao', rotulo: 'Função', curto: 'Função' },
  { id: 'admissao', rotulo: 'Admissão', curto: 'Adm.' },
  { id: 'venc1', rotulo: '1º Vencimento', curto: '1º Venc.' },
  { id: 'venc2', rotulo: '2º Vencimento', curto: '2º Venc.' },
  { id: 'rg', rotulo: 'RG', curto: 'RG' },
  { id: 'cpf', rotulo: 'CPF', curto: 'CPF' },
  { id: 'aso', rotulo: 'ASO', curto: 'ASO' },
  { id: 'asoVenc', rotulo: 'ASO Vencimento', curto: 'ASO Venc.' },
  { id: 'obra', rotulo: 'Obra', curto: 'Obra' },
];

const CHAVE_COLUNAS = 'si_efetivo_colunas';

function lerColunasSalvas(): Record<ColunaId, boolean> {
  const padrao = Object.fromEntries(COLUNAS.map(c => [c.id, true])) as Record<ColunaId, boolean>;
  try {
    const bruto = localStorage.getItem(CHAVE_COLUNAS);
    if (!bruto) return padrao;
    const salvo = JSON.parse(bruto);
    for (const c of COLUNAS) {
      if (typeof salvo?.[c.id] === 'boolean') padrao[c.id] = salvo[c.id];
    }
  } catch {
    /* sem localStorage: segue com o padrão */
  }
  return padrao;
}

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export const AdminSubModuleView: React.FC<AdminSubModuleViewProps> = ({
  section,
  obras: obrasRecebidas,
  onBackToAdmissao,
  onOpenPerfil,
  permissoes,
}) => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  /**
   * Obras para o campo "Obra" do Editar Colaborador.
   *
   * Antes a tela dependia de receber a lista pronta de quem a abrisse — e
   * quem a abre pelo menu passava uma lista vazia, então o campo nunca tinha
   * o que mostrar. Agora ela busca por conta própria quando não recebe nada.
   */
  const [obrasCarregadas, setObrasCarregadas] = useState<ObraSimples[]>([]);
  const obras = obrasRecebidas?.length ? obrasRecebidas : obrasCarregadas;
  const [exportando, setExportando] = useState(false);
  const podeExportar = !permissoes || podeExtra(permissoes, TELA_EFETIVO, 'exportar');
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  /**
   * O que foi digitado só vira consulta depois de uma pausa. Antes, cada tecla
   * disparava uma busca no banco — digitar "SILVA" custava cinco consultas e as
   * respostas chegavam fora de ordem. O campo continua respondendo na hora.
   */
  const buscaAplicada = useDebounce(search, 350);
  const [editingCol, setEditingCol] = useState<Colaborador | null>(null);
  const [colunas, setColunas] = useState<Record<ColunaId, boolean>>(lerColunasSalvas);
  const [menuColunas, setMenuColunas] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const ver = (id: ColunaId) => colunas[id];
  const ocultas = COLUNAS.filter(c => !colunas[c.id]).length;

  const alternarColuna = (id: ColunaId) => {
    setColunas(prev => {
      const proximo = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(CHAVE_COLUNAS, JSON.stringify(proximo));
      } catch {
        /* sem localStorage: a escolha vale só nesta sessão */
      }
      return proximo;
    });
  };

  const mostrarTodasColunas = () => {
    const todas = Object.fromEntries(COLUNAS.map(c => [c.id, true])) as Record<ColunaId, boolean>;
    setColunas(todas);
    try {
      localStorage.setItem(CHAVE_COLUNAS, JSON.stringify(todas));
    } catch {
      /* sem localStorage */
    }
  };

  // Fecha o menu de colunas ao clicar fora
  useEffect(() => {
    if (!menuColunas) return;
    const aoClicar = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuColunas(false);
    };
    document.addEventListener('mousedown', aoClicar);
    return () => document.removeEventListener('mousedown', aoClicar);
  }, [menuColunas]);

  const loadColaboradores = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchColaboradores({ search: buscaAplicada, limit: 500 });
      setColaboradores(res.data);
      setTotal(res.pagination.total);
    } catch {
      setColaboradores([]);
    } finally {
      setIsLoading(false);
    }
  }, [buscaAplicada]);

  const handleSaveCol = async (id: string, data: Partial<Colaborador>) => {
    await updateColaborador(id, data);
    setEditingCol(null);
    await loadColaboradores();
  };

  /** Leva para a planilha exatamente o que está na tela, na mesma ordem. */
  const exportarPlanilha = async () => {
    if (exportando || !colaboradores.length) return;
    setExportando(true);
    try {
      const { exportEfetivoToExcel } = await import('../../utils/excelUtils');
      const hoje = new Date().toISOString().split('T')[0];
      await exportEfetivoToExcel(colaboradores, `Efetivo-${hoje}.xlsx`);
    } finally {
      setExportando(false);
    }
  };

  useEffect(() => {
    if (section === 'efetivo') loadColaboradores();
  }, [section, loadColaboradores]);

  // Busca as obras uma vez, só se não vieram prontas de quem abriu a tela.
  useEffect(() => {
    if (section !== 'efetivo' || obrasRecebidas?.length) return;
    let ativo = true;
    fetchObras()
      .then(res => { if (ativo && res.success) setObrasCarregadas(res.data); })
      .catch(() => { /* sem obras: o campo fica vazio, como antes */ });
    return () => { ativo = false; };
  }, [section, obrasRecebidas]);

  if (section === 'desligados') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onBackToAdmissao} className="flex items-center gap-1.5 text-xs text-[#687582] hover:text-[#17212B] transition-colors cursor-pointer font-medium">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h2 className="text-lg font-bold text-[#17212B]">Desligados</h2>
        </div>
        <div className="bg-white rounded-xl border border-[#DDE3E8] p-12 text-center">
          <Users className="w-12 h-12 text-[#8995A1] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#17212B]">Nenhum desligamento registrado</p>
        </div>
      </div>
    );
  }

  if (section === 'ferias') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onBackToAdmissao} className="flex items-center gap-1.5 text-xs text-[#687582] hover:text-[#17212B] transition-colors cursor-pointer font-medium">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h2 className="text-lg font-bold text-[#17212B]">Férias</h2>
        </div>
        <div className="bg-white rounded-xl border border-[#DDE3E8] p-12 text-center">
          <Users className="w-12 h-12 text-[#8995A1] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#17212B]">Nenhuma férias programada</p>
        </div>
      </div>
    );
  }

  // Efetivo
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBackToAdmissao} className="flex items-center gap-1.5 text-xs text-[#687582] hover:text-[#17212B] transition-colors cursor-pointer font-medium">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div>
            <h2 className="text-lg font-bold text-[#17212B]">Efetivo</h2>
            <p className="text-xs text-[#687582]">{total} colaborador{total !== 1 ? 'es' : ''} ativo{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8995A1]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar colaborador..."
              className="pl-8 pr-3 py-2 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B87] w-52"
            />
          </div>

          {podeExportar && (
            <button
              type="button"
              onClick={exportarPlanilha}
              disabled={exportando || !colaboradores.length}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg transition-colors cursor-pointer bg-white border-[#DDE3E8] text-[#687582] hover:text-[#17212B] hover:border-[#C6CFD6] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Baixar o efetivo em planilha (.xlsx), com os filtros aplicados"
            >
              {exportando ? (
                <span className="inline-block w-3.5 h-3.5 animate-spin rounded-full border-2 border-[#176B87] border-t-transparent" aria-hidden="true" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {exportando ? 'Gerando...' : 'Exportar'}
            </button>
          )}

          {/* Escolher quais colunas aparecem */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuColunas(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg transition-colors cursor-pointer ${
                menuColunas
                  ? 'bg-[#E8F3F6] border-[#C6E3EB] text-[#176B87]'
                  : 'bg-white border-[#DDE3E8] text-[#687582] hover:text-[#17212B] hover:border-[#C6CFD6]'
              }`}
              title="Escolher colunas visíveis"
            >
              <Columns3 className="w-3.5 h-3.5" />
              Colunas
              {ocultas > 0 && (
                <span className="ml-0.5 px-1.5 py-px rounded-full bg-[#176B87] text-white text-[10px] font-bold">
                  {ocultas}
                </span>
              )}
            </button>

            {menuColunas && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#DDE3E8] rounded-xl shadow-lg z-30 overflow-hidden">
                <div className="px-3 py-2 border-b border-[#EDF1F4] flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#687582] uppercase tracking-wider">Colunas</span>
                  <button
                    type="button"
                    onClick={mostrarTodasColunas}
                    className="text-[11px] text-[#176B87] hover:underline cursor-pointer font-medium"
                  >
                    Mostrar todas
                  </button>
                </div>
                <div className="py-1">
                  {COLUNAS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => alternarColuna(c.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-left text-[#17212B] hover:bg-[#F8FAFB] transition-colors cursor-pointer"
                    >
                      <span
                        className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
                          colunas[c.id] ? 'bg-[#176B87] border-[#176B87]' : 'bg-white border-[#C6CFD6]'
                        }`}
                      >
                        {colunas[c.id] && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                      {c.rotulo}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {onOpenPerfil && (
        <p className="text-xs text-[#687582] flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          Clique no nome do colaborador para ver o perfil e gerenciar documentos
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#DDE3E8] overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#176B87] border-t-transparent" />
            <p className="mt-3 text-xs text-[#687582]">Carregando efetivo...</p>
          </div>
        ) : colaboradores.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-[#8995A1] mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[#17212B]">Nenhum colaborador no efetivo</h3>
            <p className="text-xs text-[#687582] mt-1">Contrate colaboradores na aba de Admissões.</p>
          </div>
        ) : (
          // Altura: o que sobra da tela depois do cabeçalho da página e do rodapé.
          // Quanto menor o desconto, mais linhas aparecem de uma vez.
          <div className="rolagem-visivel overflow-auto max-h-[calc(100vh-215px)] min-h-[420px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[#F8FAFB] text-[11px] font-bold text-[#687582] uppercase tracking-wider shadow-[inset_0_-1px_0_#DDE3E8]">
                  <th className="py-3 px-2 text-center bg-[#F8FAFB]">#</th>
                  {ver('registro') && <th className="py-3 px-2.5 text-center whitespace-nowrap bg-[#F8FAFB]">Registro</th>}
                  <th className="py-3 px-3 whitespace-nowrap bg-[#F8FAFB]">Nome</th>
                  {ver('funcao') && <th className="py-3 px-2.5 text-center whitespace-nowrap bg-[#F8FAFB]">Função</th>}
                  {ver('admissao') && <th className="py-3 px-2 text-center whitespace-nowrap bg-[#F8FAFB]">Adm.</th>}
                  {ver('venc1') && <th className="py-3 px-2 text-center whitespace-nowrap bg-[#F8FAFB]">1º Venc.</th>}
                  {ver('venc2') && <th className="py-3 px-2 text-center whitespace-nowrap bg-[#F8FAFB]">2º Venc.</th>}
                  {ver('rg') && <th className="py-3 px-2 text-center whitespace-nowrap bg-[#F8FAFB]">RG</th>}
                  {ver('cpf') && <th className="py-3 px-2 text-center whitespace-nowrap bg-[#F8FAFB]">CPF</th>}
                  {ver('aso') && <th className="py-3 px-2 text-center whitespace-nowrap bg-[#F8FAFB]">ASO</th>}
                  {ver('asoVenc') && <th className="py-3 px-2 text-center whitespace-nowrap bg-[#F8FAFB]">ASO Venc.</th>}
                  {ver('obra') && <th className="py-3 px-2.5 text-center whitespace-nowrap bg-[#F8FAFB]">Obra</th>}
                  {/* Editar fica por último, depois dos dados */}
                  <th className="py-3 px-2 text-center bg-[#F8FAFB]">Editar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE3E8] text-[#17212B]">
                {colaboradores.map((col, index) => {
                  const venc1 = addDays(col.data_admissao, 44);
                  const venc2 = addDays(col.data_admissao, 89);
                  const asoVenc = col.data_aso ? addDays(col.data_aso, 364) : '';

                  const today = new Date();
                  const isExpiring = (dateStr: string) => {
                    const d = new Date(dateStr + 'T00:00:00');
                    const diff = (d.getTime() - today.getTime()) / 86400000;
                    return diff >= 0 && diff <= 30;
                  };
                  const isExpired = (dateStr: string) => {
                    const d = new Date(dateStr + 'T00:00:00');
                    return d.getTime() < today.getTime();
                  };

                  const dateBadge = (dateStr: string, highlight = false) => {
                    if (!dateStr || dateStr === '—') return <span className="text-[#8995A1]">—</span>;
                    const expired = highlight && isExpired(dateStr);
                    const expiring = highlight && !expired && isExpiring(dateStr);
                    return (
                      <span className={`inline-block px-1.5 py-0.5 rounded-md border font-semibold whitespace-nowrap ${
                        expired ? 'text-[#D64550] bg-[#FDEBEC] border-[#F5B8BB]' :
                        expiring ? 'text-[#D4890A] bg-[#FEF3E0] border-[#F8D99B]' :
                        'text-[#17212B] bg-[#F8FAFB] border-[#DDE3E8]'
                      }`}>
                        {formatDateBR(dateStr)}
                      </span>
                    );
                  };

                  return (
                    <tr key={col.id} className="hover:bg-[#F8FAFB] transition-colors">
                      <td className="py-2.5 px-2 text-center text-[#8995A1] text-[11px] font-medium select-none">{index + 1}</td>
                      {ver('registro') && (
                        <td className="py-2.5 px-2.5 text-center">
                          <span className="inline-block bg-[#E8F3F6] text-[#176B87] border border-[#C6E3EB] px-2 py-0.5 rounded-md font-bold text-[11px]">
                            {col.numero_chapa}
                          </span>
                        </td>
                      )}
                      <td className="py-2.5 px-3 font-semibold max-w-[260px]">
                        {onOpenPerfil ? (
                          <button
                            onClick={() => onOpenPerfil(col)}
                            className="text-[#176B87] hover:underline cursor-pointer font-semibold text-left flex items-center gap-1.5 group max-w-full"
                            title={col.nome}
                          >
                            <span className="truncate">{col.nome}</span>
                            <FileText className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          <span className="block truncate" title={col.nome}>{col.nome}</span>
                        )}
                      </td>
                      {ver('funcao') && (
                        <td className="py-2.5 px-2.5 text-center">
                          <span
                            className="inline-block max-w-[150px] truncate align-middle bg-[#F4F6F8] border border-[#DDE3E8] px-2 py-0.5 rounded-md font-medium text-[11px] whitespace-nowrap"
                            title={col.funcao}
                          >
                            {col.funcao}
                          </span>
                        </td>
                      )}
                      {ver('admissao') && <td className="py-2.5 px-2 text-center">{dateBadge(col.data_admissao)}</td>}
                      {ver('venc1') && <td className="py-2.5 px-2 text-center">{dateBadge(venc1, true)}</td>}
                      {ver('venc2') && <td className="py-2.5 px-2 text-center">{dateBadge(venc2, true)}</td>}
                      {ver('rg') && (
                        <td className="py-2.5 px-2 text-center text-[#687582] whitespace-nowrap">
                          {col.rg || <span className="text-[#8995A1]">—</span>}
                        </td>
                      )}
                      {ver('cpf') && (
                        <td className="py-2.5 px-2 text-center font-mono text-[#687582] whitespace-nowrap text-[11px]">
                          {applyCPFMask(col.cpf)}
                        </td>
                      )}
                      {ver('aso') && (
                        <td className="py-2.5 px-2 text-center">
                          {col.data_aso ? (
                            <span className="inline-block text-[#159A72] bg-[#E8F6F1] px-1.5 py-0.5 rounded-md border border-[#B8E8D9] font-semibold whitespace-nowrap">
                              {formatDateBR(col.data_aso)}
                            </span>
                          ) : <span className="text-[#8995A1]">—</span>}
                        </td>
                      )}
                      {ver('asoVenc') && (
                        <td className="py-2.5 px-2 text-center">
                          {asoVenc ? dateBadge(asoVenc, true) : <span className="text-[#8995A1]">—</span>}
                        </td>
                      )}
                      {ver('obra') && (
                        <td className="py-2.5 px-2.5 text-center">
                          {col.obra_nome || col.obra_codigo ? (
                            <span
                              className="inline-block max-w-[170px] truncate align-middle bg-[#EEF4FF] text-[#2B4C8C] border border-[#C9DAF5] px-2 py-0.5 rounded-md font-medium text-[11px] whitespace-nowrap"
                              title={[col.obra_codigo, col.obra_nome].filter(Boolean).join(' — ')}
                            >
                              {col.obra_codigo ? `${col.obra_codigo} — ${col.obra_nome || ''}`.replace(/ — $/, '') : col.obra_nome}
                            </span>
                          ) : (
                            <span className="text-[#8995A1]">—</span>
                          )}
                        </td>
                      )}
                      {/* Editar por último */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => setEditingCol(col)}
                          className="p-1 text-[#687582] hover:text-[#176B87] hover:bg-[#E8F3F6] rounded-md transition-colors cursor-pointer"
                          title="Editar"
                          aria-label={`Editar ${col.nome}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editingCol && (
        <EditColaboradorModal
          colaborador={editingCol}
          obras={obras}
          onSave={handleSaveCol}
          onClose={() => setEditingCol(null)}
        />
      )}
    </div>
  );
};
