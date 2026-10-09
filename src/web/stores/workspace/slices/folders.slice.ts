import { StateCreator } from 'zustand';
import { apiFetch } from '../../../lib/api';
import { FolderNode, WorkspaceState } from '../workspace.types';
import { safeFetchJson, writeUrlParams } from '../workspace.utils';

export interface FoldersSlice {
  fetchWorkspace: () => Promise<void>;
  createFolder: (name: string, parentId?: string | null) => Promise<FolderNode | null>;
  updateFolder: (id: string, name: string) => Promise<void>;
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

