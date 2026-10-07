import React from 'react';
import { Building2, FileStack, Plus, Pencil, Trash2 } from 'lucide-react';
import { Company } from '@/core/buscador/domain/types';
import { formatCNPJ } from '@/core/buscador/domain/cnpj';
import { getUfAcronym } from '@/core/buscador/domain/uf';

export interface CompanyListProps {
  companies: Company[];
  activeCompany: Company | null;
  onSelectCompany: (id: number) => void;
  onNewCompany: () => void;
  onEditCompany?: (company: Company) => void;
  onDeleteCompany?: (company: Company) => void;
  onFilterNFeOnly: (id: number) => void;
  onFilterCTeOnly: (id: number) => void;
  onFilterNFSeOnly: (id: number) => void;
  onFilterAllTypes: (id: number) => void;
  activeFilter?: 'NFE' | 'CTE' | 'NFSE' | 'ALL';
}

export const CompanyList: React.FC<CompanyListProps> = ({
  companies,
  activeCompany,
  onSelectCompany,
  onNewCompany,
  onEditCompany,
  onDeleteCompany,
  onFilterNFeOnly,
  onFilterCTeOnly,
  onFilterNFSeOnly,
  onFilterAllTypes,
  activeFilter = 'ALL',
}) => (
  <div className="flex-1 overflow-y-auto p-3">
    <div className="mb-3 flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        Empresas
      </span>
      <button
        type="button"
        onClick={onNewCompany}
        className="rounded border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1 text-[var(--primary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--primary-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
        aria-label="Nova empresa"
        title="Cadastrar nova empresa"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>

    {companies.length === 0 && (
      <p className="rounded border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 text-xs text-[var(--text-muted)]">
        Cadastre uma empresa para começar.
      </p>
    )}

    <div className="space-y-1.5">
      {companies.map((company) => {
        const isActive = activeCompany?.id === company.id;
        return (
          <div
            key={company.id}
            className={`group/item rounded-md border p-2.5 transition ${
              isActive
                ? 'border-[var(--primary)] bg-[var(--surface-selected)] text-[var(--text-primary)] shadow-xs'
                : 'border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <div className="flex items-start justify-between gap-1">
              <button
                type="button"
                className="min-w-0 flex-1 text-left focus:outline-none cursor-pointer"
                onClick={() => onSelectCompany(company.id)}
              >
                <div className="flex items-center gap-2">
                  <Building2 className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} />
                  <span
                    className="truncate text-xs font-semibold"
                    title={company.name}
                  >
                    {company.name}
                  </span>
                </div>
                <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                  {formatCNPJ(company.cnpj)} · {getUfAcronym(company.uf)}
                </span>
              </button>

              <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                {onEditCompany && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCompany(company);
                    }}
                    title="Editar Empresa"
                    aria-label="Editar Empresa"
                    className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
                {onDeleteCompany && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCompany(company);
                    }}
                    title="Excluir Empresa"
                    aria-label="Excluir Empresa"
                    className="rounded p-1 text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-500 transition cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {isActive && (
              <div className="mt-2.5 grid grid-cols-4 gap-1 border-t border-[var(--border-subtle)] pt-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => onFilterNFeOnly(company.id)}
                  title="Filtrar NF-e"
                  className={`rounded border py-1 font-medium transition cursor-pointer ${
                    activeFilter === 'NFE'
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white font-semibold'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-panel)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  NF-e
                </button>
                <button
                  type="button"
                  onClick={() => onFilterCTeOnly(company.id)}
                  title="Filtrar CT-e"
                  className={`rounded border py-1 font-medium transition cursor-pointer ${
                    activeFilter === 'CTE'
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white font-semibold'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-panel)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  CT-e
                </button>
                <button
                  type="button"
                  onClick={() => onFilterNFSeOnly(company.id)}
                  title="Filtrar NFS-e"
                  className={`rounded border py-1 font-medium transition cursor-pointer ${
                    activeFilter === 'NFSE'
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white font-semibold'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-panel)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  NFS-e
                </button>
                <button
                  type="button"
                  onClick={() => onFilterAllTypes(company.id)}
                  aria-label="Todos os tipos"
                  title="Todos os tipos"
                  className={`flex items-center justify-center rounded border py-1 font-medium transition cursor-pointer ${
                    activeFilter === 'ALL'
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white font-semibold'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-panel)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <FileStack className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
