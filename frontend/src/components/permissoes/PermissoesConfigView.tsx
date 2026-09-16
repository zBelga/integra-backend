import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Save,
  Check,
  X,
  Edit3,
  Users,
  Loader2,
} from 'lucide-react';
import { CargoEmpresa, CargoPermissao, Empresa, ModuloSistema } from '../../types';
import { getCompanyTheme } from '../../utils/theme';
import {
  fetchCargosByEmpresa,
  fetchPermissoes,
  updateCargoPermissoes,
  createCargo,
  deleteCargo,
} from '../../services/api';
import { ToastMessage } from '../ui/Toast';

interface PermissoesConfigViewProps {
  selectedEmpresa: Empresa | null;
  onShowToast: (toast: ToastMessage) => void;
  onNavigateToSolicitacoes?: () => void;
}

const MODULOS: { id: string; nome: string }[] = [
  { id: 'efetivo',      nome: 'Efetivo' },
  { id: 'admissoes',    nome: 'Admissões' },
  { id: 'obras',        nome: 'Obras' },
  { id: 'rh',           nome: 'Recursos Humanos' },
  { id: 'documentos',   nome: 'Documentação' },
  { id: 'relatorios',   nome: 'Relatórios' },
  { id: 'usuarios',     nome: 'Gestão de Usuários' },
];

type Acao = 'visualizar' | 'criar' | 'editar' | 'excluir';
const ACOES: { id: Acao; label: string }[] = [
  { id: 'visualizar', label: 'Visualizar' },
  { id: 'criar',      label: 'Criar' },
  { id: 'editar',     label: 'Editar' },
  { id: 'excluir',    label: 'Excluir' },
];

export const PermissoesConfigView: React.FC<PermissoesConfigViewProps> = ({
  selectedEmpresa,
  onShowToast,
}) => {
  const companyColor = selectedEmpresa?.corPrimaria || '#176B87';
  const theme = getCompanyTheme(companyColor);

  const [cargos, setCargos] = useState<CargoEmpresa[]>([]);
  const [selectedCargoId, setSelectedCargoId] = useState<string>('');
  const [permissoes, setPermissoes] = useState<Record<string, Record<Acao, boolean>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // New cargo form
  const [showNovoCargo, setShowNovoCargo] = useState(false);
  const [novoCargo, setNovoCargo] = useState({ nome: '', descricao: '' });
  const [isCreating, setIsCreating] = useState(false);

  // Load cargos
  const loadCargos = async () => {
    setIsLoading(true);
    try {
      const res = await fetchCargosByEmpresa(selectedEmpresa?.id);
      if (res.success) {
        setCargos(res.data);
        if (res.data.length > 0 && !selectedCargoId) {
          setSelectedCargoId(res.data[0].id);
        }
      }
    } catch (err: any) {
      onShowToast({ id: Date.now().toString(), type: 'error', title: 'Erro', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadCargos(); }, [selectedEmpresa?.id]);

  // Load permissions for selected cargo
  useEffect(() => {
    if (!selectedCargoId) return;
    async function load() {
      try {
        const res = await fetchPermissoes({ empresa_id: selectedEmpresa?.id, cargo_id: selectedCargoId });
        const map: Record<string, Record<Acao, boolean>> = {};
        MODULOS.forEach((mod) => {
          const found = res.data?.find((p: CargoPermissao) => p.modulo === mod.id && p.cargo_id === selectedCargoId);
          map[mod.id] = {
            visualizar: Boolean(found?.visualizar ?? true),
            criar:      Boolean(found?.criar ?? false),
            editar:     Boolean(found?.editar ?? false),
            excluir:    Boolean(found?.excluir ?? false),
          };
        });
        setPermissoes(map);
        setHasChanges(false);
      } catch {}
    }
    load();
  }, [selectedCargoId, selectedEmpresa?.id]);

  const toggle = (modId: string, acao: Acao) => {
    setPermissoes((prev) => ({
      ...prev,
      [modId]: { ...prev[modId], [acao]: !prev[modId]?.[acao] },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedCargoId) return;
    setIsSaving(true);
    try {
      const payload = MODULOS.map((mod) => ({
        id: `perm-${selectedCargoId}-${mod.id}`,
        empresa_id: selectedEmpresa?.id || '',
        cargo_id: selectedCargoId,
        modulo: mod.id as ModuloSistema,
        visualizar: permissoes[mod.id]?.visualizar ?? false,
        criar:      permissoes[mod.id]?.criar ?? false,
        editar:     permissoes[mod.id]?.editar ?? false,
        excluir:    permissoes[mod.id]?.excluir ?? false,
        solicitar:  false,
        aprovar:    false,
      }));
      await updateCargoPermissoes(selectedCargoId, payload, selectedEmpresa?.id);
      setHasChanges(false);
      onShowToast({ id: Date.now().toString(), type: 'success', title: 'Permissões salvas!', message: 'Configurações do cargo atualizadas.' });
    } catch (err: any) {
      onShowToast({ id: Date.now().toString(), type: 'error', title: 'Erro ao salvar', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCargo = async () => {
    if (!novoCargo.nome.trim()) return;
    setIsCreating(true);
    try {
      const res = await createCargo({
        nome: novoCargo.nome.trim(),
        descricao: novoCargo.descricao.trim(),
        empresa_id: selectedEmpresa?.id || '',
        status: 'ativo',
      });
      if (res.success && res.data) {
        onShowToast({ id: Date.now().toString(), type: 'success', title: 'Cargo criado!', message: `"${res.data.nome}" adicionado.` });
        setNovoCargo({ nome: '', descricao: '' });
        setShowNovoCargo(false);
        await loadCargos();
        setSelectedCargoId(res.data.id);
      }
    } catch (err: any) {
      onShowToast({ id: Date.now().toString(), type: 'error', title: 'Erro', message: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCargo = async (id: string, nome: string) => {
    if (!window.confirm(`Excluir o cargo "${nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteCargo(id);
      onShowToast({ id: Date.now().toString(), type: 'info', title: 'Cargo excluído', message: `"${nome}" foi removido.` });
      if (selectedCargoId === id) setSelectedCargoId('');
      await loadCargos();
    } catch (err: any) {
      onShowToast({ id: Date.now().toString(), type: 'error', title: 'Erro', message: err.message });
    }
  };

  const selectedCargo = cargos.find((c) => c.id === selectedCargoId);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#DDE3E8] p-5 shadow-xs flex items-center space-x-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-2xs flex-shrink-0"
          style={{ backgroundColor: companyColor }}
        >
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-black text-[#17212B]">Cargos & Permissões</h1>
          <p className="text-xs text-[#687582] mt-0.5">Crie cargos e defina o que cada um pode fazer no sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Cargo list */}
        <div className="bg-white rounded-2xl border border-[#DDE3E8] shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#DDE3E8] flex items-center justify-between bg-[#F8FAFB]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#687582] flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Cargos</span>
            </span>
            <button
              onClick={() => setShowNovoCargo(true)}
              className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-white rounded-lg transition-colors cursor-pointer"
              style={{ backgroundColor: companyColor }}
            >
              <Plus className="w-3 h-3" />
              <span>Novo</span>
            </button>
          </div>

          {/* New cargo form */}
          {showNovoCargo && (
            <div className="p-3 border-b border-[#DDE3E8] bg-[#F8FAFB] space-y-2">
              <input
                autoFocus
                type="text"
                placeholder="Nome do cargo *"
                value={novoCargo.nome}
                onChange={(e) => setNovoCargo((p) => ({ ...p, nome: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ ['--tw-ring-color' as any]: companyColor }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCargo()}
              />
              <input
                type="text"
                placeholder="Descrição (opcional)"
                value={novoCargo.descricao}
                onChange={(e) => setNovoCargo((p) => ({ ...p, descricao: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleCreateCargo}
                  disabled={!novoCargo.nome.trim() || isCreating}
                  className="flex-1 py-1.5 text-[11px] font-bold text-white rounded-lg disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: companyColor }}
                >
                  {isCreating ? 'Criando...' : 'Criar Cargo'}
                </button>
                <button
                  onClick={() => { setShowNovoCargo(false); setNovoCargo({ nome: '', descricao: '' }); }}
                  className="px-3 py-1.5 text-[11px] font-semibold text-[#687582] bg-white border border-[#DDE3E8] rounded-lg cursor-pointer hover:bg-[#F4F6F8]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Cargo list */}
          <div className="flex-1 divide-y divide-[#EBF0F3]">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#687582]" />
              </div>
            ) : cargos.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#687582]">
                <Users className="w-8 h-8 mx-auto mb-2 text-[#DDE3E8]" />
                Nenhum cargo cadastrado.<br />Clique em "Novo" para criar.
              </div>
            ) : (
              cargos.map((cargo) => {
                const isSelected = cargo.id === selectedCargoId;
                return (
                  <div
                    key={cargo.id}
                    onClick={() => setSelectedCargoId(cargo.id)}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                      isSelected ? 'text-white' : 'hover:bg-[#F8FAFB] text-[#17212B]'
                    }`}
                    style={{ backgroundColor: isSelected ? companyColor : undefined }}
                  >
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-[#17212B]'}`}>
                        {cargo.nome}
                      </p>
                      {cargo.descricao && (
                        <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-white/70' : 'text-[#687582]'}`}>
                          {cargo.descricao}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCargo(cargo.id, cargo.nome); }}
                      className={`p-1 rounded ml-2 flex-shrink-0 transition-colors ${
                        isSelected ? 'hover:bg-white/20 text-white/70 hover:text-white' : 'hover:bg-red-50 text-[#DDE3E8] hover:text-red-500'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Permissions table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#DDE3E8] shadow-xs overflow-hidden flex flex-col">
          {!selectedCargo ? (
            <div className="flex-1 flex items-center justify-center p-12 text-center">
              <div>
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-[#DDE3E8]" />
                <p className="text-sm font-semibold text-[#687582]">Selecione um cargo</p>
                <p className="text-xs text-[#8995A1] mt-1">para configurar suas permissões</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-5 py-3.5 border-b border-[#DDE3E8] bg-[#F8FAFB] flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#17212B]">{selectedCargo.nome}</p>
                  <p className="text-xs text-[#687582]">Defina o que este cargo pode fazer em cada módulo</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                    hasChanges ? 'opacity-100' : 'opacity-40 cursor-not-allowed'
                  }`}
                  style={{ backgroundColor: companyColor }}
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F8FAFB] text-[#687582] text-[11px] uppercase font-bold border-b border-[#DDE3E8]">
                      <th className="py-3 px-5 w-full">Módulo</th>
                      {ACOES.map((a) => (
                        <th key={a.id} className="py-3 px-4 text-center whitespace-nowrap">{a.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBF0F3]">
                    {MODULOS.map((mod) => {
                      const perm = permissoes[mod.id] || { visualizar: false, criar: false, editar: false, excluir: false };
                      return (
                        <tr key={mod.id} className="hover:bg-[#F9FBFC]">
                          <td className="py-3 px-5 text-sm font-semibold text-[#17212B]">{mod.nome}</td>
                          {ACOES.map((acao) => (
                            <td key={acao.id} className="py-3 px-4 text-center">
                              <button
                                onClick={() => toggle(mod.id, acao.id)}
                                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer mx-auto ${
                                  perm[acao.id]
                                    ? 'border-transparent text-white'
                                    : 'border-[#DDE3E8] bg-white hover:border-[#8995A1]'
                                }`}
                                style={{ backgroundColor: perm[acao.id] ? companyColor : undefined }}
                              >
                                {perm[acao.id] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </button>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {hasChanges && (
                <div className="px-5 py-3 border-t border-[#DDE3E8] bg-amber-50 text-xs text-amber-700 font-semibold flex items-center space-x-2">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Você tem alterações não salvas. Clique em "Salvar" para confirmar.</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
