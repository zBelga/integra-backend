import React, { useEffect, useState } from 'react';
import {
  X,
  History,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ArrowRight,
  FileText,
  Calendar,
  Building2,
} from 'lucide-react';
import { SolicitacaoAlteracao, SolicitacaoHistorico } from '../../types';
import { fetchSolicitacaoById } from '../../services/api';

interface SolicitacaoDetalhesModalProps {
  solicitacaoId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SolicitacaoDetalhesModal: React.FC<SolicitacaoDetalhesModalProps> = ({
  solicitacaoId,
  isOpen,
  onClose,
}) => {
  const [solicitacao, setSolicitacao] = useState<SolicitacaoAlteracao | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !solicitacaoId) return;

    async function load() {
      setIsLoading(true);
      try {
        const res = await fetchSolicitacaoById(solicitacaoId!);
        if (res.success) {
          setSolicitacao(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [isOpen, solicitacaoId]);

  if (!isOpen || !solicitacaoId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#DDE3E8] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DDE3E8] flex items-center justify-between bg-[#F8FAFB]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F3F6] text-[#176B87] flex items-center justify-center font-black text-sm">
              #{solicitacao?.codigo_sequencial || '---'}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17212B]">
                Detalhes & Auditoria da Solicitação
              </h3>
              <p className="text-xs text-[#687582]">
                Módulo: <span className="font-semibold text-[#17212B] uppercase">{solicitacao?.modulo}</span> •{' '}
                {solicitacao?.registro_identificador}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#687582] hover:bg-[#E8ECF0] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading || !solicitacao ? (
            <div className="py-12 text-center text-[#687582] space-y-2">
              <div className="w-6 h-6 border-2 border-[#176B87] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Carregando histórico detalhado...</p>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  solicitacao.status === 'aprovada'
                    ? 'bg-[#E8F6F1] border-[#B8E8D9] text-[#159A72]'
                    : solicitacao.status === 'recusada'
                    ? 'bg-[#FDEBEC] border-[#F8B4B9] text-[#D64550]'
                    : 'bg-[#FEF3C7] border-[#FDE68A] text-[#B45309]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  {solicitacao.status === 'aprovada' && <CheckCircle2 className="w-5 h-5" />}
                  {solicitacao.status === 'recusada' && <XCircle className="w-5 h-5" />}
                  {solicitacao.status === 'pendente' && <Clock className="w-5 h-5" />}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">
                      Status Atual: {solicitacao.status.toUpperCase()}
                    </p>
                    <p className="text-xs font-normal text-[#17212B]">
                      {solicitacao.status === 'aprovada' &&
                        `Aprovado por ${solicitacao.aprovador_nome} (${solicitacao.aprovador_cargo})`}
                      {solicitacao.status === 'recusada' &&
                        `Recusado por ${solicitacao.aprovador_nome}: "${solicitacao.motivo_recusa}"`}
                      {solicitacao.status === 'pendente' && 'Aguardando parecer de um Encarregado ou Líder.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Diff Comparison Card */}
              <div className="bg-[#F8FAFB] rounded-xl border border-[#E1E8ED] p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#4E5D6C] flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-[#176B87]" />
                  <span>Diferença Solicitada (Diff)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-[#DDE3E8]">
                    <span className="text-[10px] font-bold text-[#687582] uppercase block">
                      Valor Anterior / Atual
                    </span>
                    <p className="text-sm font-semibold text-[#D64550] mt-1 break-words">
                      {solicitacao.valor_atual || '(Vazio ou Não definido)'}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-[#B8E8D9] bg-[#E8F6F1]/30">
                    <span className="text-[10px] font-bold text-[#159A72] uppercase block">
                      Novo Valor Solicitado
                    </span>
                    <p className="text-sm font-bold text-[#159A72] mt-1 break-words">
                      {solicitacao.valor_solicitado || '(Vazio)'}
                    </p>
                  </div>
                </div>

                {solicitacao.observacoes && (
                  <div className="text-xs text-[#556370] bg-white p-2.5 rounded-lg border border-[#DDE3E8]">
                    <strong className="text-[#17212B]">Observação do Solicitante:</strong> {solicitacao.observacoes}
                  </div>
                )}
              </div>

              {/* Audit Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#4E5D6C] flex items-center space-x-1.5">
                  <History className="w-4 h-4 text-[#176B87]" />
                  <span>Trilha de Auditoria Imutável</span>
                </h4>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DDE3E8]">
                  {solicitacao.historico && solicitacao.historico.length > 0 ? (
                    solicitacao.historico.map((item, idx) => (
                      <div key={item.id || idx} className="relative group">
                        <div
                          className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                            item.tipo_evento === 'APROVADA'
                              ? 'border-[#159A72] text-[#159A72]'
                              : item.tipo_evento === 'RECUSADA'
                              ? 'border-[#D64550] text-[#D64550]'
                              : 'border-[#176B87] text-[#176B87]'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.tipo_evento === 'APROVADA'
                                ? 'bg-[#159A72]'
                                : item.tipo_evento === 'RECUSADA'
                                ? 'bg-[#D64550]'
                                : 'bg-[#176B87]'
                            }`}
                          />
                        </div>

                        <div className="bg-[#F8FAFB] p-3 rounded-xl border border-[#E1E8ED]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#17212B]">
                              {item.usuario_nome}{' '}
                              <span className="font-normal text-[#687582]">({item.usuario_cargo || 'Usuário'})</span>
                            </span>
                            <span className="text-[11px] text-[#8995A1]">
                              {new Date(item.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-xs text-[#556370] mt-1">{item.detalhes}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#8995A1]">Nenhum registro de histórico adicional.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#F8FAFB] border-t border-[#DDE3E8] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-[#17212B] bg-[#E8ECF0] hover:bg-[#DDE3E8] rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
