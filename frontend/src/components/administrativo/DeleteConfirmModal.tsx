import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Admissao } from '../../types';
import { applyCPFMask } from '../../utils/cpfMask';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  admissao: Admissao | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  admissao,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  if (!isOpen || !admissao) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-zinc-900">Confirmar exclusão de admissão</h3>
          <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
            Tem certeza que deseja excluir o registro de{' '}
            <span className="font-bold text-zinc-900">{admissao.nome}</span> (CPF:{' '}
            <span className="font-mono">{applyCPFMask(admissao.cpf)}</span>)?
          </p>
          <p className="text-[11px] text-red-600 font-semibold mt-1">
            Esta ação é irreversível e removerá todos os dados vinculados a este funcionário.
          </p>

          <div className="mt-6 flex items-center justify-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Excluindo...' : 'Sim, excluir'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
