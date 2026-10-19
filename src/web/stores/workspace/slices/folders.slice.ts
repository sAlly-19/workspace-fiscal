import { StateCreator } from 'zustand';
import { apiFetch } from '../../../lib/api';
import { FolderNode, FolderSyncProgress, WorkspaceState } from '../workspace.types';
import { safeFetchJson, writeUrlParams } from '../workspace.utils';

export interface FoldersSlice {
  folderSyncProgress: Record<string, FolderSyncProgress>;
  setFolderSyncProgress: (folderId: string, progress: FolderSyncProgress | null) => void;
  fetchWorkspace: () => Promise<void>;
  createFolder: (
    name: string,
    parentId?: string | null,
    watchConfig?: {
      watchPath?: string | null;
      watchRecursive?: boolean;
      watchMode?: 'off' | 'prompt';
    }
  ) => Promise<FolderNode | null>;
  updateFolder: (
    id: string,
    data:
      | string
      | {
          name?: string;
          watchPath?: string | null;
          watchRecursive?: boolean;
          watchMode?: 'off' | 'prompt';
        }
  ) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  toggleFolderExpand: (folderId: string) => void;
  selectFolder: (folderId: string | null, folderName?: string) => void;
}

export const createFoldersSlice: StateCreator<
  WorkspaceState,
  [],
  [],
  FoldersSlice
> = (set, get) => ({
  folderSyncProgress: {},

  setFolderSyncProgress: (folderId, progress) => {
    set((state) => {
      if (!progress) {
        const next = { ...state.folderSyncProgress };
        delete next[folderId];
        return { folderSyncProgress: next };
      }
      return {
        folderSyncProgress: {
          ...state.folderSyncProgress,
          [folderId]: progress,
        },
      };
    });
  },

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

  createFolder: async (
    name: string,
    parentId?: string | null,
    watchConfig?: {
      watchPath?: string | null;
      watchRecursive?: boolean;
      watchMode?: 'off' | 'prompt';
    }
  ) => {
    try {
      const payload: Record<string, any> = { name, parentId: parentId || null };
      if (watchConfig) {
        if (watchConfig.watchPath !== undefined) payload.watchPath = watchConfig.watchPath;
        if (watchConfig.watchRecursive !== undefined) payload.watchRecursive = watchConfig.watchRecursive;
        if (watchConfig.watchMode !== undefined) payload.watchMode = watchConfig.watchMode;
      }

      const res = await apiFetch('/api/workspace/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  updateFolder: async (
    id: string,
    data:
      | string
      | {
          name?: string;
          watchPath?: string | null;
          watchRecursive?: boolean;
          watchMode?: 'off' | 'prompt';
        }
  ) => {
    try {
      const payload = typeof data === 'string' ? { name: data } : data;
      const res = await apiFetch(`/api/workspace/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await get().fetchWorkspace();
      if (payload.name && get().selectedFolderId === id) {
        set({ selectedFolderName: payload.name });
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
    const name = folderName || (folderId ? 'Pasta Selecionada' : 'Todos os Documentos');
    writeUrlParams(folderId, name, get().searchQuery);
    set({
      selectedFolderId: folderId,
      selectedFolderName: name,
      selectedDocIds: [],
    });
    get().fetchDocuments(folderId);
  },
});

