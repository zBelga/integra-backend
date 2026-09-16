import React, { useState } from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import { UsuarioSistema } from '../../types';

interface DeleteUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
  usuario: UsuarioSistema | null;
}

export const DeleteUsuarioModal: React.FC<DeleteUsuarioModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  usuario,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !usuario) return null;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm(usuario.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17212B]/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#DDE3E8] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 text-[#17212B]">
        <div className="flex items-center justify-between pb-3 border-b border-[#DDE3E8]">
          <div className="flex items-center space-x-2.5 text-[#D64550]">
            <div className="w-8 h-8 rounded-xl bg-[#FDEBEC] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#D64550]" />
            </div>
            <h3 className="text-sm font-bold text-[#17212B]">Excluir Conta de Usuário</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#687582] hover:text-[#17212B] p-1.5 rounded-xl hover:bg-[#F4F6F8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#687582] leading-relaxed">
          Tem certeza de que deseja remover o usuário <strong className="text-[#17212B]">{usuario.nome}</strong> ({usuario.email})? 
          Ele perderá o acesso imediato à empresa <strong className="text-[#17212B]">{usuario.empresa_nome || 'vinculada'}</strong>.
        </p>

        <div className="p-3 bg-[#F8FAFB] border border-[#DDE3E8] rounded-2xl text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-[#687582]">Cargo:</span>
            <span className="font-semibold text-[#17212B]">{usuario.cargo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#687582]">Empresa Vinculada:</span>
            <span className="font-semibold text-[#17212B]">{usuario.empresa_nome || '—'}</span>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-[#D64550] hover:bg-[#B53640] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Confirmar Exclusão</span>
          </button>
        </div>
      </div>
    </div>
  );
};
