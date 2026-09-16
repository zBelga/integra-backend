import React, { useState } from 'react';
import { X, Building, Plus, Trash2, Edit2, Check, AlertCircle } from 'lucide-react';
import { Obra } from '../../types';

interface ObrasModalProps {
  isOpen: boolean;
  obras: Obra[];
  onClose: () => void;
  onCreateObra: (data: { nome: string; codigo: string }) => Promise<void>;
  onUpdateObra: (id: string, data: { nome: string; codigo: string }) => Promise<void>;
  onDeleteObra: (id: string) => Promise<void>;
}

export const ObrasModal: React.FC<ObrasModalProps> = ({
  isOpen,
  obras,
  onClose,
  onCreateObra,
  onUpdateObra,
  onDeleteObra,
}) => {
  // New Obra Form State
  const [novoNome, setNovoNome] = useState('');
  const [novoCodigo, setNovoCodigo] = useState('');

  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCodigo, setEditCodigo] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoCodigo.trim()) {
      setError('Informe o nome e o código para cadastrar a nova obra.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await onCreateObra({ 
        nome: novoNome.trim(), 
        codigo: novoCodigo.trim().toUpperCase() 
      });
      setNovoNome('');
      setNovoCodigo('');
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar nova obra.');
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (obra: Obra) => {
    setEditingId(obra.id);
    setEditNome(obra.nome);
    setEditCodigo(obra.codigo);
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNome('');
    setEditCodigo('');
    setError('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editNome.trim() || !editCodigo.trim()) {
      setError('O nome e o código da obra não podem ficar vazios.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await onUpdateObra(id, {
        nome: editNome.trim(),
        codigo: editCodigo.trim().toUpperCase(),
      });
      setEditingId(null);
      setEditNome('');
      setEditCodigo('');
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar a obra.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setIsLoading(true);
    try {
      await onDeleteObra(id);
      if (editingId === id) {
        cancelEdit();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir obra.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-zinc-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-red-400" />
            <h2 className="font-bold text-base">Gerenciar Obras Cadastradas</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form to add new obra */}
          <form onSubmit={handleCreate} className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              + Nova Obra
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Nome da Obra (Ex: Obra Centro)"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-xs focus:ring-2 focus:ring-red-600 bg-white text-zinc-900"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="CÓDIGO (EX: OBR-001)"
                  value={novoCodigo}
                  onChange={(e) => setNovoCodigo(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-xs focus:ring-2 focus:ring-red-600 bg-white uppercase font-mono text-zinc-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center space-x-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Obra</span>
              </button>
            </div>
          </form>

          {/* List of Obras with Inline Editing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Obras Cadastradas ({obras.length})
              </h3>
              {editingId && (
                <span className="text-[11px] text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-medium">
                  Modo de edição ativo abaixo
                </span>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto border border-zinc-200 rounded-lg divide-y divide-zinc-100 bg-white">
              {obras.length === 0 ? (
                <p className="p-4 text-xs text-zinc-500 text-center">Nenhuma obra cadastrada.</p>
              ) : (
                obras.map((obra) => {
                  const isEditing = editingId === obra.id;

                  if (isEditing) {
                    return (
                      <div
                        key={obra.id}
                        className="p-3 bg-red-50/40 border-l-4 border-red-600 space-y-2 text-xs"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-zinc-700 mb-0.5">
                              Nome da Obra
                            </label>
                            <input
                              type="text"
                              value={editNome}
                              onChange={(e) => setEditNome(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-red-300 rounded text-xs bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                              placeholder="Nome da Obra"
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-zinc-700 mb-0.5">
                              Código
                            </label>
                            <input
                              type="text"
                              value={editCodigo}
                              onChange={(e) => setEditCodigo(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-red-300 rounded text-xs bg-white text-zinc-900 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-red-600"
                              placeholder="Código"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-2.5 py-1 text-xs text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-100 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(obra.id)}
                            disabled={isLoading}
                            className="px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 flex items-center space-x-1 shadow-xs transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Salvar Alterações</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={obra.id}
                      className="p-3 flex items-center justify-between bg-white hover:bg-zinc-50 transition-colors text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-zinc-900 truncate">{obra.nome}</p>
                        <p className="font-mono text-[11px] text-zinc-500">Código: {obra.codigo}</p>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button
                          onClick={() => startEdit(obra)}
                          className="p-1.5 text-zinc-500 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          title="Editar esta obra"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(obra.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors"
                          title="Excluir obra"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-50 px-6 py-3 border-t border-zinc-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
