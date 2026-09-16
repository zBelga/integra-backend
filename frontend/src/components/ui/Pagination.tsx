import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PaginationMeta } from '../../types';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  isLoading?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  meta,
  onPageChange,
  onLimitChange,
  isLoading,
}) => {
  const { total, page, limit, totalPages } = meta;

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="bg-white px-4 py-3 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
      {/* Left: Total records info & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          Mostrando <span className="font-semibold text-black">{startRecord}</span> a{' '}
          <span className="font-semibold text-black">{endRecord}</span> de{' '}
          <span className="font-semibold text-black">{total}</span> registros
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="limit-select" className="text-zinc-500">
            Exibir por página:
          </label>
          <select
            id="limit-select"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            disabled={isLoading}
            className="border border-zinc-300 rounded-md px-2 py-1 text-black bg-white focus:outline-none focus:ring-2 focus:ring-red-600 font-medium"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Right: Previous / Next controls */}
      <div className="flex items-center space-x-2">
        <span className="mr-2 text-zinc-500">
          Página <span className="font-semibold text-black">{page}</span> de{' '}
          <span className="font-semibold text-black">{totalPages}</span>
        </span>

        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="p-1.5 rounded-md border border-zinc-300 text-zinc-700 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Página Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className="p-1.5 rounded-md border border-zinc-300 text-zinc-700 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Próxima Página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
