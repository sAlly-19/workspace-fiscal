import { StateCreator } from 'zustand';
import { AppSettings, ImportProgress, WorkspaceState } from '../workspace.types';
import { writeUrlParams } from '../workspace.utils';

export interface SelectionAndSettingsSlice {
  toggleDocSelection: (docId: string) => void;
  selectAllDocs: (selected: boolean) => void;
  clearDocSelection: () => void;
  setSearchQuery: (query: string) => void;
  setImporting: (importing: boolean, progress?: ImportProgress | null) => void;
  setImportProgress: (progress: ImportProgress | null) => void;
  setIsSettingsOpen: (open: boolean) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

export const createSelectionAndSettingsSlice: StateCreator<
  WorkspaceState,
  [],
  [],
  SelectionAndSettingsSlice
> = (set, get) => ({
  toggleDocSelection: (docId: string) => {
    set((state) => {
      const exists = state.selectedDocIds.includes(docId);
      return {
        selectedDocIds: exists
          ? state.selectedDocIds.filter((id) => id !== docId)
          : [...state.selectedDocIds, docId],
      };
    });
  },

  selectAllDocs: (selected: boolean) => {
    set((state) => ({
      selectedDocIds: selected ? state.documents.map((d) => d.id) : [],
    }));
  },

  clearDocSelection: () => {
    set({ selectedDocIds: [] });
  },

  setSearchQuery: (query: string) => {
    writeUrlParams(get().selectedFolderId, get().selectedFolderName, query);
    set({ searchQuery: query });
  },

  setImporting: (importing: boolean, progress?: ImportProgress | null) => {
    set({
      isImporting: importing,
      importProgress: progress !== undefined ? progress : null,
    });
  },

  setImportProgress: (progress: ImportProgress | null) => {
    set({ importProgress: progress });
  },

  setIsSettingsOpen: (open: boolean) => {
    set({ isSettingsOpen: open });
  },

  updateSettings: (partial: Partial<AppSettings>) => {
    set((state) => {
      const nextSettings = { ...state.settings, ...partial };
      try {
        localStorage.setItem('danfe_app_settings', JSON.stringify(nextSettings));
      } catch {
        // ignore
      }
      return { settings: nextSettings };
    });
  },
});

