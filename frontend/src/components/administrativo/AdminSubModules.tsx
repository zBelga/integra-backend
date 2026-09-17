import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Users, Search, Edit2, FileText } from 'lucide-react';
import { EditColaboradorModal } from './EditColaboradorModal';
import { updateColaborador } from '../../services/api';
import { Colaborador } from '../../types';
import { fetchColaboradores } from '../../services/api';
import { applyCPFMask, formatDateBR } from '../../utils/cpfMask';

interface AdminSubModuleViewProps {
  section: 'efetivo' | 'desligados' | 'ferias';
  obras: { id: string; nome: string; codigo: string }[];
  onBackToAdmissao: () => void;
  onOpenPerfil?: (colaborador: Colaborador) => void;
}

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export const AdminSubModuleView: React.FC<AdminSubModuleViewProps> = ({
  section,
  obras,
  onBackToAdmissao,
  onOpenPerfil,
}) => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingCol, setEditingCol] = useState<Colaborador | null>(null);

  const loadColaboradores = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchColaboradores({ search, limit: 500 });
      setColaboradores(res.data);
      setTotal(res.pagination.total);
    } catch {
      setColaboradores([]);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  const handleSaveCol = async (id: string, data: Partial<Colaborador>) => {
    await updateColaborador(id, data);
    setEditingCol(null);
    await loadColaboradores();
  };

  useEffect(() => {
    if (section === 'efetivo') loadColaboradores();
  }, [section, loadColaboradores]);

  if (section === 'desligados') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onBackToAdmissao} className="flex items-center gap-1.5 text-xs text-[#687582] hover:text-[#17212B] transition-colors cursor-pointer font-medium">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h2 className="text-lg font-bold text-[#17212B]">Desligados</h2>
        </div>
        <div className="bg-white rounded-xl border border-[#DDE3E8] p-12 text-center">
          <Users className="w-12 h-12 text-[#8995A1] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#17212B]">Nenhum desligamento registrado</p>
        </div>
      </div>
    );
  }

  if (section === 'ferias') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onBackToAdmissao} className="flex items-center gap-1.5 text-xs text-[#687582] hover:text-[#17212B] transition-colors cursor-pointer font-medium">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h2 className="text-lg font-bold text-[#17212B]">Férias</h2>
        </div>
        <div className="bg-white rounded-xl border border-[#DDE3E8] p-12 text-center">
          <Users className="w-12 h-12 text-[#8995A1] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#17212B]">Nenhuma férias programada</p>
        </div>
      </div>
    );
  }

  // Efetivo
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBackToAdmissao} className="flex items-center gap-1.5 text-xs text-[#687582] hover:text-[#17212B] transition-colors cursor-pointer font-medium">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div>
            <h2 className="text-lg font-bold text-[#17212B]">Efetivo</h2>
            <p className="text-xs text-[#687582]">{total} colaborador{total !== 1 ? 'es' : ''} ativo{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8995A1]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar colaborador..."
            className="pl-8 pr-3 py-2 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B87] w-52"
          />
        </div>
      </div>

      {onOpenPerfil && (
        <p className="text-xs text-[#687582] flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          Clique no nome do colaborador para ver o perfil e gerenciar documentos
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#DDE3E8] overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#176B87] border-t-transparent" />
            <p className="mt-3 text-xs text-[#687582]">Carregando efetivo...</p>
          </div>
        ) : colaboradores.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-[#8995A1] mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[#17212B]">Nenhum colaborador no efetivo</h3>
            <p className="text-xs text-[#687582] mt-1">Contrate colaboradores na aba de Admissões.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFB] text-[11px] font-bold text-[#687582] uppercase tracking-wider border-b border-[#DDE3E8]">
                  <th className="py-3 px-2 text-center">#</th>
                  <th className="py-3 px-1 text-center"></th>
                  <th className="py-3 px-2.5 text-center whitespace-nowrap">Registro</th>
                  <th className="py-3 px-3 whitespace-nowrap">Nome</th>
                  <th className="py-3 px-2.5 text-center whitespace-nowrap">Função</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">Adm.</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">1º Vencimento</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">2º Vencimento</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">RG</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">CPF</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">ASO</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">ASO Vencimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE3E8] text-[#17212B]">
                {colaboradores.map((col, index) => {
                  const venc1 = addDays(col.data_admissao, 44);
                  const venc2 = addDays(col.data_admissao, 89);
                  const asoVenc = col.data_aso ? addDays(col.data_aso, 364) : '';

                  const today = new Date();
                  const isExpiring = (dateStr: string) => {
                    const d = new Date(dateStr + 'T00:00:00');
                    const diff = (d.getTime() - today.getTime()) / 86400000;
                    return diff >= 0 && diff <= 30;
                  };
                  const isExpired = (dateStr: string) => {
                    const d = new Date(dateStr + 'T00:00:00');
                    return d.getTime() < today.getTime();
                  };

                  const dateBadge = (dateStr: string, highlight = false) => {
                    if (!dateStr || dateStr === '—') return <span className="text-[#8995A1]">—</span>;
                    const expired = highlight && isExpired(dateStr);
                    const expiring = highlight && !expired && isExpiring(dateStr);
                    return (
                      <span className={`inline-block px-1.5 py-0.5 rounded-md border font-semibold whitespace-nowrap ${
                        expired ? 'text-[#D64550] bg-[#FDEBEC] border-[#F5B8BB]' :
                        expiring ? 'text-[#D4890A] bg-[#FEF3E0] border-[#F8D99B]' :
                        'text-[#17212B] bg-[#F8FAFB] border-[#DDE3E8]'
                      }`}>
                        {formatDateBR(dateStr)}
                      </span>
                    );
                  };

                  return (
                    <tr key={col.id} className="hover:bg-[#F8FAFB] transition-colors">
                      <td className="py-2.5 px-2 text-center text-[#8995A1] text-[11px] font-medium select-none">{index + 1}</td>
                      <td className="py-2.5 px-1 text-center">
                        <button
                          onClick={() => setEditingCol(col)}
                          className="p-1 text-[#687582] hover:text-[#176B87] hover:bg-[#E8F3F6] rounded-md transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <span className="inline-block bg-[#E8F3F6] text-[#176B87] border border-[#C6E3EB] px-2 py-0.5 rounded-md font-bold text-[11px]">
                          {col.numero_chapa}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                        {onOpenPerfil ? (
                          <button
                            onClick={() => onOpenPerfil(col)}
                            className="text-[#176B87] hover:underline cursor-pointer font-semibold text-left flex items-center gap-1.5 group"
                            title="Ver perfil e documentos"
                          >
                            {col.nome}
                            <FileText className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          col.nome
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <span className="inline-block bg-[#F4F6F8] border border-[#DDE3E8] px-2 py-0.5 rounded-md font-medium text-[11px] whitespace-nowrap">
                          {col.funcao}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">{dateBadge(col.data_admissao)}</td>
                      <td className="py-2.5 px-2 text-center">{dateBadge(venc1, true)}</td>
                      <td className="py-2.5 px-2 text-center">{dateBadge(venc2, true)}</td>
                      <td className="py-2.5 px-2 text-center text-[#687582] whitespace-nowrap">
                        {col.rg || <span className="text-[#8995A1]">—</span>}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-[#687582] whitespace-nowrap text-[11px]">
                        {applyCPFMask(col.cpf)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {col.data_aso ? (
                          <span className="inline-block text-[#159A72] bg-[#E8F6F1] px-1.5 py-0.5 rounded-md border border-[#B8E8D9] font-semibold whitespace-nowrap">
                            {formatDateBR(col.data_aso)}
                          </span>
                        ) : <span className="text-[#8995A1]">—</span>}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {asoVenc ? dateBadge(asoVenc, true) : <span className="text-[#8995A1]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editingCol && (
        <EditColaboradorModal
          colaborador={editingCol}
          obras={obras}
          onSave={handleSaveCol}
          onClose={() => setEditingCol(null)}
        />
      )}
    </div>
  );
};
