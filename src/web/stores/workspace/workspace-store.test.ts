import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../workspace.store';
import { DEFAULT_SETTINGS, getStoredSettings } from './workspace.utils';

describe('Workspace Store Slices & State Management', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useWorkspaceStore.setState({
      folders: [],
      selectedFolderId: null,
      selectedFolderName: 'Todos os Documentos',
      documents: [
        { id: 'doc-1', type: 'NFE', status: 'AUTHORIZED', number: '101' },
        { id: 'doc-2', type: 'NFE', status: 'AUTHORIZED', number: '102' },
      ],
      selectedDocumentId: null,
      selectedDocIds: [],
      searchQuery: '',
      expandedFolderIds: {},
      isImporting: false,
      importProgress: null,
      settings: { ...DEFAULT_SETTINGS },
      isSettingsOpen: false,
    });
  });

  describe('Default Settings & Helpers', () => {
    it('provides standard default settings', () => {
      expect(DEFAULT_SETTINGS.showReceiptStub).toBe(true);
      expect(DEFAULT_SETTINGS.defaultFormat).toBe('A4');
      expect(DEFAULT_SETTINGS.theme).toBe('dark');
      expect(getStoredSettings()).toBeDefined();
    });
  });

  describe('Bulk Selection Slice', () => {
    it('toggles document selection correctly', () => {
      const { toggleDocSelection } = useWorkspaceStore.getState();

      toggleDocSelection('doc-1');
      expect(useWorkspaceStore.getState().selectedDocIds).toEqual(['doc-1']);

      toggleDocSelection('doc-2');
      expect(useWorkspaceStore.getState().selectedDocIds).toEqual(['doc-1', 'doc-2']);

      toggleDocSelection('doc-1');
      expect(useWorkspaceStore.getState().selectedDocIds).toEqual(['doc-2']);
    });

    it('selects and clears all documents', () => {
      const { selectAllDocs, clearDocSelection } = useWorkspaceStore.getState();

      selectAllDocs(true);
      expect(useWorkspaceStore.getState().selectedDocIds).toEqual(['doc-1', 'doc-2']);

      clearDocSelection();
      expect(useWorkspaceStore.getState().selectedDocIds).toEqual([]);
    });
  });

  describe('Search & Settings Slice', () => {
    it('updates search query and settings partials', () => {
      const { setSearchQuery, updateSettings, setIsSettingsOpen } = useWorkspaceStore.getState();

      setSearchQuery('fornecedor teste');
      expect(useWorkspaceStore.getState().searchQuery).toBe('fornecedor teste');

      updateSettings({ theme: 'light', defaultFormat: 'A5' });
      expect(useWorkspaceStore.getState().settings.theme).toBe('light');
      expect(useWorkspaceStore.getState().settings.defaultFormat).toBe('A5');

      setIsSettingsOpen(true);
      expect(useWorkspaceStore.getState().isSettingsOpen).toBe(true);
    });

    it('toggles folder expansion state map', () => {
      const { toggleFolderExpand } = useWorkspaceStore.getState();

      toggleFolderExpand('folder-123');
      expect(useWorkspaceStore.getState().expandedFolderIds['folder-123']).toBe(true);

      toggleFolderExpand('folder-123');
      expect(useWorkspaceStore.getState().expandedFolderIds['folder-123']).toBe(false);
    });
  });

  describe('Document Selection', () => {
    it('sets single selected document id', () => {
      const { selectDocument } = useWorkspaceStore.getState();

      selectDocument('doc-2');
      expect(useWorkspaceStore.getState().selectedDocumentId).toBe('doc-2');
    });
  });
});

