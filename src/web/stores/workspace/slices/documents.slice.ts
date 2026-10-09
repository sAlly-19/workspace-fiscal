import { StateCreator } from 'zustand';
import { apiFetch } from '../../../lib/api';
import { DocumentItem, WorkspaceState } from '../workspace.types';
import { safeFetchJson } from '../workspace.utils';

export interface DocumentsSlice {
  fetchDocuments: (folderId?: string | null) => Promise<void>;
  moveDocument: (documentId: string, folderId: string | null) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  bulkDeleteDocuments: (ids: string[]) => Promise<void>;
  bulkMoveDocuments: (ids: string[], folderId: string | null) => Promise<void>;
  clearAllDocuments: () => Promise<void>;
  resetWorkspaceDatabase: () => Promise<void>;
  selectDocument: (documentId: string, title?: string) => void;
}

export const createDocumentsSlice: StateCreator<
  WorkspaceState,
  [],
  [],
  DocumentsSlice
> = (set, get) => ({
  fetchDocuments: async (folderId?: string | null) => {
    try {
      const targetFolderId = folderId !== undefined ? folderId : get().selectedFolderId;
      const search = get().searchQuery?.trim();
      const params = new URLSearchParams();
      if (targetFolderId && targetFolderId !== 'all') params.set('batchId', targetFolderId);
      if (search) params.set('search', search);
      const query = params.toString() ? `?${params.toString()}` : '';
      const url = `/api/documents${query}`;

      // Sinaliza loading via window flag (sem dependência circular com MainLayout)
      try {
        window.dispatchEvent(new CustomEvent('wsf:docs-loading', { detail: { loading: true } }));
      } catch {}

      const documents = await safeFetchJson<DocumentItem[]>(url);
      try {
        window.dispatchEvent(new CustomEvent('wsf:docs-loading', { detail: { loading: false } }));
      } catch {}
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
      try {
        window.dispatchEvent(new CustomEvent('wsf:docs-loading', { detail: { loading: false } }));
      } catch {}
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
});

