import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle, Save, Send, Info, ShieldAlert } from 'lucide-react';
import { Admissao, AdmissaoFormData, Obra } from '../../types';
import { applyCPFMask, unmaskCPF, validateCPF } from '../../utils/cpfMask';
import { createSolicitacao } from '../../services/api';

interface AdmissaoFormModalProps {
  isOpen: boolean;
  editingAdmissao: Admissao | null;
  obras: Obra[];
  onClose: () => void;
  onSave: (data: AdmissaoFormData, id?: string) => Promise<void>;
  empresaId?: string;
  currentUserCargo?: string;
  canDirectEdit?: boolean;
  canRequestChange?: boolean;
  onSolicitacaoCreated?: (solicitacaoId: string, seqCode: number) => void;
}

export const AdmissaoFormModal: React.FC<AdmissaoFormModalProps> = ({
  isOpen,
  editingAdmissao,
  obras,
  onClose,
  onSave,
  empresaId = 'emp-001',
  currentUserCargo = 'Encarregado Geral',
  canDirectEdit = true,
  canRequestChange = true,
  onSolicitacaoCreated,
}) => {
  const [formData, setFormData] = useState<AdmissaoFormData>({
    nome: '',
    funcao: '',
    cpf: '',
    data_nascimento: '',
    obra_id: '',
    data_exame: '',
    data_aso: '',
    previsao_contratacao: '',
  });

  const [observacoes, setObservacoes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If editing an existing admission and user doesn't have direct edit permission, we enter Request Mode
  const isRequestMode = Boolean(editingAdmissao && !canDirectEdit && canRequestChange);

  useEffect(() => {
    if (editingAdmissao) {
      setFormData({
        nome: editingAdmissao.nome || '',
        funcao: editingAdmissao.funcao || '',
        cpf: applyCPFMask(editingAdmissao.cpf || ''),
        data_nascimento: editingAdmissao.data_nascimento || '',
        obra_id: editingAdmissao.obra_id || '',
        data_exame: editingAdmissao.data_exame || '',
        data_aso: editingAdmissao.data_aso || '',
        previsao_contratacao: editingAdmissao.previsao_contratacao || '',
      });
      setObservacoes('');
    } else {
      setFormData({
        nome: '',
        funcao: '',
        cpf: '',
        data_nascimento: '',
        obra_id: obras.length > 0 ? obras[0].id : '',
        data_exame: '',
        data_aso: '',
        previsao_contratacao: '',
      });
      setObservacoes('');
    }
    setErrors({});
  }, [editingAdmissao, isOpen, obras]);

  if (!isOpen) return null;

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyCPFMask(e.target.value);
    setFormData((prev) => ({ ...prev, cpf: masked }));

    if (errors.cpf) {
      setErrors((prev) => ({ ...prev, cpf: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'O nome completo é obrigatório.';
    }

    if (!formData.funcao.trim()) {
      newErrors.funcao = 'A função é obrigatória.';
    }

    const rawCPF = unmaskCPF(formData.cpf);
    if (!rawCPF) {
      newErrors.cpf = 'O CPF é obrigatório.';
    } else if (!validateCPF(rawCPF)) {
      newErrors.cpf = 'CPF inválido. Verifique os dígitos informados.';
    }


    if (!formData.obra_id) {
      newErrors.obra_id = 'A seleção da obra é obrigatória.';
    }

    if (!formData.previsao_contratacao) {
      newErrors.previsao_contratacao = 'A previsão de contratação é obrigatória.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const cleanedData: AdmissaoFormData = {
        ...formData,
        cpf: unmaskCPF(formData.cpf),
      };

      if (isRequestMode && editingAdmissao) {
        // Detect differences between original and submitted data
        const diffs: string[] = [];
        const oldData: any = {};
        const newData: any = {};

        if (editingAdmissao.nome !== cleanedData.nome) {
          diffs.push(`Nome: "${editingAdmissao.nome}" ➔ "${cleanedData.nome}"`);
          oldData.nome = editingAdmissao.nome;
          newData.nome = cleanedData.nome;
        }
        if (editingAdmissao.funcao !== cleanedData.funcao) {
          diffs.push(`Função: "${editingAdmissao.funcao}" ➔ "${cleanedData.funcao}"`);
          oldData.funcao = editingAdmissao.funcao;
          newData.funcao = cleanedData.funcao;
        }
        if (unmaskCPF(editingAdmissao.cpf) !== cleanedData.cpf) {
          diffs.push(`CPF: "${editingAdmissao.cpf}" ➔ "${formData.cpf}"`);
          oldData.cpf = editingAdmissao.cpf;
          newData.cpf = cleanedData.cpf;
        }
        if (editingAdmissao.obra_id !== cleanedData.obra_id) {
          const oldObra = obras.find((o) => o.id === editingAdmissao.obra_id)?.nome || editingAdmissao.obra_id;
          const newObra = obras.find((o) => o.id === cleanedData.obra_id)?.nome || cleanedData.obra_id;
          diffs.push(`Obra: "${oldObra}" ➔ "${newObra}"`);
          oldData.obra_id = editingAdmissao.obra_id;
          newData.obra_id = cleanedData.obra_id;
        }
        if (editingAdmissao.data_nascimento !== cleanedData.data_nascimento) {
          diffs.push(`Nascimento: ${editingAdmissao.data_nascimento} ➔ ${cleanedData.data_nascimento}`);
          oldData.data_nascimento = editingAdmissao.data_nascimento;
          newData.data_nascimento = cleanedData.data_nascimento;
        }
        if ((editingAdmissao.data_exame || '') !== (cleanedData.data_exame || '')) {
          diffs.push(`Data Exame: ${editingAdmissao.data_exame || 'N/D'} ➔ ${cleanedData.data_exame || 'N/D'}`);
          oldData.data_exame = editingAdmissao.data_exame;
          newData.data_exame = cleanedData.data_exame;
        }
        if ((editingAdmissao.data_aso || '') !== (cleanedData.data_aso || '')) {
          diffs.push(`Data ASO: ${editingAdmissao.data_aso || 'N/D'} ➔ ${cleanedData.data_aso || 'N/D'}`);
          oldData.data_aso = editingAdmissao.data_aso;
          newData.data_aso = cleanedData.data_aso;
        }
        if (editingAdmissao.previsao_contratacao !== cleanedData.previsao_contratacao) {
          diffs.push(`Previsão Contratação: ${editingAdmissao.previsao_contratacao} ➔ ${cleanedData.previsao_contratacao}`);
          oldData.previsao_contratacao = editingAdmissao.previsao_contratacao;
          newData.previsao_contratacao = cleanedData.previsao_contratacao;
        }

        if (diffs.length === 0) {
          setErrors({ submit: 'Nenhum dado foi alterado em relação ao cadastro atual.' });
          setIsSubmitting(false);
          return;
        }

        const primaryDiff = diffs[0];
        const res = await createSolicitacao({
          empresa_id: empresaId,
          modulo: 'efetivo',
          registro_id: editingAdmissao.id,
          registro_identificador: editingAdmissao.nome,
          solicitante_id: 'usr-ast-01',
          solicitante_nome: 'Mariana Souza (Assistente)',
          solicitante_cargo: currentUserCargo || 'Assistente Administrativo',
          solicitante_cargo_id: 'cargo-ast-01',
          campo: diffs.length > 1 ? `${diffs.length} campos alterados` : primaryDiff.split(':')[0],
          valor_atual: Object.values(oldData).join(' | '),
          valor_solicitado: Object.values(newData).join(' | '),
          dados_anteriores: { ...editingAdmissao, ...oldData },
          dados_solicitados: { ...editingAdmissao, ...newData },
          observacoes: observacoes.trim() || `Alterações solicitadas: ${diffs.join('; ')}`,
        });

        if (res.success && res.data) {
          if (onSolicitacaoCreated) {
            onSolicitacaoCreated(res.data.id, res.data.codigo_sequencial);
          }
          onClose();
        }
      } else {
        // Direct save / create
        await onSave(cleanedData, editingAdmissao?.id);
        onClose();
      }
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, submit: err.message || 'Erro ao processar formulário.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between text-white ${
            isRequestMode ? 'bg-[#1E3A8A]' : 'bg-[#17212B]'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {isRequestMode ? (
              <Send className="w-5 h-5 text-blue-300" />
            ) : (
              <UserCheck className="w-5 h-5 text-[#159A72]" />
            )}
            <div>
              <h2 className="font-bold text-base">
                {editingAdmissao
                  ? isRequestMode
                    ? 'Solicitar Alteração Cadastral (Aprovação Obrigatória)'
                    : 'Editar Admissão (Edição Direta)'
                  : 'Nova Admissão'}
              </h2>
              <p className="text-xs text-white/80">
                Cargo Atual: <strong className="text-white">{currentUserCargo}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Request Mode Notice Banner */}
        {isRequestMode && (
          <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-6 py-3 text-xs text-[#1E40AF] flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Regra de Segurança & Governança Ativa:</p>
              <p className="mt-0.5 text-[#1E3A8A]">
                O cargo <strong>"{currentUserCargo}"</strong> não possui permissão para editar cadastros diretamente.
                Suas alterações serão salvas como uma <strong>Solicitação de Alteração</strong> e encaminhadas para a
                aprovação de um Encarregado ou Líder.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.submit && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errors.submit}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Nome completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Carlos Eduardo Silva"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className={`w-full px-3 py-2 border rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#176B87] bg-white ${
                  errors.nome ? 'border-red-400 bg-red-50/30' : 'border-zinc-300'
                }`}
              />
              {errors.nome && <p className="text-[11px] text-red-600 mt-1">{errors.nome}</p>}
            </div>

            {/* Função */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Função <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Engenheiro Civil"
                value={formData.funcao}
                onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                className={`w-full px-3 py-2 border rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#176B87] bg-white ${
                  errors.funcao ? 'border-red-400 bg-red-50/30' : 'border-zinc-300'
                }`}
              />
              {errors.funcao && <p className="text-[11px] text-red-600 mt-1">{errors.funcao}</p>}
            </div>

            {/* CPF */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                CPF <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={handleCPFChange}
                maxLength={14}
                className={`w-full px-3 py-2 border rounded-xl text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#176B87] bg-white ${
                  errors.cpf ? 'border-red-400 bg-red-50/30' : 'border-zinc-300'
                }`}
              />
              {errors.cpf && <p className="text-[11px] text-red-600 mt-1">{errors.cpf}</p>}
            </div>

            {/* Data de Nascimento */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Data de nascimento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                className={`w-full px-3 py-2 border rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#176B87] bg-white ${
                  errors.data_nascimento ? 'border-red-400 bg-red-50/30' : 'border-zinc-300'
                }`}
              />
              {errors.data_nascimento && (
                <p className="text-[11px] text-red-600 mt-1">{errors.data_nascimento}</p>
              )}
            </div>

            {/* Obra */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Obra <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.obra_id}
                onChange={(e) => setFormData({ ...formData, obra_id: e.target.value })}
                className={`w-full px-3 py-2 border rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#176B87] bg-white cursor-pointer ${
                  errors.obra_id ? 'border-red-400 bg-red-50/30' : 'border-zinc-300'
                }`}
              >
                <option value="">Selecione uma obra...</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
              {errors.obra_id && <p className="text-[11px] text-red-600 mt-1">{errors.obra_id}</p>}
            </div>

            {/* Data do Exame */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Data do exame
              </label>
              <input
                type="date"
                value={formData.data_exame || ''}
                onChange={(e) => setFormData({ ...formData, data_exame: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#176B87] bg-white"
              />
            </div>

            {/* Data ASO */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Data ASO
              </label>
              <input
                type="date"
                value={formData.data_aso || ''}
                onChange={(e) => setFormData({ ...formData, data_aso: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#176B87] bg-white"
              />
            </div>

            {/* Previsão de Contratação */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Previsão de contratação <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.previsao_contratacao}
                onChange={(e) => setFormData({ ...formData, previsao_contratacao: e.target.value })}
                className={`w-full px-3 py-2 border rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#176B87] bg-white ${
                  errors.previsao_contratacao ? 'border-red-400 bg-red-50/30' : 'border-zinc-300'
                }`}
              />
              {errors.previsao_contratacao && (
                <p className="text-[11px] text-red-600 mt-1">{errors.previsao_contratacao}</p>
              )}
            </div>

            {/* Observações adicionais se estiver em modo solicitação */}
            {isRequestMode && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#1E3A8A] mb-1">
                  Justificativa / Observações da Solicitação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Atualizado cargo conforme promoção assinada pela gerência..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-blue-50/30"
                />
              </div>
            )}
          </div>

          {/* Buttons Footer */}
          <div className="pt-4 mt-6 border-t border-zinc-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>

            {isRequestMode ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors flex items-center space-x-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enviando solicitação...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Solicitação de Alteração</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#159A72] hover:bg-[#12805F] transition-colors flex items-center space-x-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Admissão (Direto)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

