import React, { useState } from 'react';
import { X, UserCheck, Hash, CreditCard, Calendar } from 'lucide-react';
import { Admissao } from '../../types';

interface ContrataModalProps {
  admissao: Admissao;
  onConfirm: (admissaoId: string, data: { rg: string; numero_chapa: string; data_admissao: string }) => Promise<void>;
  onClose: () => void;
}

export const ContrataModal: React.FC<ContrataModalProps> = ({ admissao, onConfirm, onClose }) => {
  const [rg, setRg] = useState(admissao.rg || '');
  const [numero_chapa, setNumeroChapa] = useState('');
  const [data_admissao, setDataAdmissao] = useState(
    admissao.previsao_contratacao || new Date().toISOString().split('T')[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!numero_chapa.trim()) {
      setError('O número da chapa é obrigatório.');
      return;
    }
    setIsLoading(true);
    try {
      await onConfirm(admissao.id, { rg: rg.trim(), numero_chapa: numero_chapa.trim(), data_admissao });
    } catch (err: any) {
      setError(err.message || 'Erro ao contratar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDE3E8] bg-[#159A72] rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Contratar Colaborador</h2>
              <p className="text-xs text-white/80 mt-0.5 truncate max-w-[220px]">{admissao.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info banner */}
          <div className="bg-[#E8F6F1] border border-[#B8E8D9] rounded-lg px-4 py-3 text-xs text-[#0D7A5C]">
            Preencha os dados finais para mover <strong>{admissao.nome}</strong> para o <strong>Efetivo</strong>.
          </div>

          {/* Número da Chapa */}
          <div>
            <label className="block text-xs font-semibold text-[#17212B] mb-1">
              Número da Chapa <span className="text-[#D64550]">*</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8995A1]" />
              <input
                type="text"
                value={numero_chapa}
                onChange={e => setNumeroChapa(e.target.value)}
                placeholder="Ex: 0042"
                className="w-full pl-9 pr-3 py-2.5 border border-[#DDE3E8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#159A72] focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* RG */}
          <div>
            <label className="block text-xs font-semibold text-[#17212B] mb-1">RG</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8995A1]" />
              <input
                type="text"
                value={rg}
                onChange={e => setRg(e.target.value)}
                placeholder="Ex: 12.345.678-9"
                className="w-full pl-9 pr-3 py-2.5 border border-[#DDE3E8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#159A72] focus:border-transparent"
              />
            </div>
          </div>

          {/* Data de Admissão */}
          <div>
            <label className="block text-xs font-semibold text-[#17212B] mb-1">Data de Admissão</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8995A1]" />
              <input
                type="date"
                value={data_admissao}
                onChange={e => setDataAdmissao(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-[#DDE3E8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#159A72] focus:border-transparent"
              />
            </div>
          </div>

          {error && (
            <div className="bg-[#FDEBEC] border border-[#F5B8BB] rounded-lg px-4 py-2.5 text-xs text-[#D64550] font-medium">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-[#DDE3E8] text-[#687582] text-sm font-semibold rounded-lg hover:bg-[#F8FAFB] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 bg-[#159A72] text-white text-sm font-bold rounded-lg hover:bg-[#0D7A5C] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              {isLoading ? 'Contratando...' : 'Confirmar Contratação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
