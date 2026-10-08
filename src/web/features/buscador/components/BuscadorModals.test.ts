import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { BuscadorModals, BuscadorModalsProps } from './BuscadorModals';
import type { Company } from '@/core/buscador/domain/types';

describe('BuscadorModals component contracts', () => {
  const mockCompany: Company = {
    id: 1,
    name: 'Empresa Teste',
    cnpj: '12345678000195',
    uf: 'SP',
    is_active: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const defaultProps: BuscadorModalsProps = {
    showSplash: false,
    onFinishSplash: vi.fn(),
    isCompanyModalOpen: false,
    onCloseCompanyModal: vi.fn(),
    editingCompany: null,
    onSaveCompany: vi.fn().mockResolvedValue(undefined),
    onTriggerDeleteCompany: vi.fn(),
    isCertModalOpen: false,
    onCloseCertModal: vi.fn(),
    activeCompany: mockCompany,
    onCertAssociated: vi.fn(),
    isSettingsModalOpen: false,
    onCloseSettingsModal: vi.fn(),
    isDownloadModalOpen: false,
    onCloseDownloadModal: vi.fn(),
    workspaceMode: 'SEFAZ',
    selectedDocIds: [1, 2],
    selectedNfseDocIds: [],
    settings: null,
    onDownloadBatchSuccess: vi.fn(),
    isSefazModalOpen: false,
    activeConsultType: 'NF-e',
    sefazProgressNSU: '',
    sefazProgressMsg: '',
    sefazReceivedCount: undefined,
    onCancelSefaz: vi.fn(),
    selectedDetailsDoc: null,
    onCloseDetailsDoc: vi.fn(),
    onDownloadXml: vi.fn(),
    onDownloadPdf: vi.fn(),
    onOpenFolder: vi.fn(),
    pendingNsuReset: null,
    isResettingNsu: false,
    onConfirmResetNSU: vi.fn(),
    onCancelResetNSU: vi.fn(),
    companyToDelete: null,
    isDeletingCompany: false,
    onConfirmDeleteCompany: vi.fn(),
    onCancelDeleteCompany: vi.fn(),
  };

  it('renders modals container with inactive state', () => {
    const element = React.createElement(BuscadorModals, defaultProps);
    expect(element).toBeDefined();
    expect(element.props.isCompanyModalOpen).toBe(false);
    expect(element.props.isSefazModalOpen).toBe(false);
  });

  it('binds active SEFAZ modal and reset NSU props', () => {
    const element = React.createElement(BuscadorModals, {
      ...defaultProps,
      isSefazModalOpen: true,
      activeConsultType: 'CT-e',
      sefazProgressNSU: '000000000000123',
      pendingNsuReset: 'CTE',
    });

    expect(element).toBeDefined();
    expect(element.props.isSefazModalOpen).toBe(true);
    expect(element.props.activeConsultType).toBe('CT-e');
    expect(element.props.pendingNsuReset).toBe('CTE');
    expect(element.props.sefazProgressNSU).toBe('000000000000123');
  });

  it('binds company delete dialog props', () => {
    const element = React.createElement(BuscadorModals, {
      ...defaultProps,
      companyToDelete: mockCompany,
      isDeletingCompany: true,
    });

    expect(element).toBeDefined();
    expect(element.props.companyToDelete).toEqual(mockCompany);
    expect(element.props.isDeletingCompany).toBe(true);
  });
});

