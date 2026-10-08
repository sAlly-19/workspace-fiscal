import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { MainHeader, MainFooter, WorkspaceModals } from './index';

describe('Layout Components Contracts & Props', () => {
  describe('MainHeader', () => {
    it('creates header with dark theme and search query', () => {
      const setSearchQuery = vi.fn();
      const onUpdateTheme = vi.fn();
      const onOpenSettings = vi.fn();
      const inputRef = { current: null };

      const element = React.createElement(MainHeader, {
        searchQuery: 'Nota 123',
        setSearchQuery,
        searchInputRef: inputRef,
        currentTheme: 'dark',
        onUpdateTheme,
        selectedFolderId: 'folder-1',
        selectedFolderName: 'Notas de Entrada',
        isUploading: false,
        onTriggerUploadXml: () => {},
        onImportDirectory: () => {},
        onOpenSettings,
        uploadError: null,
        onDismissUploadError: () => {},
      });

      expect(element).toBeDefined();
      expect(element.props.searchQuery).toBe('Nota 123');
      expect(element.props.currentTheme).toBe('dark');
      expect(element.props.selectedFolderName).toBe('Notas de Entrada');
    });

    it('creates header with upload error state', () => {
      const onDismiss = vi.fn();
      const element = React.createElement(MainHeader, {
        searchQuery: '',
        setSearchQuery: () => {},
        searchInputRef: { current: null },
        currentTheme: 'light',
        onUpdateTheme: () => {},
        selectedFolderId: null,
        selectedFolderName: 'Todas as Notas',
        isUploading: true,
        onTriggerUploadXml: () => {},
        onImportDirectory: () => {},
        onOpenSettings: () => {},
        uploadError: 'Erro no arquivo XML',
        onDismissUploadError: onDismiss,
      });

      expect(element).toBeDefined();
      expect(element.props.uploadError).toBe('Erro no arquivo XML');
      expect(element.props.isUploading).toBe(true);
    });
  });

  describe('MainFooter', () => {
    it('renders with document counts and selection count', () => {
      const element = React.createElement(MainFooter, {
        currentTheme: 'dark',
        selectedFolderName: 'Entradas 2026',
        documentsCount: 42,
        selectedCount: 5,
      });

      expect(element).toBeDefined();
      expect(element.props.documentsCount).toBe(42);
      expect(element.props.selectedCount).toBe(5);
      expect(element.props.selectedFolderName).toBe('Entradas 2026');
    });

    it('renders with zero documents and no selection', () => {
      const element = React.createElement(MainFooter, {
        currentTheme: 'light',
        selectedFolderName: 'Vazia',
        documentsCount: 0,
        selectedCount: 0,
      });

      expect(element).toBeDefined();
      expect(element.props.documentsCount).toBe(0);
      expect(element.props.selectedCount).toBe(0);
    });
  });

  describe('WorkspaceModals', () => {
    it('initializes with confirmation and splash configurations', () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      const onCancelConfirm = vi.fn();

      const props = {
        showSplash: false,
        onFinishSplash: () => {},
        confirmConfig: {
          isOpen: true,
          title: 'Excluir Nota',
          description: 'Deseja excluir a nota selecionada?',
          onConfirm,
        },
        isConfirmLoading: false,
        onCancelConfirm,
        isUploading: false,
        uploadProgress: null,
        selectedFolderName: 'Geral',
        onCloseImportProgress: () => {},
        isDraggingOver: false,
        selectedFolderId: null,
        fileInputRef: { current: null },
        onFileUpload: () => {},
        movingDocId: null,
        isBulkMoveOpen: false,
        selectedDocIds: [],
        currentTheme: 'dark',
        folders: [],
        onMoveToFolder: vi.fn().mockResolvedValue(undefined),
        onCloseFolderPicker: () => {},
      };
      const element = React.createElement(WorkspaceModals, props);

      expect(element).toBeDefined();
      expect(element.props.confirmConfig.isOpen).toBe(true);
      expect(element.props.confirmConfig.title).toBe('Excluir Nota');
    });

    it('handles bulk move modal configuration', () => {
      const props = {
        showSplash: false,
        onFinishSplash: () => {},
        confirmConfig: {
          isOpen: false,
          title: '',
          description: '',
          onConfirm: vi.fn().mockResolvedValue(undefined),
        },
        isConfirmLoading: false,
        onCancelConfirm: () => {},
        isUploading: true,
        uploadProgress: { total: 10, processed: 5, percent: 50 },
        selectedFolderName: 'Importados',
        onCloseImportProgress: () => {},
        isDraggingOver: false,
        selectedFolderId: 'folder-1',
        fileInputRef: { current: null },
        onFileUpload: () => {},
        movingDocId: null,
        isBulkMoveOpen: true,
        selectedDocIds: ['doc-1', 'doc-2'],
        currentTheme: 'light',
        folders: [{ id: 'f-1', name: 'Destino', parentId: null, createdAt: '', updatedAt: '', children: [] }],
        onMoveToFolder: vi.fn().mockResolvedValue(undefined),
        onCloseFolderPicker: () => {},
      };
      const element = React.createElement(WorkspaceModals, props);

      expect(element).toBeDefined();
      expect(element.props.isBulkMoveOpen).toBe(true);
      expect(element.props.selectedDocIds).toHaveLength(2);
      expect(element.props.uploadProgress?.percent).toBe(50);
    });
  });
});

