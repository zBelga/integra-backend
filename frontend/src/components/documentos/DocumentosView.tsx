import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FolderOpen,
  Search,
  User,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  ChevronRight,
  Hash,
  Download,
  RefreshCw,
  AlertTriangle,
  X,
} from 'lucide-react';
import { ColaboradorPerfil } from './ColaboradorPerfil';
import {
  fetchColaboradores,
  fetchResumoDocumentos,
  fetchDocumentoTipos,
  fetchExigenciasResumo,
  DocumentoResumo,
} from '../../services/api';
import { Colaborador, DocumentoTipo } from '../../types';
import { situacaoDoDocumento, diasParaVencer } from '../../constants/documentosUI';
import { formatDateBR } from '../../utils/cpfMask';

interface ColaboradorComDocs {
  colaborador: Colaborador;
  documentos: DocumentoResumo[];
  totalDocs: number;
  vencidos: number;
  aVencer: number;
  pendentes: string[]; // códigos de docs obrigatórios que faltam
  carregando: boolean;
}

type FiltroStatus = 'todos' | 'vencidos' | 'a_vencer' | 'pendencias' | 'em_dia' | 'sem_docs';

const FILTROS: { key: FiltroStatus; label: string }[] = [
  { key: 'todos',      label: 'Todos' },
  { key: 'vencidos',   label: 'Com vencidos' },
  { key: 'a_vencer',   label: 'A vencer (30d)' },
  { key: 'pendencias', label: 'Com pendências' },
  { key: 'em_dia',     label: 'Em dia' },
  { key: 'sem_docs',   label: 'Sem documentos' },
];

interface DocumentosViewProps {
  selectedEmpresaId?: string;
  /** Abre Configurações → Documentos por Função */
  onConfigurarExigencias?: () => void;
}

export const DocumentosView: React.FC<DocumentosViewProps> = ({ selectedEmpresaId, onConfigurarExigencias }) => {
  const [lista, setLista] = useState<ColaboradorComDocs[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<FiltroStatus>('todos');
  const [selectedColaborador, setSelectedColaborador] = useState<Colaborador | null>(null);
  const [showAlertas, setShowAlertas] = useState(true);
  const [tiposAtivos, setTiposAtivos] = useState<DocumentoTipo[]>([]);

  const loadDados = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO o efetivo entra na lista — mesmo quem não tem nenhum documento
      // anexado e mesmo quem está sem obra vinculada.
      const res = await fetchColaboradores({ search: '', limit: 500 });
      const colaboradores: Colaborador[] = res.data || [];

      // Uma única requisição traz o resumo de todos (antes era uma por pessoa)
      let resumo: Record<string, { total: number; tipos: string[]; docs: DocumentoResumo[] }> = {};
      let tipos: DocumentoTipo[] = [];
      let exigencias: Record<string, string[]> = {};
      try {
        // 3 requisições no total, independente do tamanho do efetivo
        const [r, t, e] = await Promise.all([
          fetchResumoDocumentos(),
          fetchDocumentoTipos('ativo'),
          fetchExigenciasResumo(),
        ]);
        resumo = r.data || {};
        tipos = t.data || [];
        exigencias = e.data || {};
      } catch (e) {
        // Sem o resumo a lista ainda aparece, só sem as contagens
        console.warn('Não foi possível carregar o resumo de documentos:', e);
      }
      setTiposAtivos(tipos);

      const tipoPorId = new Map(tipos.map(t => [t.id, t]));
      const normalizar = (v?: string) => String(v || '').trim().toUpperCase();

      const lista: ColaboradorComDocs[] = colaboradores.map((col) => {
        const r = resumo[col.id];
        const docs = r?.docs || [];
        const vencimentos = docs.map(d => d.data_vencimento).filter(Boolean);
        const tiposPresentes = new Set(r?.tipos || []);

        return {
          colaborador: col,
          documentos: docs,
          totalDocs: r?.total || 0,
          vencidos: vencimentos.filter(v => situacaoDoDocumento(v) === 'vencido').length,
          aVencer: vencimentos.filter(v => situacaoDoDocumento(v) === 'a_vencer').length,
          // Pendências saem da regra da FUNÇÃO do colaborador, não de uma lista fixa.
          // Tipo desativado não entra (só os ativos vêm em `tipos`).
          pendentes: (exigencias[normalizar(col.funcao)] || [])
            .map(id => tipoPorId.get(id))
            .filter((t): t is DocumentoTipo => !!t)
            .filter(t => !tiposPresentes.has(t.codigo) && !tiposPresentes.has(t.nome))
            .map(t => t.codigo),
          carregando: false,
        };
      });

      setLista(lista);
    } catch (e) {
      console.error('Erro ao carregar colaboradores:', e);
      setLista([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadDados(); }, [loadDados]);

  // ─── Estatísticas ───
  const stats = useMemo(() => ({
    total: lista.length,
    vencidos: lista.filter(c => c.vencidos > 0).length,
    aVencer: lista.filter(c => c.vencidos === 0 && c.aVencer > 0).length,
    pendencias: lista.filter(c => c.pendentes.length > 0).length,
    emDia: lista.filter(c => c.vencidos === 0 && c.aVencer === 0 && c.pendentes.length === 0 && c.totalDocs > 0).length,
    semDocs: lista.filter(c => c.totalDocs === 0 && !c.carregando).length,
  }), [lista]);

  // ─── Alertas: documentos vencendo nos próximos 30 dias ───
  const alertas = useMemo(() => {
    const items: { colaborador: Colaborador; doc: DocumentoResumo; dias: number }[] = [];
    lista.forEach(item => {
      item.documentos.forEach(doc => {
        const st = situacaoDoDocumento(doc.data_vencimento);
        if (st === 'vencido' || st === 'a_vencer') {
          const dias = diasParaVencer(doc.data_vencimento);
          if (dias !== null) items.push({ colaborador: item.colaborador, doc, dias });
        }
      });
    });
    return items.sort((a, b) => a.dias - b.dias).slice(0, 8);
  }, [lista]);

  // ─── Filtro + busca ───
  const filtrados = useMemo(() => {
    const q = search.toLowerCase().trim();
    return lista.filter(item => {
      const { colaborador: col } = item;
      const matchBusca = !q ||
        col.nome.toLowerCase().includes(q) ||
        col.funcao?.toLowerCase().includes(q) ||
        col.numero_chapa?.toLowerCase().includes(q) ||
        col.obra_nome?.toLowerCase().includes(q);
      if (!matchBusca) return false;

      switch (filtro) {
        case 'vencidos':   return item.vencidos > 0;
        case 'a_vencer':   return item.vencidos === 0 && item.aVencer > 0;
        case 'pendencias': return item.pendentes.length > 0;
        case 'em_dia':     return item.vencidos === 0 && item.aVencer === 0 && item.pendentes.length === 0 && item.totalDocs > 0;
        case 'sem_docs':   return item.totalDocs === 0;
        default:           return true;
      }
    });
  }, [lista, search, filtro]);

  // ─── Exportar CSV ───
  const exportarCSV = () => {
    const linhas = [
      ['Chapa', 'Nome', 'Função', 'Obra', 'Total Docs', 'Vencidos', 'A Vencer', 'Pendências Obrigatórias', 'Status'].join(';'),
      ...lista.map(item => {
        const c = item.colaborador;
        const status = item.vencidos > 0 ? 'IRREGULAR'
          : item.pendentes.length > 0 ? 'PENDENTE'
          : item.aVencer > 0 ? 'ATENÇÃO'
          : item.totalDocs > 0 ? 'REGULAR' : 'SEM DOCUMENTOS';
        const pend = item.pendentes.join(', ');
        return [
          c.numero_chapa || '', c.nome, c.funcao || '', c.obra_nome || '',
          item.totalDocs, item.vencidos, item.aVencer, pend || 'Nenhuma', status,
        ].join(';');
      }),
    ].join('\n');

    const blob = new Blob(['﻿' + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documentos_status_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Tela de perfil do colaborador ───
  if (selectedColaborador) {
    return (
      <ColaboradorPerfil
        colaborador={selectedColaborador}
        onBack={() => { setSelectedColaborador(null); loadDados(); }}
        onConfigurarExigencias={onConfigurarExigencias}
      />
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#7C3AED]" />
            <h1 className="text-lg font-bold text-[#17212B]">Documentos</h1>
          </div>
          <p className="text-xs text-[#687582] mt-0.5">
            Controle de documentos, vencimentos e pendências de cada colaborador do efetivo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDados}
            title="Atualizar"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#DDE3E8] hover:border-[#176B87] text-[#17212B] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
          <button
            onClick={exportarCSV}
            disabled={lista.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#176B87] hover:bg-[#135a73] disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Cards de resumo — clicáveis como filtro */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => setFiltro('todos')}
          className={`bg-white border rounded-xl p-4 text-left transition-all cursor-pointer hover:shadow-xs ${
            filtro === 'todos' ? 'border-[#176B87] ring-2 ring-[#176B87]/20' : 'border-[#DDE3E8]'
          }`}
        >
          <p className="text-[11px] font-semibold text-[#687582] uppercase tracking-wide">Colaboradores</p>
          <p className="text-2xl font-bold text-[#17212B] mt-1">{stats.total}</p>
        </button>

        <button
          onClick={() => setFiltro('vencidos')}
          className={`bg-[#FDEBEC] border rounded-xl p-4 text-left transition-all cursor-pointer hover:shadow-xs ${
            filtro === 'vencidos' ? 'border-[#D64550] ring-2 ring-[#D64550]/20' : 'border-[#F5B8BB]'
          }`}
        >
          <p className="text-[11px] font-semibold text-[#D64550] uppercase tracking-wide flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Vencidos
          </p>
          <p className="text-2xl font-bold text-[#D64550] mt-1">{stats.vencidos}</p>
        </button>

        <button
          onClick={() => setFiltro('a_vencer')}
          className={`bg-[#FEF3E0] border rounded-xl p-4 text-left transition-all cursor-pointer hover:shadow-xs ${
            filtro === 'a_vencer' ? 'border-[#D4890A] ring-2 ring-[#D4890A]/20' : 'border-[#F8D99B]'
          }`}
        >
          <p className="text-[11px] font-semibold text-[#D4890A] uppercase tracking-wide flex items-center gap-1">
            <Clock className="w-3 h-3" /> A Vencer
          </p>
          <p className="text-2xl font-bold text-[#D4890A] mt-1">{stats.aVencer}</p>
        </button>

        <button
          onClick={() => setFiltro('pendencias')}
          className={`bg-[#EDE9FE] border rounded-xl p-4 text-left transition-all cursor-pointer hover:shadow-xs ${
            filtro === 'pendencias' ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/20' : 'border-[#DDD6FE]'
          }`}
        >
          <p className="text-[11px] font-semibold text-[#7C3AED] uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Pendências
          </p>
          <p className="text-2xl font-bold text-[#7C3AED] mt-1">{stats.pendencias}</p>
        </button>

        <button
          onClick={() => setFiltro('em_dia')}
          className={`bg-[#E8F6F1] border rounded-xl p-4 text-left transition-all cursor-pointer hover:shadow-xs ${
            filtro === 'em_dia' ? 'border-[#159A72] ring-2 ring-[#159A72]/20' : 'border-[#B8E8D9]'
          }`}
        >
          <p className="text-[11px] font-semibold text-[#159A72] uppercase tracking-wide flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Em Dia
          </p>
          <p className="text-2xl font-bold text-[#159A72] mt-1">{stats.emDia}</p>
        </button>
      </div>

      {/* Painel de alertas de vencimento */}
      {showAlertas && alertas.length > 0 && (
        <div className="bg-white border border-[#F8D99B] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#FEF3E0] border-b border-[#F8D99B]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D4890A]" />
              <h3 className="text-xs font-bold text-[#D4890A]">
                Vencimentos críticos ({alertas.length})
              </h3>
            </div>
            <button
              onClick={() => setShowAlertas(false)}
              className="p-1 text-[#D4890A] hover:bg-[#F8D99B]/40 rounded transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-[#F4F6F8]">
            {alertas.map(({ colaborador, doc, dias }) => (
              <button
                key={doc.id}
                onClick={() => setSelectedColaborador(colaborador)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#F8FAFB] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-[#8995A1] shrink-0" />
                  <span className="text-xs font-semibold text-[#17212B] truncate">{colaborador.nome}</span>
                  <span className="px-1.5 py-0.5 bg-[#F4F6F8] text-[#687582] border border-[#DDE3E8] rounded text-[10px] font-bold shrink-0">
                    {doc.tipo}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-[#687582] hidden sm:inline">
                    {formatDateBR(doc.data_vencimento)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    dias < 0
                      ? 'bg-[#FDEBEC] text-[#D64550] border border-[#F5B8BB]'
                      : 'bg-[#FEF3E0] text-[#D4890A] border border-[#F8D99B]'
                  }`}>
                    {dias < 0 ? `Vencido há ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoje' : `${dias}d`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barra de filtros + busca */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                filtro === f.key
                  ? 'bg-[#176B87] text-white border-[#176B87]'
                  : 'bg-white text-[#687582] border-[#DDE3E8] hover:border-[#176B87] hover:text-[#176B87]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8995A1]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nome, função, chapa ou obra..."
            className="pl-8 pr-3 py-2 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B87] w-full sm:w-72"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-[#DDE3E8] overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#176B87] border-t-transparent" />
            <p className="mt-3 text-xs text-[#687582]">Carregando colaboradores...</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center">
            <FolderOpen className="w-12 h-12 text-[#8995A1] mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[#17212B]">Nenhum colaborador encontrado</h3>
            <p className="text-xs text-[#687582] mt-1">
              {lista.length === 0
                ? 'Adicione colaboradores ao efetivo primeiro.'
                : 'Tente ajustar o filtro ou a busca.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              {/* Cabeçalho */}
              <div className="bg-[#F8FAFB] px-5 py-2.5 grid grid-cols-12 gap-3 text-[10px] font-bold text-[#687582] uppercase tracking-wider border-b border-[#DDE3E8]">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-3">Colaborador</div>
                <div className="col-span-2">Função / Obra</div>
                <div className="col-span-2 text-center">Documentos</div>
                <div className="col-span-3 text-center">Pendências Obrigatórias</div>
                <div className="col-span-1 text-center">Status</div>
              </div>

              <div className="divide-y divide-[#DDE3E8]">
                {filtrados.map((item, index) => {
                  const { colaborador: col, totalDocs, vencidos, aVencer, pendentes, carregando } = item;
                  return (
                    <button
                      key={col.id}
                      onClick={() => setSelectedColaborador(col)}
                      className="w-full px-5 py-3.5 grid grid-cols-12 gap-3 items-center hover:bg-[#F8FAFB] transition-colors text-left group cursor-pointer"
                    >
                      <div className="col-span-1 text-center text-[11px] text-[#8995A1] font-medium">{index + 1}</div>

                      {/* Nome */}
                      <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#E8F3F6] flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-[#176B87]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#17212B] truncate group-hover:text-[#176B87] transition-colors">
                            {col.nome}
                          </p>
                          {col.numero_chapa && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-[#176B87] font-bold">
                              <Hash className="w-2.5 h-2.5" />{col.numero_chapa}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Função / Obra */}
                      <div className="col-span-2 min-w-0">
                        <p className="text-[11px] text-[#17212B] font-medium truncate">{col.funcao}</p>
                        {col.obra_nome && <p className="text-[10px] text-[#687582] truncate">{col.obra_nome}</p>}
                      </div>

                      {/* Documentos */}
                      <div className="col-span-2 text-center">
                        {carregando ? (
                          <div className="inline-block w-3.5 h-3.5 border-2 border-[#176B87]/30 border-t-[#176B87] rounded-full animate-spin" />
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              totalDocs === 0
                                ? 'bg-[#F4F6F8] text-[#8995A1] border border-[#DDE3E8]'
                                : 'bg-[#E8F3F6] text-[#176B87] border border-[#C6E3EB]'
                            }`}>
                              <FileText className="w-2.5 h-2.5" />{totalDocs}
                            </span>
                            {vencidos > 0 && (
                              <span className="px-1.5 py-0.5 bg-[#FDEBEC] text-[#D64550] border border-[#F5B8BB] rounded-full text-[10px] font-bold">
                                {vencidos} venc.
                              </span>
                            )}
                            {aVencer > 0 && (
                              <span className="px-1.5 py-0.5 bg-[#FEF3E0] text-[#D4890A] border border-[#F8D99B] rounded-full text-[10px] font-bold">
                                {aVencer} a venc.
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Pendências */}
                      <div className="col-span-3 text-center">
                        {carregando ? (
                          <span className="text-[#8995A1] text-[11px]">—</span>
                        ) : pendentes.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#159A72]">
                            <CheckCircle className="w-3 h-3" /> Completo
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {pendentes.slice(0, 3).map(p => (
                              <span key={p} className="px-1.5 py-0.5 bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] rounded text-[9px] font-bold">
                                {p}
                              </span>
                            ))}
                            {pendentes.length > 3 && (
                              <span className="text-[9px] text-[#7C3AED] font-bold">+{pendentes.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div className="col-span-1 flex items-center justify-center gap-1">
                        {carregando ? null : vencidos > 0 ? (
                          <AlertCircle className="w-4 h-4 text-[#D64550]" title="Documentos vencidos" />
                        ) : pendentes.length > 0 ? (
                          <AlertTriangle className="w-4 h-4 text-[#7C3AED]" title="Pendências obrigatórias" />
                        ) : aVencer > 0 ? (
                          <Clock className="w-4 h-4 text-[#D4890A]" title="Documentos a vencer" />
                        ) : totalDocs > 0 ? (
                          <CheckCircle className="w-4 h-4 text-[#159A72]" title="Regular" />
                        ) : (
                          <span className="text-[#8995A1] text-[11px]">—</span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-[#8995A1] group-hover:text-[#176B87] transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé informativo */}
      {!isLoading && lista.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-[#687582] flex-wrap gap-2">
          <span>
            Exibindo {filtrados.length} de {lista.length} colaborador{lista.length !== 1 ? 'es' : ''}
          </span>
          <span>
            {tiposAtivos.length} tipos ativos no catálogo · obrigatoriedade definida por função
          </span>
        </div>
      )}
    </div>
  );
};
