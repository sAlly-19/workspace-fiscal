import { describe, it, expect } from 'vitest';
import React from 'react';
import { PreviewToolbar } from './PreviewToolbar';

describe('PreviewToolbar - Fiscal Status Pill (IMP-019)', () => {
  const defaultProps = {
    currentTheme: 'dark',
    mode: 'visualizar' as const,
    setMode: () => {},
    zoomLevel: 100,
    handleZoomIn: () => {},
    handleZoomOut: () => {},
    handleZoomReset: () => {},
    handleFitWidth: () => {},
    copiedKey: false,
    handleCopyKey: () => {},
    copiedXml: false,
    handleCopyXml: () => {},
    handleDownloadXml: () => {},
    handlePrint: () => {},
  };

  it('renders green [✓ Autorizada] pill for cStat 100 or 150', () => {
    const tree100 = PreviewToolbar({
      ...defaultProps,
      protocolStatus: '100',
      hasAuthorizationProtocol: true,
    });
    const serialized100 = JSON.stringify(tree100);
    expect(serialized100).toContain('Autorizada');

    const tree150 = PreviewToolbar({
      ...defaultProps,
      protocolStatus: '150',
    });
    const serialized150 = JSON.stringify(tree150);
    expect(serialized150).toContain('Autorizada');
  });

  it('renders red [✕ Cancelada/Denegada] pill for cancelled/denied codes', () => {
    const tree101 = PreviewToolbar({
      ...defaultProps,
      protocolStatus: '101',
    });
    expect(JSON.stringify(tree101)).toContain('Cancelada/Denegada');

    const treeDenied = PreviewToolbar({
      ...defaultProps,
      protocolStatus: '302',
    });
    expect(JSON.stringify(treeDenied)).toContain('Cancelada/Denegada');

    const treeStatus = PreviewToolbar({
      ...defaultProps,
      documentStatus: 'CANCELLED',
    });
    expect(JSON.stringify(treeStatus)).toContain('Cancelada/Denegada');
  });

  it('renders amber [! Sem Protocolo] pill when protocol is absent', () => {
    const treeNoProt = PreviewToolbar({
      ...defaultProps,
      hasAuthorizationProtocol: false,
    });
    expect(JSON.stringify(treeNoProt)).toContain('Sem Protocolo');
  });

  describe('In-Page Document Search', () => {
    it('renders search input with placeholder and counter when search is active', () => {
      const tree = PreviewToolbar({
        ...defaultProps,
        searchTerm: '123456',
        setSearchTerm: () => {},
        searchCurrentIndex: 0,
        searchTotalCount: 4,
      });
      const serialized = JSON.stringify(tree);
      expect(serialized).toContain('Buscar na nota...');
      expect(serialized).toContain('1/4');
    });

    it('renders 0/0 when there are no search occurrences', () => {
      const tree = PreviewToolbar({
        ...defaultProps,
        searchTerm: 'termo_sem_match',
        setSearchTerm: () => {},
        searchCurrentIndex: 0,
        searchTotalCount: 0,
      });
      expect(JSON.stringify(tree)).toContain('0/0');
    });
  });
});

