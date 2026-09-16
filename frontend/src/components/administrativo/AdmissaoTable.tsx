import React from 'react';
import { Edit2, Trash2, Building, UserCheck, CheckCircle2 } from 'lucide-react';
import { Admissao } from '../../types';
import { applyCPFMask, formatDateBR } from '../../utils/cpfMask';

interface AdmissaoTableProps {
  admissoes: Admissao[];
  isLoading: boolean;
  onEdit: (admissao: Admissao) => void;
  onDelete: (admissao: Admissao) => void;
  onContratar: (admissao: Admissao) => void;
}

export const AdmissaoTable: React.FC<AdmissaoTableProps> = ({
  admissoes,
  isLoading,
  onEdit,
  onDelete,
  onContratar,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white p-8 text-center border-t border-[#DDE3E8]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#176B87] border-t-transparent"></div>
        <p className="mt-3 text-xs text-[#687582] font-medium">Carregando registros de admissão...</p>
      </div>
    );
  }

  if (admissoes.length === 0) {
    return (
      <div className="bg-white p-12 text-center border-t border-[#DDE3E8]">
        <UserCheck className="w-12 h-12 text-[#8995A1] mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-[#17212B]">Nenhuma admissão encontrada</h3>
        <p className="text-xs text-[#687582] mt-1 max-w-sm mx-auto">
          Tente ajustar os termos de pesquisa e filtros ou clique em "+ Nova admissão" para cadastrar um novo funcionário.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto xl:overflow-x-visible">
      <table className="w-full text-left border-collapse table-auto">
        <thead>
          <tr className="bg-[#F8FAFB] text-[11px] font-bold text-[#687582] uppercase tracking-wider border-b border-[#DDE3E8]">
            <th className="py-3 px-2 text-center whitespace-nowrap text-[#8995A1]">#</th>
            <th className="py-3 px-3 text-left whitespace-nowrap">Nome</th>
            <th className="py-3 px-2.5 text-center whitespace-nowrap">Função</th>
            <th className="py-3 px-2 text-center whitespace-nowrap">CPF</th>
            <th className="py-3 px-2.5 text-left whitespace-nowrap">Obra</th>
            <th className="py-3 px-2 text-center whitespace-nowrap">Data do Exame</th>
            <th className="py-3 px-2 text-center whitespace-nowrap">Data ASO</th>
            <th className="py-3 px-2 text-center whitespace-nowrap">Previsão Contratação</th>
            <th className="py-3 px-2.5 text-center whitespace-nowrap">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#DDE3E8] text-xs text-[#17212B] bg-white">
          {admissoes.map((adm, index) => (
            <tr key={adm.id} className="hover:bg-[#F8FAFB] transition-colors">
              {/* # */}
              <td className="py-2.5 px-2 text-center text-[#8995A1] font-medium text-[11px] whitespace-nowrap">
                {index + 1}
              </td>

              {/* Nome */}
              <td className="py-2.5 px-3 font-semibold text-[#17212B] whitespace-nowrap text-left">
                {adm.nome}
              </td>

              {/* Função */}
              <td className="py-2.5 px-2.5 text-[#17212B] whitespace-nowrap text-center">
                <span className="inline-block bg-[#F4F6F8] text-[#17212B] border border-[#DDE3E8] px-2 py-0.5 rounded-md font-medium text-[11px] whitespace-nowrap">
                  {adm.funcao}
                </span>
              </td>

              {/* CPF */}
              <td className="py-2.5 px-2 font-mono text-[#687582] whitespace-nowrap text-center text-[11px]">
                {applyCPFMask(adm.cpf)}
              </td>

              {/* Obra */}
              <td className="py-2.5 px-2.5 whitespace-nowrap text-left">
                <div className="flex items-center space-x-1 text-[#17212B] font-medium whitespace-nowrap">
                  <Building className="w-3.5 h-3.5 text-[#176B87] flex-shrink-0" />
                  <span title={adm.obra_nome}>{adm.obra_codigo || adm.obra_nome || 'N/A'}</span>
                </div>
              </td>

              {/* Data do exame */}
              <td className="py-2.5 px-2 text-[#687582] whitespace-nowrap text-center text-[11px]">
                {adm.data_exame ? (
                  <span className="inline-block text-[#17212B] bg-[#F8FAFB] px-1.5 py-0.5 rounded-md border border-[#DDE3E8] font-medium whitespace-nowrap">
                    {formatDateBR(adm.data_exame)}
                  </span>
                ) : (
                  <span className="text-[#8995A1] text-xs">—</span>
                )}
              </td>

              {/* Data ASO */}
              <td className="py-2.5 px-2 text-[#687582] whitespace-nowrap text-center text-[11px]">
                {adm.data_aso ? (
                  <span className="inline-block text-[#159A72] bg-[#E8F6F1] px-1.5 py-0.5 rounded-md border border-[#B8E8D9] font-semibold whitespace-nowrap">
                    {formatDateBR(adm.data_aso)}
                  </span>
                ) : (
                  <span className="text-[#8995A1] text-xs">—</span>
                )}
              </td>

              {/* Previsão de contratação */}
              <td className="py-2.5 px-2 whitespace-nowrap text-center text-[11px]">
                <span className={`inline-block px-2 py-0.5 rounded-md border font-bold whitespace-nowrap ${adm.previsao_contratacao ? 'text-[#176B87] bg-[#E8F3F6] border-[#C6E3EB]' : 'text-[#8995A1] bg-[#F8FAFB] border-[#DDE3E8]'}`}>
                  {adm.previsao_contratacao ? formatDateBR(adm.previsao_contratacao) : 'Não inf.'}
                </span>
              </td>

              {/* Ações */}
              <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                <div className="flex items-center justify-center space-x-1.5">
                  <button
                    onClick={() => onEdit(adm)}
                    className="p-1 text-[#687582] hover:text-[#176B87] hover:bg-[#E8F3F6] rounded-md transition-colors cursor-pointer"
                    title="Editar Admissão"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(adm)}
                    className="p-1 text-[#687582] hover:text-[#D64550] hover:bg-[#FDEBEC] rounded-md transition-colors cursor-pointer"
                    title="Excluir Admissão"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onContratar(adm)}
                    className="p-1 text-[#687582] hover:text-[#159A72] hover:bg-[#E8F6F1] rounded-md transition-colors cursor-pointer"
                    title="Contratar — mover para Efetivo"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
