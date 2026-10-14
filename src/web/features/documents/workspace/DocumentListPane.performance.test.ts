import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentListPane } from './DocumentListPane';

describe('DocumentListPane - Performance & Progressive Rendering (IMP-013)', () => {
  const generateMockDocs = (count: number) => {
    return Array.from({ length: count }).map((_, idx) => ({
      id: `doc-${idx + 1}`,
      type: 'NF-e',
      number: `${1000 + idx}`,
      series: '1',
      issuerName: `Fornecedor ${idx + 1}`,
      totalAmount: 100 + idx,
      issueDate: '2026-10-01T12:00:00Z',
    }));
  };

  it('renders only the initial batch (50 cards) when given 150 documents to prevent DOM bloat', () => {
    const docs150 = generateMockDocs(150);
    const html = renderToStaticMarkup(
      React.createElement(DocumentListPane, {
        listWidth: 400,
        currentTheme: 'dark',
        filteredDocuments: docs150,
        selectedDocumentId: null,
        selectedDocIds: [],
        selectedFolderName: 'Todas as Notas',
        allFilteredSelected: false,
        isDocsLoading: false,
        searchQuery: '',
        onSelectAllDocs: vi.fn(),
        onSelectDocument: vi.fn(),
        onToggleDocSelection: vi.fn(),
        onBatchPrint: vi.fn(),
        onOpenBulkMove: vi.fn(),
        onTriggerBulkDelete: vi.fn(),
        onClearDocSelection: vi.fn(),
        onSetMovingDocId: vi.fn(),
        onTriggerSingleDelete: vi.fn(),
        onTriggerUploadXml: vi.fn(),
      })
    );

    // Header should reflect the full count (150)
    expect(html).toContain('150');
    // Only doc-1 through doc-50 should be rendered
    expect(html).toContain('data-doc-id="doc-1"');
    expect(html).toContain('data-doc-id="doc-50"');
    expect(html).not.toContain('data-doc-id="doc-51"');
    expect(html).not.toContain('data-doc-id="doc-150"');
  });

  it('ensures batch selection (onSelectAllDocs) operates on the full collection, not just the rendered slice', () => {
    const docs150 = generateMockDocs(150);
    const onSelectAllDocs = vi.fn();

    const html = renderToStaticMarkup(
      React.createElement(DocumentListPane, {
        listWidth: 400,
        currentTheme: 'light',
        filteredDocuments: docs150,
        selectedDocumentId: null,
        selectedDocIds: docs150.map((d) => d.id), // All 150 selected
        selectedFolderName: 'Notas de Outubro',
        allFilteredSelected: true,
        isDocsLoading: false,
        searchQuery: '',
        onSelectAllDocs,
        onSelectDocument: vi.fn(),
        onToggleDocSelection: vi.fn(),
        onBatchPrint: vi.fn(),
        onOpenBulkMove: vi.fn(),
        onTriggerBulkDelete: vi.fn(),
        onClearDocSelection: vi.fn(),
        onSetMovingDocId: vi.fn(),
        onTriggerSingleDelete: vi.fn(),
        onTriggerUploadXml: vi.fn(),
      })
    );

    // Should display all selected count in toolbar and header
    expect(html).toContain('150');
    expect(html).toContain('selecionados');
    expect(html).toContain('150 sel.');
  });

  it('automatically expands rendered batch to include the selected document if it is beyond 50', () => {
    const docs150 = generateMockDocs(150);
    // Select document #85
    const html = renderToStaticMarkup(
      React.createElement(DocumentListPane, {
        listWidth: 400,
        currentTheme: 'dark',
        filteredDocuments: docs150,
        selectedDocumentId: 'doc-85',
        selectedDocIds: [],
        selectedFolderName: 'Todas as Notas',
        allFilteredSelected: false,
        isDocsLoading: false,
        searchQuery: '',
        onSelectAllDocs: vi.fn(),
        onSelectDocument: vi.fn(),
        onToggleDocSelection: vi.fn(),
        onBatchPrint: vi.fn(),
        onOpenBulkMove: vi.fn(),
        onTriggerBulkDelete: vi.fn(),
        onClearDocSelection: vi.fn(),
        onSetMovingDocId: vi.fn(),
        onTriggerSingleDelete: vi.fn(),
        onTriggerUploadXml: vi.fn(),
      })
    );

    // doc-85 should be rendered because of auto-expansion
    expect(html).toContain('data-doc-id="doc-85"');
  });
});
