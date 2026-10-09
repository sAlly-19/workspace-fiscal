import { create } from 'zustand';
import {
  WorkspaceState,
  readUrlParams,
  getStoredSettings,
  createFoldersSlice,
  createDocumentsSlice,
  createSelectionAndSettingsSlice,
} from './workspace/index';

// Re-exporta todos os tipos e utilitários para compatibilidade transparente com toda a base de código
export * from './workspace/index';

export const useWorkspaceStore = create<WorkspaceState>((set, get, store) => {
  const initial = readUrlParams();
  return {
    folders: [],
    selectedFolderId: initial.folderId,
    selectedFolderName: initial.folderName,
    documents: [],
    selectedDocumentId: null,
    selectedDocIds: [],
    searchQuery: initial.search,
    expandedFolderIds: {},

    isImporting: false,
    importProgress: null,
    settings: getStoredSettings(),
    isSettingsOpen: false,

    ...createFoldersSlice(set, get, store),
    ...createDocumentsSlice(set, get, store),
    ...createSelectionAndSettingsSlice(set, get, store),
  };
});
