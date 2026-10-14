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
});

