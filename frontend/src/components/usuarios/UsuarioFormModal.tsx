import React, { useState, useEffect } from 'react';
import { X, User, Mail, Lock, Building2, Briefcase, Phone, Layers, ShieldCheck, Check, AlertCircle, Plus, Info } from 'lucide-react';
import { Empresa, UsuarioSistema, UsuarioFormData, PerfilUsuario, CargoEmpresa } from '../../types';
import { getCompanyTheme } from '../../utils/theme';
import { fetchCargos } from '../../services/api';
import { CargoFormModal } from './CargoFormModal';

interface UsuarioFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UsuarioFormData, id?: string) => Promise<void>;
  usuarioToEdit?: UsuarioSistema | null;
  empresas: Empresa[];
  selectedEmpresa?: Empresa | null;
}

const PERFIS_CONFIG: { id: PerfilUsuario; label: string; desc: string; badgeColor: string }[] = [
  { id: 'administrador', label: 'Administrador de Empresa', desc: 'Acesso completo aos módulos e configurações da empresa vinculada', badgeColor: 'bg-[#E8F3F6] text-[#176B87] border-[#C6E3EB]' },
  { id: 'gestor_rh', label: 'Gestor de RH & DP', desc: 'Gestão de admissões, documentações e controle de pessoal', badgeColor: 'bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]' },
  { id: 'engenheiro', label: 'Engenheiro / Fiscal de Obras', desc: 'Gestão de canteiros, obras e alocação de equipes', badgeColor: 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]' },
  { id: 'operacional', label: 'Operacional / Administrativo', desc: 'Lançamentos diários e rotinas operacionais básicas', badgeColor: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]' },
  { id: 'visualizador', label: 'Somente Leitura (Auditoria)', desc: 'Visualização de relatórios e painéis sem permissão de edição', badgeColor: 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]' },
];

export const UsuarioFormModal: React.FC<UsuarioFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  usuarioToEdit,
  empresas,
  selectedEmpresa,
}) => {
  const [formData, setFormData] = useState<UsuarioFormData>({
    nome: '',
    email: '',
    senha: '',
    cargo_id: '',
    cargo: '',
    perfil: 'gestor_rh',
    empresa_id: selectedEmpresa?.id || empresas[0]?.id || '',
    status: 'ativo',
    telefone: '',
    departamento: '',
    permissoes: ['admissoes', 'obras'],
  });

  const [cargos, setCargos] = useState<CargoEmpresa[]>([]);
  const [isLoadingCargos, setIsLoadingCargos] = useState(false);
  const [isCargoModalOpen, setIsCargoModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const companyColor = selectedEmpresa?.corPrimaria || '#176B87';
  const theme = getCompanyTheme(companyColor);

  // Load cargos for the current selected empresa
  const loadCargosForEmpresa = async (targetEmpresaId: string, preselectCargoName?: string, preselectCargoId?: string) => {
    if (!targetEmpresaId) return;
    try {
      setIsLoadingCargos(true);
      const res = await fetchCargos(targetEmpresaId, 'ativo');
      if (res.success) {
        setCargos(res.data);

        // Try to match or select
        if (preselectCargoId) {
          const match = res.data.find(c => c.id === preselectCargoId);
          if (match) {
            setFormData(prev => ({ ...prev, cargo_id: match.id, cargo: match.nome }));
            return;
          }
        }

        if (preselectCargoName) {
          const matchByName = res.data.find(c => c.nome.toLowerCase() === preselectCargoName.toLowerCase());
          if (matchByName) {
            setFormData(prev => ({ ...prev, cargo_id: matchByName.id, cargo: matchByName.nome }));
            return;
          }
        }

        // If not matched but we have cargos and no cargo_id yet, select first active cargo
        if (res.data.length > 0 && !preselectCargoId && !preselectCargoName) {
          setFormData(prev => ({
            ...prev,
            cargo_id: res.data[0].id,
            cargo: res.data[0].nome,
          }));
        }
      }
    } catch (err) {
      console.error('Erro ao buscar cargos para a empresa:', err);
    } finally {
      setIsLoadingCargos(false);
    }
  };

  useEffect(() => {
    const initialEmpresaId = usuarioToEdit?.empresa_id || selectedEmpresa?.id || empresas[0]?.id || '';
    if (usuarioToEdit) {
      setFormData({
        nome: usuarioToEdit.nome,
        email: usuarioToEdit.email,
        senha: '', // leave empty unless changing
        cargo_id: usuarioToEdit.cargo_id || '',
        cargo: usuarioToEdit.cargo,
        perfil: usuarioToEdit.perfil,
        empresa_id: usuarioToEdit.empresa_id,
        status: usuarioToEdit.status,
        telefone: usuarioToEdit.telefone || '',
        departamento: usuarioToEdit.departamento || '',
        permissoes: usuarioToEdit.permissoes || ['admissoes'],
      });
      loadCargosForEmpresa(usuarioToEdit.empresa_id, usuarioToEdit.cargo, usuarioToEdit.cargo_id);
    } else {
      setFormData({
        nome: '',
        email: '',
        senha: '',
        cargo_id: '',
        cargo: '',
        perfil: 'gestor_rh',
        empresa_id: initialEmpresaId,
        status: 'ativo',
        telefone: '',
        departamento: '',
        permissoes: ['admissoes', 'obras'],
      });
      loadCargosForEmpresa(initialEmpresaId);
    }
    setErrorMessage('');
  }, [usuarioToEdit, isOpen, selectedEmpresa, empresas]);

  // When empresa_id changes inside form
  const handleEmpresaChange = (newEmpresaId: string) => {
    setFormData(prev => ({
      ...prev,
      empresa_id: newEmpresaId,
      cargo_id: '',
      cargo: '',
    }));
    loadCargosForEmpresa(newEmpresaId);
  };

  const handleCargoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedObj = cargos.find(c => c.id === selectedId);
    setFormData(prev => ({
      ...prev,
      cargo_id: selectedId,
      cargo: selectedObj ? selectedObj.nome : '',
    }));
  };

  // Called when a new cargo is created in the submodal
  const handleNewCargoCreated = (newCargo: CargoEmpresa) => {
    setCargos(prev => {
      // Add or replace
      const filtered = prev.filter(c => c.id !== newCargo.id);
      return [...filtered, newCargo].sort((a, b) => a.nome.localeCompare(b.nome));
    });
    // Immediately select the newly created cargo in form
    setFormData(prev => ({
      ...prev,
      cargo_id: newCargo.id,
      cargo: newCargo.nome,
    }));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.nome.trim()) {
      setErrorMessage('Informe o nome completo do usuário.');
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage('Informe o e-mail de acesso corporativo.');
      return;
    }

    if (!usuarioToEdit && !formData.senha?.trim()) {
      setErrorMessage('Defina uma senha de acesso inicial para o novo usuário.');
      return;
    }

    if (!formData.empresa_id) {
      setErrorMessage('Selecione a empresa à qual este usuário será vinculado.');
      return;
    }

    if (!formData.cargo.trim() && !formData.cargo_id) {
      setErrorMessage('Selecione o cargo / função do usuário dentro da empresa.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(formData, usuarioToEdit?.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTargetEmpresa = empresas.find(e => e.id === formData.empresa_id) || selectedEmpresa || null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17212B]/50 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white border border-[#DDE3E8] rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar text-[#17212B]">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#DDE3E8]">
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-2xs"
                style={{ backgroundColor: selectedTargetEmpresa?.corPrimaria || companyColor }}
              >
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-[#17212B]">
                    {usuarioToEdit ? 'Editar Usuário & Vínculo' : 'Criar Novo Usuário & Vincular à Empresa'}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8F6F1] text-[#159A72] border border-[#B8E8D9]">
                    Painel Master
                  </span>
                </div>
                <p className="text-xs text-[#687582]">
                  Defina o cargo profissional na empresa e o perfil de acesso no sistema.
                </p>
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

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Section 1: Empresa Binding (Multi-Tenant) */}
            <div className="p-4 bg-[#F8FAFB] border border-[#DDE3E8] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#17212B] flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-[#176B87]" />
                  <span>1. Empresa Vinculada (Multi-Tenant) *</span>
                </label>
                <span className="text-[10px] text-[#687582]">Acesso e cargos restritos a esta empresa</span>
              </div>

              <select
                required
                value={formData.empresa_id}
                onChange={(e) => handleEmpresaChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#DDE3E8] rounded-xl text-xs font-semibold text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all cursor-pointer shadow-2xs"
              >
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nome} • CNPJ: {emp.cnpj} ({emp.segmento})
                  </option>
                ))}
              </select>

              {selectedTargetEmpresa && (
                <div className="flex items-center space-x-2.5 pt-1 px-1">
                  {selectedTargetEmpresa.logoUrl ? (
                    <img src={selectedTargetEmpresa.logoUrl} alt="" className="w-6 h-6 rounded-md object-cover border border-[#DDE3E8]" />
                  ) : (
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: selectedTargetEmpresa.corPrimaria || '#176B87' }}>
                      {selectedTargetEmpresa.nome[0]}
                    </div>
                  )}
                  <p className="text-[11px] text-[#687582]">
                    Empresa Selecionada: <strong className="text-[#17212B]">{selectedTargetEmpresa.nome}</strong> ({selectedTargetEmpresa.razaoSocial})
                  </p>
                </div>
              )}
            </div>

            {/* Section 2: Dados do Usuário & Cargo Profissional */}
            <div className="space-y-3">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
                  2. Dados do Colaborador & Cargo Profissional
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Nome Completo */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-[#17212B]">
                    Nome Completo *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Mariana Silva Santos"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Email de Acesso */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-[#17212B]">
                    E-mail Corporativo de Acesso *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="usuario@empresa.com.br"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Senha */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-[#17212B]">
                    {usuarioToEdit ? 'Nova Senha (opcional)' : 'Senha Inicial de Acesso *'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required={!usuarioToEdit}
                      placeholder={usuarioToEdit ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
                      value={formData.senha}
                      onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all font-medium font-mono"
                    />
                  </div>
                </div>

                {/* Telefone / WhatsApp */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-[#17212B]">
                    Telefone / WhatsApp (opcional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="(11) 98765-4321"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all font-medium"
                    />
                  </div>
                </div>

                {/* CARGO / FUNÇÃO PROFISSIONAL (DROPDOWN EXCLUSIVO POR EMPRESA + BOTAO CRIAR) */}
                <div className="space-y-1 text-left sm:col-span-2 p-3 bg-[#F8FAFB] border border-[#DDE3E8] rounded-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#17212B] flex items-center space-x-1.5">
                      <Briefcase className="w-4 h-4 text-[#176B87]" />
                      <span>Cargo / Função Profissional na Empresa *</span>
                    </label>

                    {/* Botão + Criar Cargo */}
                    <button
                      type="button"
                      onClick={() => setIsCargoModalOpen(true)}
                      className="text-xs font-bold px-2.5 py-1 text-white rounded-lg flex items-center space-x-1 transition-all shadow-2xs hover:opacity-90 cursor-pointer"
                      style={{ backgroundColor: selectedTargetEmpresa?.corPrimaria || companyColor }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Criar Cargo</span>
                    </button>
                  </div>

                  <div className="relative">
                    <select
                      required
                      value={formData.cargo_id || ''}
                      onChange={handleCargoChange}
                      disabled={isLoadingCargos || cargos.length === 0}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#DDE3E8] rounded-xl text-xs font-semibold text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all cursor-pointer shadow-2xs disabled:bg-gray-100"
                    >
                      {cargos.length === 0 ? (
                        <option value="">Nenhum cargo cadastrado para esta empresa (clique em Criar Cargo)</option>
                      ) : (
                        <>
                          <option value="">Selecione um cargo da empresa...</option>
                          {cargos.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome} {c.status === 'inativo' ? '(Inativo)' : ''}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-[#687582]">
                      Exemplos: <em>Encarregado, Assistente, Pedreiro, Engenheiro, Almoxarife</em>
                    </p>
                    <span className="text-[10px] font-medium text-[#176B87]">
                      {cargos.length} cargo(s) disponível(is) para {selectedTargetEmpresa?.nome}
                    </span>
                  </div>
                </div>

                {/* Departamento */}
                <div className="space-y-1 text-left sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#17212B]">
                    Departamento / Lotação (opcional)
                  </label>
                  <div className="relative">
                    <Layers className="w-4 h-4 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ex: Obras Rodoviárias / Departamento Pessoal / Suprimentos"
                      value={formData.departamento}
                      onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all font-medium"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Section 3: Perfil de Acesso & Permissões no Sistema */}
            <div className="space-y-2.5 text-left pt-3 border-t border-[#DDE3E8]">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#17212B]">
                  3. Perfil de Acesso & Permissões no Sistema *
                </label>
                <span className="text-[10px] text-[#687582]">Controla quais telas e ações o usuário acessa</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERFIS_CONFIG.map((perfil) => {
                  const isSelected = formData.perfil === perfil.id;
                  return (
                    <button
                      key={perfil.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, perfil: perfil.id })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#176B87] bg-[#E8F3F6] shadow-2xs ring-1 ring-[#176B87]'
                          : 'border-[#DDE3E8] bg-white hover:bg-[#F8FAFB]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold text-[#17212B]">{perfil.label}</span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-[#176B87] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-[#687582] leading-tight">{perfil.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Radio */}
            <div className="flex items-center justify-between p-3 bg-[#F8FAFB] border border-[#DDE3E8] rounded-2xl">
              <span className="text-xs font-bold text-[#17212B]">Status da Conta de Acesso:</span>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-1.5 text-xs font-medium text-[#17212B] cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="ativo"
                    checked={formData.status === 'ativo'}
                    onChange={() => setFormData({ ...formData, status: 'ativo' })}
                    className="w-4 h-4 text-[#159A72] focus:ring-[#159A72] cursor-pointer"
                  />
                  <span className="text-[#159A72] font-bold">Ativo</span>
                </label>
                <label className="flex items-center space-x-1.5 text-xs font-medium text-[#17212B] cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="inativo"
                    checked={formData.status === 'inativo'}
                    onChange={() => setFormData({ ...formData, status: 'inativo' })}
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
                className="px-6 py-2.5 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: selectedTargetEmpresa?.corPrimaria || companyColor }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{usuarioToEdit ? 'Atualizar Usuário' : 'Criar & Vincular Usuário'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>

      {/* Submodal for creating cargo on the fly */}
      {selectedTargetEmpresa && (
        <CargoFormModal
          isOpen={isCargoModalOpen}
          onClose={() => setIsCargoModalOpen(false)}
          onSuccess={handleNewCargoCreated}
          empresa={selectedTargetEmpresa}
        />
      )}
    </>
  );
};
