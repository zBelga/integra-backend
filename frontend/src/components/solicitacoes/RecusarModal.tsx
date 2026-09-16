import React, { useState } from 'react';
import { X, XCircle, AlertTriangle, Send } from 'lucide-react';
import { SolicitacaoAlteracao } from '../../types';

interface RecusarModalProps {
  solicitacao: SolicitacaoAlteracao | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
}

export const RecusarModal: React.FC<RecusarModalProps> = ({
  solicitacao,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !solicitacao) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError('Por favor, informe a justificativa da recusa.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onConfirm(motivo.trim());
      setMotivo('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao processar recusa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#DDE3E8] shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DDE3E8] flex items-center justify-between bg-[#FFF7F7]">
          <div className="flex items-center space-x-2.5 text-[#D64550]">
            <XCircle className="w-5 h-5" />
            <h3 className="text-base font-bold text-[#17212B]">
              Recusar Solicitação #{solicitacao.codigo_sequencial}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#687582] hover:bg-[#F4F6F8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-[#F8FAFB] border border-[#E1E8ED] rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-[#687582]">Registro:</span>
              <span className="font-bold text-[#17212B]">{solicitacao.registro_identificador}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#687582]">Solicitante:</span>
              <span className="font-semibold text-[#17212B]">
                {solicitacao.solicitante_nome} ({solicitacao.solicitante_cargo})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#687582]">Campo:</span>
              <span className="font-semibold text-[#2563EB]">{solicitacao.campo}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#17212B] mb-1.5">
              Motivo / Justificativa da Recusa <span className="text-[#D64550]">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (error) setError('');
              }}
              rows={4}
              placeholder="Ex: Dados de exame ocupacional divergentes com o laudo original anexado..."
              className="w-full p-3 text-sm rounded-xl border border-[#CCD6DD] focus:outline-none focus:ring-2 focus:ring-[#D64550] focus:border-transparent"
              autoFocus
            />
            {error && <p className="text-xs text-[#D64550] font-semibold mt-1">{error}</p>}
          </div>

          <div className="flex items-start space-x-2 text-xs text-[#687582] bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              Ao recusar, o registro original <strong className="text-[#17212B]">não sofrerá nenhuma alteração</strong>{' '}
              e este motivo ficará registrado permanentemente na auditoria.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#687582] hover:text-[#17212B] rounded-xl border border-[#CCD6DD] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[#D64550] hover:bg-[#C0394B] rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirmar Recusa</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
