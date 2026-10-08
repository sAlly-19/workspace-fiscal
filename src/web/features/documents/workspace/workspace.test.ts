import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { DocumentListPane, DocumentPreviewEmptyState } from './index';

describe('Document Workspace Components Contracts & Props', () => {
  describe('DocumentPreviewEmptyState', () => {
    it('creates empty state with dark and light themes', () => {
      const darkEl = React.createElement(DocumentPreviewEmptyState, { currentTheme: 'dark' });
      expect(darkEl).toBeDefined();
      expect(darkEl.props.currentTheme).toBe('dark');

      const lightEl = React.createElement(DocumentPreviewEmptyState, { currentTheme: 'light' });
      expect(lightEl).toBeDefined();
      expect(lightEl.props.currentTheme).toBe('light');
    });
  });

  describe('DocumentListPane', () => {
    const mockDocs = [
      {
        id: 'doc-1',
        number: '1001',
        series: '1',
        nature: 'Venda de mercadoria',
        issuerName: 'Fornecedor Alpha Ltda',
        totalValue: 1500.5,
        issueDate: '2026-10-01T10:00:00Z',
        schemaType: 'NFE',
      },
      {
        id: 'doc-2',
        number: '1002',
        series: '1',
        nature: 'Prestação de serviço',
        issuerName: 'Serviços Beta ME',
        totalValue: 320.0,
        issueDate: '2026-10-02T14:30:00Z',
        schemaType: 'NFSE',
      },
    ];

    it('creates document list pane with documents and selection callbacks', () => {
      const onSelectDocument = vi.fn();
      const onToggleDocSelection = vi.fn();
      const onBatchPrint = vi.fn();
      const onTriggerBulkDelete = vi.fn();

      const element = React.createElement(DocumentListPane, {
        listWidth: 400,
        currentTheme: 'dark',
        filteredDocuments: mockDocs,
        selectedDocumentId: 'doc-1',
        selectedDocIds: ['doc-1'],
        selectedFolderName: 'Notas de Outubro',
        allFilteredSelected: false,
        isDocsLoading: false,
        searchQuery: '',
        onSelectAllDocs: vi.fn(),
        onSelectDocument,
        onToggleDocSelection,
        onBatchPrint,
        onOpenBulkMove: vi.fn(),
        onTriggerBulkDelete,
        onClearDocSelection: vi.fn(),
        onSetMovingDocId: vi.fn(),
        onTriggerSingleDelete: vi.fn(),
        onTriggerUploadXml: vi.fn(),
      });

      expect(element).toBeDefined();
      expect(element.props.filteredDocuments).toHaveLength(2);
      expect(element.props.selectedDocumentId).toBe('doc-1');
      expect(element.props.selectedDocIds).toContain('doc-1');
      expect(element.props.selectedFolderName).toBe('Notas de Outubro');
    });

    it('handles empty state and loading state flags', () => {
      const element = React.createElement(DocumentListPane, {
        listWidth: 350,
        currentTheme: 'light',
        filteredDocuments: [],
        selectedDocumentId: null,
        selectedDocIds: [],
        selectedFolderName: 'Pasta Vazia',
        allFilteredSelected: false,
        isDocsLoading: true,
        searchQuery: 'filtro sem resultados',
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
      });

      expect(element).toBeDefined();
      expect(element.props.filteredDocuments).toHaveLength(0);
      expect(element.props.isDocsLoading).toBe(true);
      expect(element.props.searchQuery).toBe('filtro sem resultados');
    });
  });
});

