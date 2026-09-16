import React, { useState } from 'react';
import { X, Users, Save } from 'lucide-react';
import { Colaborador } from '../../types';

interface EditColaboradorModalProps {
  colaborador: Colaborador;
  obras: { id: string; nome: string; codigo: string }[];
  onSave: (id: string, data: Partial<Colaborador>) => Promise<void>;
  onClose: () => void;
}

export const EditColaboradorModal: React.FC<EditColaboradorModalProps> = ({ colaborador, obras, onSave, onClose }) => {
  const [form, setForm] = useState({
    nome: colaborador.nome || '',
    funcao: colaborador.funcao || '',
    rg: colaborador.rg || '',
    numero_chapa: colaborador.numero_chapa || '',
    obra_id: colaborador.obra_id || '',
    data_admissao: colaborador.data_admissao || '',
    data_aso: colaborador.data_aso || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return; }
    if (!form.numero_chapa.trim()) { setError('Número da chapa é obrigatório.'); return; }
    setIsLoading(true);
    try {
      await onSave(colaborador.id, form);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar.');
    } finally {
      setIsLoading(false);
    }
  };

  const Field = ({ label, name, type = 'text', required = false }: { label: string; name: string; type?: string; required?: boolean }) => (
    <div>
      <label className="block text-xs font-semibold text-[#17212B] mb-1">
        {label} {required && <span className="text-[#D64550]">*</span>}
      </label>
      <input
        type={type}
        value={(form as any)[name]}
        onChange={e => set(name, e.target.value)}
        className="w-full px-3 py-2 border border-[#DDE3E8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#176B87] focus:border-transparent"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDE3E8] bg-[#176B87] rounded-t-xl sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Editar Colaborador</h2>
              <p className="text-xs text-white/80 truncate max-w-[250px]">{colaborador.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Nome Completo" name="nome" required />
            </div>
            <Field label="Função" name="funcao" />
            <Field label="Nº da Chapa" name="numero_chapa" required />
            <Field label="RG" name="rg" />
            <div>
              <label className="block text-xs font-semibold text-[#17212B] mb-1">Obra</label>
              <select
                value={form.obra_id}
                onChange={e => set('obra_id', e.target.value)}
                className="w-full px-3 py-2 border border-[#DDE3E8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#176B87]"
              >
                <option value="">Selecione...</option>
                {obras.map(o => (
                  <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} — ` : ''}{o.nome}</option>
                ))}
              </select>
            </div>
            <Field label="Data de Admissão" name="data_admissao" type="date" />
            <Field label="Data ASO" name="data_aso" type="date" />
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
              className="flex-1 py-2.5 bg-[#176B87] text-white text-sm font-bold rounded-lg hover:bg-[#0F5268] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
