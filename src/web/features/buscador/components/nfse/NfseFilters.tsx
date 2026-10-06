import React from 'react';
import { Calendar, Search, X } from 'lucide-react';
import type { NfseFilters as NfseFiltersType } from '../../features/nfse/nfse-view-model';

export interface NfseFiltersProps {
  filters: NfseFiltersType;
  onChange: (filters: Partial<NfseFiltersType>) => void;
  onSearch: () => void;
  onClear: () => void;
  loading?: boolean;
}

export const NfseFilters: React.FC<NfseFiltersProps> = ({
  filters,
  onChange,
  onSearch,
  onClear,
  loading = false,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 shadow-sm select-none">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
        <span className="text-xs font-semibold text-[var(--text-secondary)]">Período:</span>
        <input
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => onChange({ startDate: e.target.value || undefined })}
          className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-workspace)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-purple-500"
        />
        <span className="text-xs text-[var(--text-muted)]">até</span>
        <input
          type="date"
          value={filters.endDate || ''}
          onChange={(e) => onChange({ endDate: e.target.value || undefined })}
          className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-workspace)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-purple-500"
        />
      </div>

      <div className="flex-1 min-w-48">
        <div className="relative">
          <input
            type="text"
            value={filters.searchQuery || ''}
            onChange={(e) => onChange({ searchQuery: e.target.value || undefined })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSearch();
              }
            }}
            placeholder="Pesquisar por número, prestador, tomador ou chave..."
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-workspace)] pl-3 pr-8 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-purple-500"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onChange({ searchQuery: undefined })}
              className="absolute right-2.5 top-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSearch}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 disabled:opacity-40 transition cursor-pointer"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Filtrar</span>
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-40 transition cursor-pointer"
        >
          <span>Limpar</span>
        </button>
      </div>
    </div>
  );
};

