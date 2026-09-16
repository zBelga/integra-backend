import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  ArrowRight, 
  HardHat, 
  Users, 
  Briefcase,
  Edit2,
  Trash2
} from 'lucide-react';
import { Empresa } from '../../types';
import { EmpresaModal } from './EmpresaModal';
import { getCompanyTheme } from '../../utils/theme';

interface EmpresaSelectionProps {
  empresas: Empresa[];
  selectedEmpresa: Empresa | null;
  onSelectEmpresa: (empresa: Empresa) => void;
  onCreateEmpresa: (empresa: Omit<Empresa, 'id' | 'obrasCount' | 'colaboradoresCount'>) => void;
  onUpdateEmpresa?: (empresa: Omit<Empresa, 'id' | 'obrasCount' | 'colaboradoresCount'>, id?: string) => void;
  onDeleteEmpresa?: (id: string) => void;
}

export const EmpresaSelection: React.FC<EmpresaSelectionProps> = ({
  empresas,
  selectedEmpresa,
  onSelectEmpresa,
  onCreateEmpresa,
  onUpdateEmpresa,
  onDeleteEmpresa,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);

  const filteredEmpresas = empresas.filter(
    (emp) =>
      emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.cnpj.includes(searchTerm) ||
      emp.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreateModal = () => {
    setEditingEmpresa(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, emp: Empresa) => {
    e.stopPropagation();
    setEditingEmpresa(emp);
    setIsModalOpen(true);
  };

  const handleSaveEmpresa = (data: Omit<Empresa, 'id' | 'obrasCount' | 'colaboradoresCount'>, id?: string) => {
    if (id && onUpdateEmpresa) {
      onUpdateEmpresa(data, id);
    } else {
      onCreateEmpresa(data);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string, nome: string) => {
    e.stopPropagation();
    if (window.confirm(`Deseja realmente excluir "${nome}"? Esta ação não pode ser desfeita.`)) {
      onDeleteEmpresa?.(id);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#F4F6F8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl border border-[#DDE3E8] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-[#E8F3F6] border border-[#C6E3EB] text-[#176B87] px-3 py-1 rounded-full text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5 text-[#176B87]" />
              <span>Multi-Tenant & Identidade Visual</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17212B] tracking-tight">
              Selecione a Empresa
            </h1>
            <p className="text-[#687582] text-xs sm:text-sm leading-relaxed">
              Escolha a organização com a qual deseja operar. Cada empresa possui seu próprio logotipo e cor tema personalizada para os módulos corporativos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-[#176B87] hover:bg-[#0F536A] text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs transition-all hover:shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Nova Empresa</span>
            </button>
          </div>
        </div>

        {/* Search and Filters bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-[#8995A1] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, razão social ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] placeholder-[#8995A1] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] shadow-2xs"
            />
          </div>

          <div className="text-xs text-[#687582] font-medium self-end sm:self-center">
            Mostrando <strong className="text-[#17212B]">{filteredEmpresas.length}</strong> de {empresas.length} empresas disponíveis
          </div>
        </div>

        {/* Empresas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmpresas.map((emp) => {
            const isSelected = selectedEmpresa?.id === emp.id;
            const empColor = emp.corPrimaria || '#176B87';
            const theme = getCompanyTheme(empColor);

            return (
              <div
                key={emp.id}
                onClick={() => onSelectEmpresa(emp)}
                className={`group relative bg-white rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between hover:shadow-md ${
                  isSelected
                    ? 'ring-2 shadow-md'
                    : 'border-[#DDE3E8]'
                }`}
                style={{
                  borderColor: isSelected ? empColor : undefined,
                  boxShadow: isSelected ? theme.shadowLight : undefined,
                }}
              >
                {/* Top solid accent bar in company's custom color */}
                <div 
                  className="h-2 w-full transition-all"
                  style={{ backgroundColor: empColor }}
                />

                <div className="p-6 space-y-4">
                  {/* Top row: Avatar/Image + status + edit button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      {emp.logoUrl ? (
                        <div className="w-13 h-13 rounded-xl overflow-hidden border border-[#DDE3E8] bg-white shadow-2xs flex-shrink-0 flex items-center justify-center">
                          <img 
                            src={emp.logoUrl} 
                            alt={emp.nome} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div 
                          className="w-13 h-13 rounded-xl flex items-center justify-center font-extrabold text-base text-white shadow-2xs flex-shrink-0"
                          style={{ backgroundColor: empColor }}
                        >
                          {emp.nome.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="flex items-center space-x-1.5">
                        <span 
                          className="w-3 h-3 rounded-full border border-white shadow-2xs" 
                          style={{ backgroundColor: empColor }}
                          title={`Cor do tema: ${empColor}`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E8F6F1] text-[#159A72] border border-[#B8E8D9]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#159A72]"></span>
                        <span>{emp.status}</span>
                      </span>

                      {/* Edit Company (Image & Color) Button */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModal(e, emp)}
                        title="Editar imagem, cor e dados da empresa"
                        className="p-1.5 text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] rounded-lg border border-transparent hover:border-[#DDE3E8] transition-all cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {/* Delete Company Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, emp.id, emp.nome)}
                        title="Excluir empresa"
                        className="p-1.5 text-[#687582] hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Info */}
                  <div>
                    <h3 
                      className="text-base font-bold text-[#17212B] transition-colors leading-snug"
                    >
                      {emp.nome}
                    </h3>
                    <p className="text-xs text-[#687582] mt-0.5 truncate font-mono">
                      CNPJ: {emp.cnpj}
                    </p>
                    <p className="text-[11px] text-[#687582] mt-1 truncate">
                      {emp.razaoSocial}
                    </p>
                  </div>

                  {/* Quick Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#DDE3E8] text-xs">
                    <div className="bg-[#F8FAFB] p-2.5 rounded-xl border border-[#DDE3E8] flex items-center space-x-2">
                      <HardHat 
                        className="w-4 h-4 flex-shrink-0" 
                        style={{ color: empColor }}
                      />
                      <div>
                        <p className="text-[10px] text-[#687582] uppercase font-semibold">Obras</p>
                        <p className="font-bold text-[#17212B]">{emp.obrasCount ?? 0} ativas</p>
                      </div>
                    </div>

                    <div className="bg-[#F8FAFB] p-2.5 rounded-xl border border-[#DDE3E8] flex items-center space-x-2">
                      <Users className="w-4 h-4 text-[#687582] flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-[#687582] uppercase font-semibold">Equipe</p>
                        <p className="font-bold text-[#17212B]">{emp.colaboradoresCount ?? 0} membros</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer in company's custom theme */}
                <div 
                  className="px-6 py-3.5 border-t border-[#DDE3E8] flex items-center justify-between text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: theme.bgLight,
                  }}
                >
                  <span className="flex items-center space-x-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#687582]" />
                    <span className="text-[#687582] text-[11px] truncate max-w-[140px]">{emp.segmento}</span>
                  </span>
                  <div 
                    className="flex items-center space-x-1 font-bold"
                    style={{ color: empColor }}
                  >
                    <span>Acessar Módulos</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredEmpresas.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#DDE3E8] p-12 text-center space-y-3">
            <Building2 className="w-12 h-12 text-[#8995A1] mx-auto" />
            <h3 className="text-base font-bold text-[#17212B]">Nenhuma empresa encontrada</h3>
            <p className="text-xs text-[#687582] max-w-sm mx-auto">
              Não encontramos nenhuma empresa com o termo "{searchTerm}". Tente outra busca ou cadastre uma nova organização.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-2 px-4 py-2 bg-[#176B87] text-white rounded-xl text-xs font-semibold hover:bg-[#0F536A] transition-colors inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Nova Empresa</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal Cadastro / Edição de Empresa */}
      <EmpresaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEmpresa}
        editingEmpresa={editingEmpresa}
      />
    </div>
  );
};
