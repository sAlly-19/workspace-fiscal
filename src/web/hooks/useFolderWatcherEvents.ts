import { useEffect, useState, useCallback, useRef } from 'react';
import { getApiBaseUrl, getApiToken, apiFetch } from '../lib/api';
import { useWorkspaceStore } from '../stores/workspace.store';
import { toast } from '../components/Toast';

export interface WatchPromptItem {
  folderId: string;
  folderName: string;
  pendingCount: number;
  files: string[];
}

export interface UseFolderWatcherEventsOptions {
  onNavigateNfView?: () => void;
}

export function useFolderWatcherEvents(options: UseFolderWatcherEventsOptions = {}) {
  const [prompts, setPrompts] = useState<Record<string, WatchPromptItem>>({});
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchWorkspace = useWorkspaceStore((s) => s.fetchWorkspace);
  const fetchDocuments = useWorkspaceStore((s) => s.fetchDocuments);
  const selectedFolderId = useWorkspaceStore((s) => s.selectedFolderId);
  const selectFolder = useWorkspaceStore((s) => s.selectFolder);
  const setFolderSyncProgress = useWorkspaceStore((s) => s.setFolderSyncProgress);

  const connectSse = useCallback(async () => {
    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const base = await getApiBaseUrl();
      const token = await getApiToken();
      const url = new URL(`${base}/api/events`);
      if (token) {
        url.searchParams.set('token', token);
      }

      const es = new EventSource(url.toString());
      eventSourceRef.current = es;

      es.addEventListener('WATCH_SYNC_PROGRESS', (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.folderId) {
            if (data.isSyncing) {
              setFolderSyncProgress(data.folderId, {
                folderId: data.folderId,
                folderName: data.folderName,
                isSyncing: true,
                importedCount: data.importedCount || 0,
                skippedCount: data.skippedCount || 0,
                total: data.total || 0,
                phase: data.phase,
              });
            } else {
              setFolderSyncProgress(data.folderId, null);
              fetchWorkspace();
              if (selectedFolderId === data.folderId || !selectedFolderId) {
                fetchDocuments(selectedFolderId);
              }
            }
          }
        } catch (e) {
          console.error('[FolderWatcherEvents] Failed to parse WATCH_SYNC_PROGRESS event', e);
        }
      });

      es.addEventListener('WATCH_AUTO_IMPORTED', (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data);
          const { folderId, folderName, importedCount } = data;
          setFolderSyncProgress(folderId, null);
          if (importedCount > 0) {
            toast.success(
              'Importação em segundo plano',
              `${importedCount} novo(s) XML(s) importado(s) automaticamente para a pasta "${folderName}".`
            );
          }
          fetchWorkspace();
          if (selectedFolderId === folderId || !selectedFolderId) {
            fetchDocuments(selectedFolderId);
          }
        } catch (e) {
          console.error('[FolderWatcherEvents] Failed to parse WATCH_AUTO_IMPORTED event', e);
        }
      });

      es.addEventListener('WATCH_PROMPT_IMPORT', (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data) as WatchPromptItem;
          if (data.folderId && data.pendingCount > 0) {
            setPrompts((prev) => ({
              ...prev,
              [data.folderId]: data,
            }));
          }
        } catch (e) {
          console.error('[FolderWatcherEvents] Failed to parse WATCH_PROMPT_IMPORT event', e);
        }
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            connectSse();
          }, 5000);
        }
      };
    } catch (err) {
      console.warn('[FolderWatcherEvents] SSE connection attempt failed:', err);
      if (!reconnectTimerRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          connectSse();
        }, 5000);
      }
    }
  }, [fetchWorkspace, fetchDocuments, selectedFolderId]);

  useEffect(() => {
    connectSse();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connectSse]);

  const confirmImport = useCallback(
    async (folderId: string) => {
      try {
        const res = await apiFetch(`/api/workspace/folders/${folderId}/watch/confirm`, {
          method: 'POST',
        });
        if (res.ok) {
          const result = await res.json();
          const count = result.importedCount ?? 0;
          setPrompts((prev) => {
            const next = { ...prev };
            delete next[folderId];
            return next;
          });
          toast.success(
            'Importação concluída',
            `${count} arquivo(s) XML importado(s) com sucesso.`
          );
          await fetchWorkspace();
          if (selectedFolderId === folderId || !selectedFolderId) {
            await fetchDocuments(selectedFolderId);
          }
        } else {
          toast.error('Erro ao importar', 'Não foi possível importar os arquivos da pasta monitorada.');
        }
      } catch (err: any) {
        toast.error('Erro na solicitação', err?.message || 'Falha ao confirmar importação.');
      }
    },
    [fetchWorkspace, fetchDocuments, selectedFolderId]
  );

  const dismissImport = useCallback(async (folderId: string) => {
    try {
      await apiFetch(`/api/workspace/folders/${folderId}/watch/dismiss`, {
        method: 'POST',
      });
      setPrompts((prev) => {
        const next = { ...prev };
        delete next[folderId];
        return next;
      });
    } catch (err: any) {
      console.error('[FolderWatcherEvents] Failed to dismiss prompt import:', err);
    }
  }, []);

  const viewFolder = useCallback(
    (folderId: string, folderName: string) => {
      selectFolder(folderId, folderName);
      options.onNavigateNfView?.();
    },
    [selectFolder, options]
  );

  return {
    prompts: Object.values(prompts),
    confirmImport,
    dismissImport,
    viewFolder,
  };
}

