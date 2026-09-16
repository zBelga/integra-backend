import React, { useState, useEffect } from 'react';
import { X, Briefcase, AlertCircle, Check, Building2, AlignLeft } from 'lucide-react';
import { Empresa, CargoEmpresa, CargoFormData } from '../../types';
import { getCompanyTheme } from '../../utils/theme';
import { createCargo, updateCargo } from '../../services/api';

interface CargoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cargo: CargoEmpresa) => void;
  empresa: Empresa | null;
  cargoToEdit?: CargoEmpresa | null;
}

export const CargoFormModal: React.FC<CargoFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  empresa,
  cargoToEdit,
}) => {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const companyColor = empresa?.corPrimaria || '#176B87';
  const theme = getCompanyTheme(companyColor);

  useEffect(() => {
    if (cargoToEdit) {
      setNome(cargoToEdit.nome);
      setDescricao(cargoToEdit.descricao || '');
      setStatus(cargoToEdit.status || 'ativo');
    } else {
      setNome('');
      setDescricao('');
      setStatus('ativo');
    }
    setErrorMessage('');
  }, [cargoToEdit, isOpen]);

  if (!isOpen || !empresa) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!nome.trim()) {
      setErrorMessage('Informe o nome do cargo / função profissional.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (cargoToEdit) {
        const res = await updateCargo(cargoToEdit.id, {
          nome: nome.trim(),
          descricao: descricao.trim(),
          status,
          empresa_id: empresa.id,
        });
        if (res.success && res.data) {
          onSuccess(res.data);
          onClose();
        }
      } else {
        const payload: CargoFormData = {
          empresa_id: empresa.id,
          nome: nome.trim(),
          descricao: descricao.trim(),
          status,
        };
        const res = await createCargo(payload);
        if (res.success && res.data) {
          onSuccess(res.data);
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar cargo da empresa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#17212B]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#DDE3E8] rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 text-[#17212B]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#DDE3E8]">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-2xs"
              style={{ backgroundColor: companyColor }}
            >
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17212B]">
                {cargoToEdit ? 'Editar Cargo da Empresa' : 'Novo Cargo / Função'}
              </h3>
              <div className="flex items-center space-x-1.5 text-xs text-[#687582]">
                <Building2 className="w-3.5 h-3.5 text-[#176B87]" />
                <span>Exclusivo para: <strong className="text-[#17212B]">{empresa.nome}</strong></span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#687582] hover:text-[#17212B] p-2 rounded-xl hover:bg-[#F4F6F8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-[#FDEBEC] border border-[#F8B4B9] rounded-2xl flex items-center space-x-2.5 text-xs text-[#D64550] animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Empresa info notice */}
          <div className="p-3 bg-[#F8FAFB] border border-[#DDE3E8] rounded-2xl flex items-center justify-between text-xs">
            <span className="text-[#687582] font-medium">Empresa Destino:</span>
            <span className="font-bold text-[#17212B] px-2.5 py-1 bg-white border border-[#DDE3E8] rounded-lg">
              {empresa.nome}
            </span>
          </div>

          {/* Nome do Cargo */}
          <div className="space-y-1 text-left">
            <label className="block text-xs font-semibold text-[#17212B]">
              Nome do Cargo / Função Profissional *
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: Encarregado, Assistente, Pedreiro, Mestre de Obras..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all font-semibold"
              />
            </div>
            <p className="text-[11px] text-[#687582]">
              Este cargo será listado exclusivamente para os colaboradores desta empresa.
            </p>
          </div>

          {/* Descrição / Atribuições */}
          <div className="space-y-1 text-left">
            <label className="block text-xs font-semibold text-[#17212B]">
              Descrição / Atribuições (opcional)
            </label>
            <div className="relative">
              <textarea
                rows={2}
                placeholder="Ex: Liderança das frentes de obra, controle de produtividade e segurança..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all"
              />
            </div>
          </div>

          {/* Status Radio */}
          <div className="flex items-center justify-between p-3 bg-[#F8FAFB] border border-[#DDE3E8] rounded-2xl">
            <span className="text-xs font-bold text-[#17212B]">Status do Cargo:</span>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-1.5 text-xs font-medium text-[#17212B] cursor-pointer">
                <input
                  type="radio"
                  name="cargo_status"
                  value="ativo"
                  checked={status === 'ativo'}
                  onChange={() => setStatus('ativo')}
                  className="w-4 h-4 text-[#159A72] focus:ring-[#159A72] cursor-pointer"
                />
                <span className="text-[#159A72] font-bold">Ativo</span>
              </label>
              <label className="flex items-center space-x-1.5 text-xs font-medium text-[#17212B] cursor-pointer">
                <input
                  type="radio"
                  name="cargo_status"
                  value="inativo"
                  checked={status === 'inativo'}
                  onChange={() => setStatus('inativo')}
                  className="w-4 h-4 text-[#D64550] focus:ring-[#D64550] cursor-pointer"
                />
                <span className="text-[#687582]">Inativo</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#DDE3E8]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: companyColor }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{cargoToEdit ? 'Atualizar Cargo' : 'Criar Cargo'}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
