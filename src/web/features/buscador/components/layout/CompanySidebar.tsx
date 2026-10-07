import React from 'react';
import { Company, CertificateInfo } from '@/core/buscador/domain/types';
import { CompanyList } from '../Sidebar/CompanyList';
import { CertificateCard } from '../Sidebar/CertificateCard';

export interface CompanySidebarProps {
  companies: Company[];
  activeCompany: Company | null;
  companyCert: CertificateInfo | null;
  onSelectCompany: (id: number) => void;
  onNewCompany: () => void;
  onEditCompany?: (company: Company) => void;
  onDeleteCompany?: (company: Company) => void;
  onFilterNFeOnly: (id: number) => void;
  onFilterCTeOnly: (id: number) => void;
  onFilterNFSeOnly: (id: number) => void;
  onFilterAllTypes: (id: number) => void;
  activeFilter?: 'NFE' | 'CTE' | 'NFSE' | 'ALL';
  onOpenCertModal: () => void;
}

export const CompanySidebar: React.FC<CompanySidebarProps> = ({
  companies,
  activeCompany,
  companyCert,
  onSelectCompany,
  onNewCompany,
  onEditCompany,
  onDeleteCompany,
  onFilterNFeOnly,
  onFilterCTeOnly,
  onFilterNFSeOnly,
  onFilterAllTypes,
  activeFilter,
  onOpenCertModal,
}) => {
  return (
    <aside
      data-testid="company-sidebar"
      className="flex w-72 shrink-0 select-none flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--surface-sidebar)]"
    >
      <CompanyList
        companies={companies}
        activeCompany={activeCompany}
        onSelectCompany={onSelectCompany}
        onNewCompany={onNewCompany}
        onEditCompany={onEditCompany}
        onDeleteCompany={onDeleteCompany}
        onFilterNFeOnly={onFilterNFeOnly}
        onFilterCTeOnly={onFilterCTeOnly}
        onFilterNFSeOnly={onFilterNFSeOnly}
        onFilterAllTypes={onFilterAllTypes}
        activeFilter={activeFilter}
      />
      <CertificateCard
        activeCompany={activeCompany}
        companyCert={companyCert}
        onOpenCertModal={onOpenCertModal}
      />
    </aside>
  );
};
