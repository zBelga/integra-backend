/**
 * Histórico e versões anteriores de um colaborador.
 *
 * Carrega SÓ quando o usuário abre o painel (não pesa a tela de entrada).
 * Mostra:
 *  - linha do tempo: quem enviou, substituiu, excluiu ou restaurou, e quando
 *  - versões fora de uso: substituídas e excluídas, que continuam guardadas,
 *    podem ser abertas e — no caso das excluídas — restauradas.
 */
import React, { useState, useCallback } from 'react';
import {
  History,
  ChevronDown,
  Upload,
  RefreshCw,
  Trash2,
  RotateCcw,
  Eye,
  Download,
  AlertCircle,
} from 'lucide-react';
import { fetchHistoricoColaborador, restaurarDocumento } from '../../services/api';
import type { HistoricoDocumentos, Documento } from '../../types';
import { formatBytes } from '../../constants/documentosUI';
import { formatDateBR } from '../../utils/cpfMask';

interface Props {
  colaboradorId: string;
  podeRestaurar: boolean;
  /** Abre/baixa uma versão antiga usando o mesmo fluxo de URL assinada */
  onAbrir: (doc: Documento, acao: 'ver' | 'baixar') => void;
  /** Depois de restaurar, a tela recarrega os ativos */
  onRestaurado: () => void;
  /** Muda quando algo acontece na tela, para recarregar se o painel estiver aberto */
  versao: number;
}

const ACOES: Record<string, { rotulo: string; cor: string; fundo: string; Icone: React.ElementType }> = {
  enviado:     { rotulo: 'Enviado',     cor: '#176B87', fundo: '#EEF4F7', Icone: Upload },
  substituido: { rotulo: 'Substituído', cor: '#A9690A', fundo: '#FEF3E0', Icone: RefreshCw },
  excluido:    { rotulo: 'Excluído',    cor: '#A8323C', fundo: '#FDEBEC', Icone: Trash2 },
  restaurado:  { rotulo: 'Restaurado',  cor: '#0F7A5A', fundo: '#E8F6F1', Icone: RotateCcw },
};

function dataHora(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const HistoricoDocumentosPanel: React.FC<Props> = ({
  colaboradorId,
  podeRestaurar,
  onAbrir,
  onRestaurado,
  versao,
}) => {
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState<HistoricoDocumentos | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [restaurandoId, setRestaurandoId] = useState<string | null>(null);
  const [carregadoNaVersao, setCarregadoNaVersao] = useState(-1);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const res = await fetchHistoricoColaborador(colaboradorId);
      setDados(res.data);
      setCarregadoNaVersao(versao);
    } catch (e: any) {
      setErro(e.message || 'Erro ao carregar o histórico.');
    } finally {
      setCarregando(false);
    }
  }, [colaboradorId, versao]);

  const alternar = () => {
    const vaiAbrir = !aberto;
    setAberto(vaiAbrir);
    // Busca na primeira abertura, ou se algo mudou desde a última busca
    if (vaiAbrir && carregadoNaVersao !== versao) carregar();
  };

  // Painel aberto e a tela mudou (envio, exclusão...) → atualiza sozinho
  React.useEffect(() => {
    if (aberto && carregadoNaVersao !== versao && !carregando) carregar();
  }, [aberto, versao, carregadoNaVersao, carregando, carregar]);

  const restaurar = async (doc: Documento) => {
    if (!confirm(`Restaurar "${doc.nome}"?\n\nEle volta para a lista de documentos anexados.`)) return;
    setRestaurandoId(doc.id);
    try {
      await restaurarDocumento(doc.id);
      onRestaurado();
    } catch (e: any) {
      setErro(e.message || 'Não foi possível restaurar.');
    } finally {
      setRestaurandoId(null);
    }
  };

  const eventos = dados?.eventos || [];
  const versoes = dados?.versoes || [];

  return (
    <section className="bg-white rounded-2xl border border-[#E4E9ED] shadow-[0_1px_2px_rgba(23,33,43,0.04)] overflow-hidden">
      <button
        onClick={alternar}
        aria-expanded={aberto}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-[#F8FAFB] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F4F6F8] border border-[#E4E9ED] flex items-center justify-center">
            <History className="w-4 h-4 text-[#687582]" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-bold text-[#17212B]">Histórico e versões anteriores</h2>
            <p className="text-[11px] text-[#687582]">
              Quem enviou, substituiu ou excluiu — e os arquivos antigos, que continuam guardados
            </p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#8995A1] transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="border-t border-[#E4E9ED]">
          {erro && (
            <div className="m-4 flex items-center gap-2 bg-[#FDEBEC] border border-[#F5B8BB] rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 text-[#D64550] shrink-0" />
              <p className="text-xs text-[#D64550]">{erro}</p>
            </div>
          )}

          {carregando && !dados ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-[#176B87] border-t-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-[#EEF1F4]">
              {/* Linha do tempo */}
              <div className="p-5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#8995A1] mb-3">Linha do tempo</h3>
                {eventos.length === 0 ? (
                  <p className="text-xs text-[#8995A1]">Nenhuma movimentação registrada ainda.</p>
                ) : (
                  <ol className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {eventos.map(ev => {
                      const a = ACOES[ev.acao] || ACOES.enviado;
                      return (
                        <li key={ev.id} className="flex gap-3">
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: a.fundo, color: a.cor }}
                          >
                            <a.Icone className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs text-[#17212B]">
                              <strong style={{ color: a.cor }}>{a.rotulo}</strong>
                              {ev.usuario_nome ? <> por <strong>{ev.usuario_nome}</strong></> : null}
                            </p>
                            <p className="text-[11px] text-[#687582] break-words">{ev.detalhes}</p>
                            <p className="text-[10px] text-[#8995A1] mt-0.5">{dataHora(ev.created_at)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>

              {/* Versões fora de uso */}
              <div className="p-5 border-t lg:border-t-0 border-[#EEF1F4]">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#8995A1] mb-3">
                  Versões anteriores ({versoes.length})
                </h3>
                {versoes.length === 0 ? (
                  <p className="text-xs text-[#8995A1]">Nenhum documento substituído ou excluído.</p>
                ) : (
                  <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {versoes.map(v => {
                      const excluido = v.status === 'excluido';
                      return (
                        <li key={v.id} className="rounded-xl border border-[#E4E9ED] p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#17212B] truncate">{v.nome}</p>
                              <p className="text-[10px] text-[#687582] truncate">
                                {v.tipo} · {v.nome_arquivo} · {formatBytes(v.tamanho_bytes)}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                                excluido
                                  ? 'bg-[#FDEBEC] text-[#A8323C] border-[#F5B8BB]'
                                  : 'bg-[#FEF3E0] text-[#A9690A] border-[#F8D99B]'
                              }`}
                            >
                              {excluido ? 'Excluído' : 'Substituído'}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#8995A1] mt-1.5">
                            Enviado em {formatDateBR(String(v.created_at || '').slice(0, 10))}
                            {v.data_vencimento ? ` · validade ${formatDateBR(v.data_vencimento)}` : ''}
                            {excluido
                              ? ` · excluído ${dataHora(v.excluido_em)}${v.excluido_por ? ` por ${v.excluido_por}` : ''}`
                              : ` · substituído ${dataHora(v.substituido_em)}`}
                          </p>
                          {excluido && v.motivo_exclusao && (
                            <p className="text-[10px] text-[#687582] mt-0.5 italic">Motivo: {v.motivo_exclusao}</p>
                          )}
                          <div className="flex items-center gap-1 mt-2">
                            <button
                              onClick={() => onAbrir(v, 'ver')}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-[#17212B] border border-[#DDE3E8] hover:border-[#176B87] rounded-lg cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> Ver
                            </button>
                            <button
                              onClick={() => onAbrir(v, 'baixar')}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-[#17212B] border border-[#DDE3E8] hover:border-[#176B87] rounded-lg cursor-pointer"
                            >
                              <Download className="w-3 h-3" /> Baixar
                            </button>
                            {excluido && podeRestaurar && (
                              <button
                                onClick={() => restaurar(v)}
                                disabled={restaurandoId === v.id}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-[#0F7A5A] border border-[#B8E8D9] hover:bg-[#E8F6F1] rounded-lg cursor-pointer disabled:opacity-50"
                              >
                                <RotateCcw className="w-3 h-3" /> {restaurandoId === v.id ? 'Restaurando...' : 'Restaurar'}
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
