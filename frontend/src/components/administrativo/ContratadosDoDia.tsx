/**
 * Aba "Contratados dia X" do módulo Administrativo.
 *
 * Mostra quem foi marcado como contratado naquele dia — mesmo depois de a
 * pessoa virar colaborador do efetivo. É só leitura: nada aqui altera,
 * exclui ou move registro nenhum. A lista vem do efetivo, filtrada pelo dia
 * em que o botão de contratar foi clicado.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Download, UserCheck, Users, AlertCircle, ExternalLink } from 'lucide-react';
import { fetchContratadosDoDia } from '../../services/api';
import type { Colaborador } from '../../types';
import { applyCPFMask, formatDateBR } from '../../utils/cpfMask';
import { downloadBlob } from '../../utils/excelUtils';

interface Props {
  /** Dia no formato AAAA-MM-DD */
  data: string;
  corEmpresa: string;
  /** Abre o colaborador no Efetivo Geral (opcional) */
  onVerNoEfetivo?: (colaborador: Colaborador) => void;
}

export const ContratadosDoDia: React.FC<Props> = ({ data, corEmpresa, onVerNoEfetivo }) => {
  const [lista, setLista] = useState<Colaborador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setIsLoading(true);
    setErro('');
    try {
      const res = await fetchContratadosDoDia(data);
      setLista(res.data || []);
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar os contratados deste dia.');
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  useEffect(() => { carregar(); }, [carregar]);

  /** Exporta a lista do dia em CSV (abre direto no Excel). */
  const exportar = () => {
    const colunas = ['Nome', 'Função', 'CPF', 'Chapa', 'Obra', 'Data de admissão', 'ASO'];
    const linhas = lista.map(c => [
      c.nome,
      c.funcao,
      applyCPFMask(c.cpf),
      c.numero_chapa || '',
      c.obra_nome || '',
      formatDateBR(c.data_admissao),
      c.data_aso ? formatDateBR(c.data_aso) : '',
    ]);
    const escapar = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [colunas, ...linhas].map(l => l.map(escapar).join(';')).join('\r\n');
    // BOM para o Excel entender os acentos
    downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), `Contratados_${data}.csv`);
  };

  return (
    <div className="bg-white border border-[#DDE3E8] rounded-2xl overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-[#DDE3E8] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${corEmpresa}14`, color: corEmpresa }}
          >
            <UserCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#17212B]">
              Contratados em {formatDateBR(data)}
            </h2>
            <p className="text-[11px] text-[#687582] mt-0.5">
              {isLoading ? 'Carregando...' : `${lista.length} ${lista.length === 1 ? 'pessoa' : 'pessoas'}`} ·
              já estão no Efetivo Geral. Esta lista é apenas para consulta.
            </p>
          </div>
        </div>
        <button
          onClick={exportar}
          disabled={isLoading || lista.length === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 border border-[#DDE3E8] hover:border-[#B6C2CC] rounded-xl text-xs font-semibold text-[#17212B] transition-colors cursor-pointer disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" /> Exportar lista
        </button>
      </div>

      {erro && (
        <div className="m-4 flex items-center gap-2 bg-[#FDEBEC] border border-[#F5B8BB] rounded-xl px-3.5 py-2.5">
          <AlertCircle className="w-4 h-4 text-[#D64550] shrink-0" />
          <p className="text-xs text-[#D64550]">{erro}</p>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: corEmpresa }} />
          <p className="mt-3 text-xs text-[#687582]">Carregando contratados...</p>
        </div>
      ) : lista.length === 0 ? (
        <div className="p-12 text-center">
          <Users className="w-10 h-10 text-[#B6C2CC] mx-auto mb-3" strokeWidth={1.4} />
          <h3 className="text-sm font-bold text-[#17212B]">Nenhuma contratação neste dia</h3>
          <p className="text-xs text-[#687582] mt-1">
            As abas aparecem automaticamente a cada dia em que alguém é marcado como contratado.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F8FAFB] border-b border-[#DDE3E8]">
                <th className="px-4 py-3 text-[10px] font-bold text-[#687582] uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#687582] uppercase tracking-wider">Nome</th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#687582] uppercase tracking-wider">Função</th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#687582] uppercase tracking-wider">CPF</th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#687582] uppercase tracking-wider">Chapa</th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#687582] uppercase tracking-wider">Obra</th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#687582] uppercase tracking-wider">Admissão</th>
                {onVerNoEfetivo && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F4]">
              {lista.map((c, i) => (
                <tr key={c.id} className="hover:bg-[#F8FAFB] transition-colors">
                  <td className="px-4 py-3 text-xs text-[#8995A1]">{i + 1}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-[#17212B]">{c.nome}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-[#F4F6F8] border border-[#E4E9ED] rounded-md text-[11px] font-semibold text-[#17212B]">
                      {c.funcao}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#687582] font-mono">{applyCPFMask(c.cpf)}</td>
                  <td className="px-4 py-3 text-xs text-[#17212B] font-semibold">{c.numero_chapa || '—'}</td>
                  <td className="px-4 py-3 text-xs text-[#687582]">{c.obra_codigo || c.obra_nome || '—'}</td>
                  <td className="px-4 py-3 text-xs text-[#687582]">{formatDateBR(c.data_admissao)}</td>
                  {onVerNoEfetivo && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onVerNoEfetivo(c)}
                        title="Abrir no Efetivo Geral"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#DDE3E8] hover:border-[#B6C2CC] rounded-lg text-[11px] font-semibold text-[#17212B] cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" /> Ver ficha
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
