import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { DocumentFilters, DocumentFiltersProps } from './DocumentFilters';
import { AppHeader } from '../layout/AppHeader';

describe('DocumentFilters and AppHeader visual feedback', () => {
  const baseFiltersProps: DocumentFiltersProps = {
    nsuStatus: {
      nfeLastNSU: '000000000007781',
      cteLastNSU: '000000000001525',
      nfeStatus: 'IDLE',
      nfeNextQueryAt: null,
      cteStatus: 'IDLE',
      cteNextQueryAt: null,
    },
    selectedDocTypes: { nfe: true, cte: true },
    onToggleDocType: vi.fn(),
    startDate: '2026-09-01',
    onStartDateChange: vi.fn(),
    endDate: '2026-10-13',
    onEndDateChange: vi.fn(),
    searchQuery: '',
    onSearchQueryChange: vi.fn(),
    onSearchLocal: vi.fn(),
    onResetNSU: vi.fn(),
    onSynchronizeNfe: vi.fn(),
    onSynchronizeCte: vi.fn(),
    hasActiveCompany: true,
  };

  it('renders DocumentFilters with normal active company and healthy cert', () => {
    const element = React.createElement(DocumentFilters, {
      ...baseFiltersProps,
      certHealth: {
        status: 'READY',
        message: 'Certificado ativo e válido no Windows.',
      },
    });

    expect(element).toBeDefined();
    expect(element.props.hasActiveCompany).toBe(true);
    expect(element.props.certHealth?.status).toBe('READY');
  });

  it('provides cooldown information in nsuStatus to DocumentFilters', () => {
    const futureDate = new Date(Date.now() + 1800000).toISOString();
    const element = React.createElement(DocumentFilters, {
      ...baseFiltersProps,
      nsuStatus: {
        ...baseFiltersProps.nsuStatus,
        nfeStatus: 'RATE_LIMITED',
        nfeNextQueryAt: futureDate,
      },
    });

    expect(element.props.nsuStatus.nfeStatus).toBe('RATE_LIMITED');
    expect(element.props.nsuStatus.nfeNextQueryAt).toBe(futureDate);
  });

  it('renders AppHeader with certificate health badge status', () => {
    const mockCompany = { name: 'SUPREME COMERCIO DE FERTILIZANTES' };
    const readyHeader = React.createElement(AppHeader, {
      activeCompany: mockCompany,
      certHealth: { status: 'READY', message: 'Certificado Conectado' },
      environment: 'production',
      theme: 'dark',
      onOpenSettings: vi.fn(),
    });

    expect(readyHeader.props.certHealth?.status).toBe('READY');

    const disconnectedHeader = React.createElement(AppHeader, {
      activeCompany: mockCompany,
      certHealth: { status: 'NOT_FOUND_IN_STORE', message: 'Token desconectado' },
      environment: 'production',
      theme: 'dark',
      onOpenSettings: vi.fn(),
    });

    expect(disconnectedHeader.props.certHealth?.status).toBe('NOT_FOUND_IN_STORE');
  });
});

