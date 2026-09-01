import { create } from 'zustand';
import { apiFetch, apiUrl } from '../lib/api';

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  children: FolderNode[];
  documentCount?: number;
}

export interface DocumentItem {
  id: string;
  type: string;
  accessKey?: string;
  number?: string;
  series?: string | null;
  status: string;
  issueDate?: string;
  issuerName?: string;
  recipientName?: string;
  recipientDocument?: string;
  totalAmount?: number;
  batchId?: string | null;
}

export interface ImportProgress {
  total: number;
  processed: number;
  percent: number;
  status: string;
  message?: string;
}

export interface AppSettings {
  showReceiptStub: boolean;
  autoOpenPrint: boolean;
  defaultFormat: 'A4' | 'A5';
  theme: 'dark' | 'light';
}

const DEFAULT_SETTINGS: AppSettings = {
  showReceiptStub: true,
  autoOpenPrint: false,
  defaultFormat: 'A4',
  theme: 'dark',
};

const getStoredSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem('danfe_app_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // fallback
  }
  return DEFAULT_SETTINGS;
};

export interface WorkspaceState {
  folders: FolderNode[];
  selectedFolderId: string | null; // null = 'Todos os Documentos' (Root/All)
  selectedFolderName: string;
  documents: DocumentItem[];
  selectedDocumentId: string | null;
  selectedDocIds: string[]; // for bulk selection
  searchQuery: string;
  expandedFolderIds: Record<string, boolean>;

  // Progress & Settings
  isImporting: boolean;
  importProgress: ImportProgress | null;
  settings: AppSettings;
  isSettingsOpen: boolean;

  // Actions
  fetchWorkspace: () => Promise<void>;
  createFolder: (name: string, parentId?: string | null) => Promise<FolderNode | null>;
  updateFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  toggleFolderExpand: (folderId: string) => void;
  selectFolder: (folderId: string | null, folderName?: string) => void;

  fetchDocuments: (folderId?: string | null) => Promise<void>;
  moveDocument: (documentId: string, folderId: string | null) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  bulkDeleteDocuments: (ids: string[]) => Promise<void>;
  bulkMoveDocuments: (ids: string[], folderId: string | null) => Promise<void>;
  clearAllDocuments: () => Promise<void>;
  resetWorkspaceDatabase: () => Promise<void>;
  selectDocument: (documentId: string, title?: string) => void;

  // Bulk Selection Actions
  toggleDocSelection: (docId: string) => void;
  selectAllDocs: (selected: boolean) => void;
  clearDocSelection: () => void;

  // Search & Settings & Progress
  setSearchQuery: (query: string) => void;
  setImporting: (importing: boolean, progress?: ImportProgress | null) => void;
  setImportProgress: (progress: ImportProgress | null) => void;
  setIsSettingsOpen: (open: boolean) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

async function safeFetchJson<T>(path: string, options?: RequestInit, retries = 2, delayMs = 300): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Usa apiFetch que resolve base URL corretamente (Electron)
      const res = await apiFetch(path, options);
      if (!res.ok) {
        if (attempt === retries) {
          console.warn(`[API] Fetch failed for ${path} with status ${res.status}`);
          return null;
        }
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return null;
      }
      return (await res.json()) as T;
    } catch (err) {
      if (attempt === retries) {
        console.warn(`[API] Network error for ${path}:`, err);
        return null;
      }
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  return null;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  folders: [],
  selectedFolderId: null,
  selectedFolderName: 'Todos os Documentos',
  documents: [],
  selectedDocumentId: null,
  selectedDocIds: [],
  searchQuery: '',
  expandedFolderIds: {},

  isImporting: false,
  importProgress: null,
  settings: getStoredSettings(),
  isSettingsOpen: false,

  fetchWorkspace: async () => {
    try {
      const folders = await safeFetchJson<FolderNode[]>('/api/workspace');
      if (Array.isArray(folders)) {
        set({ folders });

        // Auto-expand root folders if state is empty
        const currentExpanded = get().expandedFolderIds;
        if (Object.keys(currentExpanded).length === 0 && folders.length > 0) {
          const initialExpanded: Record<string, boolean> = {};
          const expandAll = (nodes: FolderNode[]) => {
            for (const node of nodes) {
              initialExpanded[node.id] = true;
              if (node.children?.length) expandAll(node.children);
            }
          };
          expandAll(folders);
          set({ expandedFolderIds: initialExpanded });
        }
      }
    } catch (error) {
      console.warn('Failed to fetch workspace hierarchy:', error);
    }
  },

  createFolder: async (name: string, parentId?: string | null) => {
    try {
      const res = await apiFetch('/api/workspace/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId: parentId || null }),
      });
      if (!res.ok) throw new Error('Failed to create folder');
      const contentType = res.headers.get('content-type') || '';
      const created = contentType.includes('application/json') ? await res.json() : null;

      if (parentId) {
        set((state) => ({
          expandedFolderIds: { ...state.expandedFolderIds, [parentId]: true },
        }));
      }

      await get().fetchWorkspace();
      return created;
    } catch (error) {
      console.error('Failed to create folder:', error);
      return null;
    }
  },

  updateFolder: async (id: string, name: string) => {
    try {
      const res = await apiFetch(`/api/workspace/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await get().fetchWorkspace();
      if (get().selectedFolderId === id) {
        set({ selectedFolderName: name });
      }
    } catch (error) {
      console.error('Failed to update folder:', error);
    }
  },

  deleteFolder: async (id: string) => {
    try {
      const res = await apiFetch(`/api/workspace/folders/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Falha ao excluir pasta no servidor.');
      }
      // If deleted folder was selected, reset to all documents
      if (get().selectedFolderId === id) {
        get().selectFolder(null, 'Todos os Documentos');
      }
      await get().fetchWorkspace();
      await get().fetchDocuments(get().selectedFolderId);
    } catch (error) {
      console.error('Failed to delete folder:', error);
      throw error;
    }
  },

  toggleFolderExpand: (folderId: string) => {
    set((state) => ({
      expandedFolderIds: {
        ...state.expandedFolderIds,
        [folderId]: !state.expandedFolderIds[folderId],
      },
    }));
  },

  selectFolder: (folderId: string | null, folderName?: string) => {
    set({
      selectedFolderId: folderId,
      selectedFolderName: folderName || (folderId ? 'Pasta Selecionada' : 'Todos os Documentos'),
      selectedDocIds: [],
    });
    get().fetchDocuments(folderId);
  },

  fetchDocuments: async (folderId?: string | null) => {
    try {
      const targetFolderId = folderId !== undefined ? folderId : get().selectedFolderId;
      const search = get().searchQuery?.trim();
      const params = new URLSearchParams();
      if (targetFolderId && targetFolderId !== 'all') params.set('batchId', targetFolderId);
      if (search) params.set('search', search);
      const query = params.toString() ? `?${params.toString()}` : '';
      const url = `/api/documents${query}`;
      
      const documents = await safeFetchJson<DocumentItem[]>(url);
      if (Array.isArray(documents)) {
        set({ documents });

        const currentSelected = get().selectedDocumentId;
        if (currentSelected && !documents.find((d: any) => d.id === currentSelected)) {
          set({ selectedDocumentId: documents.length > 0 ? documents[0].id : null });
        } else if (!currentSelected && documents.length > 0) {
          set({ selectedDocumentId: documents[0].id });
        }
      }
    } catch (error) {
      console.warn('Failed to fetch documents:', error);
    }
  },

  moveDocument: async (documentId: string, folderId: string | null) => {
    try {
      await apiFetch(`/api/documents/${documentId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      await get().fetchWorkspace();
      await get().fetchDocuments(get().selectedFolderId);
    } catch (error) {
      console.error('Failed to move document:', error);
    }
  },

  bulkMoveDocuments: async (ids: string[], folderId: string | null) => {
    try {
      await apiFetch('/api/documents/bulk-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, folderId }),
      });
      set({ selectedDocIds: [] });
      await get().fetchWorkspace();
      await get().fetchDocuments(get().selectedFolderId);
    } catch (error) {
      console.error('Failed to bulk move documents:', error);
      throw error;
    }
  },

  deleteDocument: async (documentId: string) => {
    try {
      await apiFetch(`/api/documents/${documentId}`, { method: 'DELETE' });
      const currentSelected = get().selectedDocumentId;
      const nextDocs = get().documents.filter((d) => d.id !== documentId);
      set({
        documents: nextDocs,
        selectedDocIds: get().selectedDocIds.filter((id) => id !== documentId),
        selectedDocumentId:
          currentSelected === documentId
            ? nextDocs.length > 0
              ? nextDocs[0].id
              : null
            : currentSelected,
      });
      await get().fetchWorkspace();
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw error;
    }
  },

  bulkDeleteDocuments: async (ids: string[]) => {
    try {
      await apiFetch('/api/documents/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const idSet = new Set(ids);
      const nextDocs = get().documents.filter((d) => !idSet.has(d.id));
      const currentSelected = get().selectedDocumentId;
      set({
        documents: nextDocs,
        selectedDocIds: [],
        selectedDocumentId:
          currentSelected && idSet.has(currentSelected)
            ? nextDocs.length > 0
              ? nextDocs[0].id
              : null
            : currentSelected,
      });
      await get().fetchWorkspace();
    } catch (error) {
      console.error('Failed to bulk delete documents:', error);
      throw error;
    }
  },

  clearAllDocuments: async () => {
    try {
      await apiFetch('/api/documents', { method: 'DELETE' });
      set({
        documents: [],
        selectedDocIds: [],
        selectedDocumentId: null,
      });
      await get().fetchWorkspace();
    } catch (error) {
      console.error('Failed to clear documents:', error);
      throw error;
    }
  },

  resetWorkspaceDatabase: async () => {
    try {
      const res = await apiFetch('/api/workspace/reset', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      set({
        folders: [],
        selectedFolderId: null,
        selectedFolderName: 'Todos os Documentos',
        documents: [],
        selectedDocIds: [],
        selectedDocumentId: null,
        searchQuery: '',
      });
      await get().fetchWorkspace();
    } catch (error) {
      console.error('Failed to reset workspace database:', error);
      throw error;
    }
  },

  selectDocument: (documentId: string) => {
    set({ selectedDocumentId: documentId });
  },

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

  setSearchQuery: (query: string) => set({ searchQuery: query }),

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
}));
