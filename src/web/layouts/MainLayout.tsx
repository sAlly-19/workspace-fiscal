import {
  Search,
  FileText,
  Plus,
  ArrowUpToLine,
  Trash2,
  Printer,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  FileCheck,
  X,
  AlertCircle,
  FolderOpen,
  MoveRight,
  Sparkles,
  Settings,
  CheckSquare,
  Square,
  Check,
  RotateCw,
  FolderPlus,
  Sun,
  Moon,
  ArrowLeft
} from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useWorkspaceStore, type FolderNode } from '../stores/workspace.store';
import { DocumentPreview } from '../features/documents/DocumentPreview';
import { WorkspaceTree } from '../features/workspace/WorkspaceTree';
import { SettingsModal } from '../components/SettingsModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { SplashScreen } from '../components/SplashScreen';
import { ImportProgressModal } from '../components/ImportProgressModal';
import { TitleBar } from '../components/TitleBar';
import { ToastHost, toast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';
import { DocumentCardSkeleton } from '../components/Skeleton';
import { apiFetch } from '../lib/api';

export function MainLayout({ onBackToHome }: { onBackToHome?: () => void }) {
  const { 
    folders,
    documents,
    selectedDocumentId,
    selectedFolderId,
    selectedFolderName,
    selectedDocIds,
    toggleDocSelection,
    selectAllDocs,
    clearDocSelection,
    selectDocument,
    fetchWorkspace,
    fetchDocuments,
    deleteDocument,
    bulkDeleteDocuments,
    bulkMoveDocuments,
    clearAllDocuments,
    moveDocument,
    searchQuery,
    setSearchQuery,
    settings,
    updateSettings,
    setIsSettingsOpen
  } = useWorkspaceStore();

  const currentTheme = settings.theme || 'dark';

  const [showSplash, setShowSplash] = useState(true);
  const [docDetails, setDocDetails] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; processed: number; percent: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isDocsLoading, setIsDocsLoading] = useState(false);

  // Active target folder for file uploads
  const [targetUploadFolderId, setTargetUploadFolderId] = useState<string | null>(null);

  // Dialog states
  const [movingDocId, setMovingDocId] = useState<string | null>(null);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);

  // Confirm Modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  });
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Resizable sidebar states
  const [treeWidth, setTreeWidth] = useState(250);
  const [listWidth, setListWidth] = useState(330);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

  const isResizingTreeRef = useRef(false);
  const isResizingListRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchWorkspace();
    fetchDocuments();
  }, [fetchWorkspace, fetchDocuments]);

  // UX4: Skeleton — escuta sinal de loading do store
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ loading: boolean }>;
      setIsDocsLoading(!!ce.detail?.loading);
    };
    window.addEventListener('wsf:docs-loading', handler);
    return () => window.removeEventListener('wsf:docs-loading', handler);
  }, []);

  // Debounced server-side search: refetch quando searchQuery muda
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments(selectedFolderId);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Refetch quando pasta muda (já faz fetch via selectFolder, mas garante)
  // Load selected document details
  useEffect(() => {
    if (selectedDocumentId) {
      let isCurrent = true;
      const loadDoc = async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await apiFetch(`/api/documents/${selectedDocumentId}`);
            if (!res.ok) {
              if (attempt < 2) {
                await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
                continue;
              }
              if (isCurrent) setDocDetails(null);
              return;
            }
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const data = await res.json();
              if (isCurrent) setDocDetails(data);
              return;
            }
          } catch (err) {
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
              continue;
            }
            if (isCurrent) setDocDetails(null);
          }
        }
      };
      loadDoc();
      return () => {
        isCurrent = false;
      };
    } else {
      setDocDetails(null);
    }
  }, [selectedDocumentId]);


  // Mouse drag handlers for workspace tree resizer
  const startResizingTree = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingTreeRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingTreeRef.current) return;
      const newWidth = Math.max(180, Math.min(450, moveEvent.clientX));
      setTreeWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizingTreeRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  // Mouse drag handlers for document list resizer
  const startResizingList = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingListRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingListRef.current) return;
      const offset = isTreeCollapsed ? 0 : treeWidth;
      const newWidth = Math.max(220, Math.min(500, moveEvent.clientX - offset));
      setListWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizingListRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [isTreeCollapsed, treeWidth]);

  const handleBatchPrint = async (docIdsToPrint?: string[]) => {
    const ids = docIdsToPrint && docIdsToPrint.length > 0 ? docIdsToPrint : selectedDocIds;
    // Em Electron usa base URL dinâmica
    const { getApiBaseUrl } = await import('../lib/api');
    const base = await getApiBaseUrl();
    const buildUrl = (qs: string) => `${base}/api/documents/batch-print?${qs}`;
    if (ids && ids.length > 0) {
      window.open(buildUrl(`ids=${ids.join(',')}&autoprint=true`), '_blank');
    } else if (filteredDocuments.length > 0) {
      const allFilteredIds = filteredDocuments.map((d) => d.id);
      window.open(buildUrl(`ids=${allFilteredIds.join(',')}&autoprint=true`), '_blank');
    } else {
      window.open(buildUrl(`batchId=${selectedFolderId || 'all'}&autoprint=true`), '_blank');
    }
  };

  const processFiles = async (files: FileList | File[], folderId?: string | null) => {
    if (!files || files.length === 0) return;

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress({ total: files.length, processed: 0, percent: 0 });

    const targetFolder = folderId !== undefined ? folderId : (targetUploadFolderId || selectedFolderId);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    if (targetFolder) {
      formData.append('batchId', targetFolder);
    }

    try {
      const res = await apiFetch('/api/import', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        let errMsg = 'Erro ao processar envio dos arquivos.';
        try {
          const errData = await res.json();
          if (errData?.error) errMsg = errData.error;
        } catch {}
        setUploadError(errMsg);
        setIsUploading(false);
        setUploadProgress(null);
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setUploadError('Resposta inválida do servidor ao iniciar importação.');
        setIsUploading(false);
        setUploadProgress(null);
        return;
      }

      const data = await res.json();

      if (data && data.jobId) {
        // Poll for completion and update real-time progress bar smoothly
        const poll = setInterval(async () => {
          try {
            const statusRes = await apiFetch(`/api/import/${data.jobId}`);
            if (!statusRes.ok) throw new Error(`HTTP ${statusRes.status}`);
            const statusContentType = statusRes.headers.get('content-type') || '';
            if (!statusContentType.includes('application/json')) return;
            const statusData = await statusRes.json();

            const processed = statusData.processed ?? 0;
            const total = statusData.total ?? files.length;
            const isCompleted = statusData.status === 'completed' || statusData.status === 'COMPLETED' || (total > 0 && processed >= total);
            const isFailed = statusData.status === 'error' || statusData.status === 'failed' || statusData.status === 'FAILED';
            
            const pct = isCompleted
              ? 100 
              : total > 0 
              ? Math.min(99, Math.round((processed / total) * 100)) 
              : 0;

            setUploadProgress({
              total,
              processed: isCompleted ? total : processed,
              percent: pct
            });

            if (isCompleted || isFailed) {
              clearInterval(poll);
              setTargetUploadFolderId(null);
              await fetchDocuments(selectedFolderId);
              await fetchWorkspace();

              if (isCompleted && statusData.results && statusData.results.length > 0) {
                // Auto select first document
                selectDocument(statusData.results[0].id);
              }

              // Auto-close after brief delay so user sees full completion feedback
              setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(null);
              }, 2200);
            }
          } catch (pollErr) {
            console.error('[ImportPoll] Erro:', pollErr);
            clearInterval(poll);
            setIsUploading(false);
            setUploadProgress(null);
            setTargetUploadFolderId(null);
          }
        }, 180);
      } else {
        await fetchDocuments(selectedFolderId);
        await fetchWorkspace();
        setIsUploading(false);
        setUploadProgress(null);
        setTargetUploadFolderId(null);
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Falha ao importar arquivos XML.');
      setIsUploading(false);
      setUploadProgress(null);
      setTargetUploadFolderId(null);
    }
  };

  const processPaths = async (paths: string[], folderId?: string | null) => {
    if (!paths || paths.length === 0) return;
    setUploadError(null);
    setIsUploading(true);
    setUploadProgress({ total: paths.length, processed: 0, percent: 0 });

    const targetFolder = folderId !== undefined ? folderId : (targetUploadFolderId || selectedFolderId);

    try {
      const res = await apiFetch('/api/import/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePaths: paths,
          batchId: targetFolder || undefined,
        }),
      });

      if (!res.ok) {
        let errMsg = 'Erro ao processar caminhos para importação.';
        try {
          const errData = await res.json();
          if (errData?.error) errMsg = errData.error;
        } catch {}
        setUploadError(errMsg);
        setIsUploading(false);
        setUploadProgress(null);
        toast.error('Falha ao importar', errMsg);
        return;
      }

      const data = await res.json();
      if (data && data.jobId) {
        const poll = setInterval(async () => {
          try {
            const statusRes = await apiFetch(`/api/import/${data.jobId}`);
            if (!statusRes.ok) return;
            const statusData = await statusRes.json();
            const processed = statusData.processed ?? 0;
            const total = statusData.total ?? data.queued ?? paths.length;
            const isCompleted = statusData.status === 'completed' || statusData.status === 'COMPLETED' || (total > 0 && processed >= total);
            const isFailed = statusData.status === 'error' || statusData.status === 'failed';
            const pct = isCompleted ? 100 : total > 0 ? Math.min(99, Math.round((processed / total) * 100)) : 0;
            setUploadProgress({ total, processed: isCompleted ? total : processed, percent: pct });

            if (isCompleted || isFailed) {
              clearInterval(poll);
              setTargetUploadFolderId(null);
              await fetchDocuments(selectedFolderId);
              await fetchWorkspace();
              if (isCompleted && statusData.results && statusData.results.length > 0) {
                selectDocument(statusData.results[0].id);
              }
              setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(null);
              }, 2000);
            }
          } catch {
            clearInterval(poll);
            setIsUploading(false);
            setUploadProgress(null);
          }
        }, 200);
      } else {
        await fetchDocuments(selectedFolderId);
        await fetchWorkspace();
        setIsUploading(false);
        setUploadProgress(null);
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Falha ao importar arquivos.');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const paths: string[] = [];
    const filesToUpload: File[] = [];

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        const p = (file as any).path;
        if (p && typeof p === 'string') {
          paths.push(p);
        } else if (file.size > 0) {
          filesToUpload.push(file);
        }
      }
    }

    if (paths.length > 0) {
      await processPaths(paths);
    } else if (filesToUpload.length > 0) {
      await processFiles(filesToUpload);
    }
  };

  const handleImportToSpecificFolder = (folderId: string | null) => {
    setTargetUploadFolderId(folderId);
    fileInputRef.current?.click();
  };

  // F2: Importação por diretório (via Electron IPC `dialog:openDirectory`)
  const handleImportDirectory = async () => {
    try {
      const api = (window as any).api;
      if (!api?.openDirectory) {
        toast.warning('Modo web', 'Importação de pasta requer o app desktop.');
        return;
      }
      const result = await api.openDirectory({ recursive: true, maxFiles: 5000 });
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) return;

      setUploadError(null);
      setIsUploading(true);
      setUploadProgress({ total: result.filePaths.length, processed: 0, percent: 0 });

      const targetFolder = targetUploadFolderId || selectedFolderId;
      const res = await apiFetch('/api/import/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePaths: result.filePaths,
          batchId: targetFolder || undefined,
        }),
      });
      if (!res.ok) {
        let errMsg = 'Erro ao iniciar importação por diretório.';
        try {
          const data = await res.json();
          if (data?.error) errMsg = data.error;
        } catch {}
        setUploadError(errMsg);
        setIsUploading(false);
        setUploadProgress(null);
        toast.error('Falha ao importar pasta', errMsg);
        return;
      }
      const data = await res.json();
      toast.info(
        'Importação de pasta iniciada',
        `${data.queued} arquivos serão processados${data.skipped ? ` (${data.skipped} ignorados)` : ''}.`
      );
      // Poll para progresso usando jobId retornado
      const jobId = data.jobId;
      const poll = setInterval(async () => {
        try {
          const statusRes = await apiFetch(`/api/import/${jobId}`);
          if (!statusRes.ok) throw new Error(`HTTP ${statusRes.status}`);
          const statusData = await statusRes.json();
          const processed = statusData.processed ?? 0;
          const total = statusData.total ?? data.queued;
          const isCompleted = statusData.status === 'completed' || statusData.status === 'COMPLETED' || (total > 0 && processed >= total);
          const pct = isCompleted ? 100 : total > 0 ? Math.min(99, Math.round((processed / total) * 100)) : 0;
          setUploadProgress({ total, processed: isCompleted ? total : processed, percent: pct });
          if (isCompleted) {
            clearInterval(poll);
            setTargetUploadFolderId(null);
            await fetchDocuments(selectedFolderId);
            await fetchWorkspace();
            toast.success(
              'Importação de pasta concluída',
              `${total} arquivos processados${statusData.duplicates ? `, ${statusData.duplicates} duplicados ignorados` : ''}.`
            );
            setTimeout(() => { setIsUploading(false); setUploadProgress(null); }, 2200);
          }
        } catch {
          clearInterval(poll);
          setIsUploading(false);
          setUploadProgress(null);
        }
      }, 180);
    } catch (err: any) {
      toast.error('Erro ao abrir diretório', err?.message || 'Tente novamente.');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Trigger single deletion with confirm modal
  const handleTriggerSingleDelete = (id: string, docLabel: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Documento Fiscal',
      description: `Tem certeza que deseja excluir o documento "${docLabel}"? Esta operação é irreversível.`,
      confirmLabel: 'Excluir Documento',
      onConfirm: async () => {
        setIsConfirmLoading(true);
        try {
          await deleteDocument(id);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          toast.success('Documento excluído', 'A nota fiscal foi removida do workspace.');
        } catch (err: any) {
          toast.error('Erro ao excluir', err?.message || 'Tente novamente.');
        } finally {
          setIsConfirmLoading(false);
        }
      }
    });
  };

  // Trigger bulk deletion with confirm modal
  const handleTriggerBulkDelete = () => {
    if (selectedDocIds.length === 0) return;
    setConfirmConfig({
      isOpen: true,
      title: `Excluir ${selectedDocIds.length} Documentos`,
      description: `Tem certeza que deseja excluir os ${selectedDocIds.length} documentos fiscais selecionados permanentemente?`,
      confirmLabel: `Excluir (${selectedDocIds.length})`,
      onConfirm: async () => {
        setIsConfirmLoading(true);
        try {
          await bulkDeleteDocuments(selectedDocIds);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          toast.success(`${selectedDocIds.length} documento(s) excluído(s)`, 'Remoção em lote concluída.');
        } catch (err: any) {
          toast.error('Erro ao excluir em lote', err?.message || 'Tente novamente.');
        } finally {
          setIsConfirmLoading(false);
        }
      }
    });
  };

  // Filter documents by search and by selected workspace folder
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      (doc.number && doc.number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.issuerName && doc.issuerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.recipientName && doc.recipientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.accessKey && doc.accessKey.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFolder =
      selectedFolderId === null ? true : doc.batchId === selectedFolderId;

    return matchesSearch && matchesFolder;
  });

  const allFilteredSelected =
    filteredDocuments.length > 0 &&
    filteredDocuments.every((d) => selectedDocIds.includes(d.id));

  // Flatten folders tree for quick folder move picker
  const getFlatFolders = (nodes: FolderNode[], depth = 0): { id: string; name: string; depth: number }[] => {
    let result: { id: string; name: string; depth: number }[] = [];
    for (const n of nodes) {
      result.push({ id: n.id, name: n.name, depth });
      if (n.children && n.children.length > 0) {
        result = result.concat(getFlatFolders(n.children, depth + 1));
      }
    }
    return result;
  };

  // Power User Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isInputActive = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      );
      const isSearchInput = activeElement === searchInputRef.current;

      // 1. Ctrl + F / Cmd + F / / -> Focar campo de busca
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F' || e.key === 'k' || e.key === 'K')) ||
        (e.key === '/' && !isInputActive)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // 2. Ctrl + P / Cmd + P -> Imprimir DANFE atual
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (selectedDocumentId || docDetails) {
          window.print();
        }
        return;
      }

      // If user is typing in another input (e.g. folder name, settings), don't intercept navigation or deletion
      if (isInputActive && !isSearchInput) {
        return;
      }

      // 3. Setas Cima / Baixo (ArrowUp / ArrowDown) -> Navegar entre as notas na lista
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (filteredDocuments.length === 0) return;
        e.preventDefault();

        // If inside search input, blur search to transition focus to the list
        if (isSearchInput) {
          searchInputRef.current?.blur();
        }

        const currentIndex = filteredDocuments.findIndex((d) => d.id === selectedDocumentId);
        let nextIndex = 0;

        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex < 0 ? 0 : Math.min(filteredDocuments.length - 1, currentIndex + 1);
        } else {
          nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
        }

        const targetDoc = filteredDocuments[nextIndex];
        if (targetDoc) {
          selectDocument(targetDoc.id, `${targetDoc.type} ${targetDoc.number || ''}`);
          const el = document.querySelector(`[data-doc-id="${targetDoc.id}"]`);
          el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        return;
      }

      // 4. Delete -> Abrir modal de exclusão para notas selecionadas
      if (e.key === 'Delete') {
        if (confirmConfig.isOpen || isBulkMoveOpen || movingDocId) return;

        if (selectedDocIds.length > 0) {
          e.preventDefault();
          handleTriggerBulkDelete();
        } else if (selectedDocumentId) {
          e.preventDefault();
          const activeDoc = filteredDocuments.find((d) => d.id === selectedDocumentId) || documents.find((d) => d.id === selectedDocumentId);
          if (activeDoc) {
            handleTriggerSingleDelete(activeDoc.id, `Nº ${activeDoc.number || 'S/N'}`);
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    filteredDocuments,
    selectedDocumentId,
    selectedDocIds,
    docDetails,
    confirmConfig.isOpen,
    isBulkMoveOpen,
    movingDocId,
    selectDocument,
    documents
  ]);

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden font-sans select-none relative transition-colors duration-200 theme-${currentTheme} ${
        currentTheme === 'light'
          ? 'bg-[#f8fafc] text-[#0f172a]'
          : 'bg-[#09090b] text-[#fafafa]'
      } ${typeof window !== 'undefined' && (window as any).api ? 'electron-app' : ''}`}
      style={{ paddingTop: typeof window !== 'undefined' && (window as any).api ? 36 : 0 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Splash Screen on Initial Startup */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Custom Title Bar (Electron only) — drag area + min/max/close */}
      <TitleBar />

      {/* Toast Notifications */}
      <ToastHost />

      {/* Settings Modal */}
      <SettingsModal
/>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmLabel={confirmConfig.confirmLabel}
        confirmVariant="danger"
        isLoading={isConfirmLoading}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
/>

      {/* Import Progress Modal (with Minimizable Bubble) */}
      <ImportProgressModal
        isOpen={isUploading}
        total={uploadProgress?.total || 0}
        processed={uploadProgress?.processed || 0}
        percent={uploadProgress?.percent || 0}
        targetFolderName={selectedFolderName}
        onClose={() => {
          setIsUploading(false);
          setUploadProgress(null);
        }}
/>

      {/* Full-screen Drag & Drop Overlay */}
      {isDraggingOver && (
        <div
className="absolute inset-0 bg-blue-600/30 backdrop-blur-xs z-50 flex flex-col items-center justify-center border-4 border-dashed border-blue-400 m-4 rounded-2xl pointer-events-none animate-in fade-in zoom-in-95">
          <UploadCloud className="w-16 h-16 text-white mb-2 animate-bounce" />
          <h2 className="text-xl font-bold text-white shadow-xs">
            Solte seus arquivos XML, ZIP ou pastas para importar
          </h2>
          <p className="text-sm text-blue-100 mt-1">
            {selectedFolderId
              ? `Serão organizados diretamente na pasta "${selectedFolderName}"`
              : 'Serão salvos no workspace geral'}
          </p>
        </div>
      )}

      {/* Hidden File Input for XML/ZIP Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".xml,text/xml,application/xml,.zip,application/zip,application/x-zip-compressed"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Folder Picker Modal for Moving Document(s) */}
      {(movingDocId || isBulkMoveOpen) && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 select-none ${
          'bg-black/75 backdrop-blur-xs'
        }`}>
          <div
className={`w-full max-w-md rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 ${
            currentTheme === 'light'
              ? 'bg-white border border-[#cbd5e1] text-[#0f172a] shadow-2xl'
              : 'bg-[#18181b] border border-[#3f3f46] text-white shadow-2xl'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              currentTheme === 'light' ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#141418] border-[#27272a]'
            }`}>
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold">
                  {isBulkMoveOpen ? `Mover ${selectedDocIds.length} Documentos para Pasta` : 'Mover Documento para Pasta'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setMovingDocId(null);
                  setIsBulkMoveOpen(false);
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  currentTheme === 'light' ? 'hover:bg-[#e2e8f0] text-[#64748b]' : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 max-h-72 overflow-y-auto space-y-1">
              <button
                onClick={async () => {
                  if (isBulkMoveOpen) {
                    await bulkMoveDocuments(selectedDocIds, null);
                  } else if (movingDocId) {
                    await moveDocument(movingDocId, null);
                  }
                  setMovingDocId(null);
                  setIsBulkMoveOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                  currentTheme === 'light'
                    ? 'hover:bg-blue-600 hover:text-white text-[#334155]'
                    : 'hover:bg-blue-600 hover:text-white text-[#d4d4d8]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Sem Pasta (Raiz / Geral)</span>
              </button>

              <div className={`border-t my-1 ${currentTheme === 'light' ? 'border-[#e2e8f0]' : 'border-[#27272a]'}`} />

              {getFlatFolders(folders).map((f) => (
                <button
                  key={f.id}
                  onClick={async () => {
                    if (isBulkMoveOpen) {
                      await bulkMoveDocuments(selectedDocIds, f.id);
                    } else if (movingDocId) {
                      await moveDocument(movingDocId, f.id);
                    }
                    setMovingDocId(null);
                    setIsBulkMoveOpen(false);
                  }}
                  style={{ paddingLeft: `${f.depth * 14 + 12}px` }}
                  className={`w-full text-left py-1.5 pr-2 rounded-xl text-xs flex items-center gap-2 truncate transition-colors cursor-pointer ${
                    currentTheme === 'light' 
                      ? 'hover:bg-blue-600 hover:text-white text-[#334155]' 
                      : 'hover:bg-blue-600 hover:text-white text-[#d4d4d8]'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}

              {folders.length === 0 && (
                <p className="text-xs text-[#71717a] p-3 text-center">Nenhuma pasta criada ainda no workspace.</p>
              )}
            </div>
            <div className={`p-3 border-t flex justify-end ${
              currentTheme === 'light' ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
            }`}>
              <button
                onClick={() => {
                  setMovingDocId(null);
                  setIsBulkMoveOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  currentTheme === 'light' ? 'bg-[#e2e8f0] text-[#0f172a] hover:bg-[#cbd5e1]' : 'bg-[#27272a] hover:bg-[#3f3f46] text-white'
                }`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header (Conteúdo — drag agora é na TitleBar) */}
      <header
        className={`h-13 border-b flex items-center px-4 justify-between z-20 shrink-0 print:hidden gap-4 ${
          currentTheme === 'light'
            ? 'bg-white border-[#e2e8f0]'
            : 'bg-[#111114] border-[#27272a]'
        }`}>
        {/* Brand + Back to Home */}
        <div className="flex items-center gap-2.5 shrink-0 select-none">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
                currentTheme === 'light'
                  ? 'bg-white border-[#e2e8f0] text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] hover:border-[#cbd5e1]'
                  : 'bg-[#18181b] border-[#27272a] text-[#d4d4d8] hover:bg-[#27272a] hover:text-white hover:border-[#3f3f46]'
              }`}
              title="Voltar para Home"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <img
            src="/icon.png"
            alt="NFView"
            className="w-7 h-7 rounded-lg object-cover shadow-xs border border-blue-500/20"
            referrerPolicy="no-referrer"
          />
          <div className="flex items-center gap-2">
            <span className={`font-bold text-sm tracking-tight ${currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>
              NFView
            </span>
            <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-semibold rounded border border-blue-500/20">
              NF-e • NFC-e • CT-e
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className={`w-3.5 h-3.5 ${currentTheme === 'light' ? 'text-[#94a3b8]' : 'text-[#71717a]'}`} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border rounded-md py-1.5 pl-9 pr-14 text-xs focus:outline-none transition-colors ${
                currentTheme === 'light'
                  ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#0f172a] placeholder:text-[#94a3b8] focus:border-blue-500'
                  : 'bg-[#18181b] border-[#27272a] text-[#fafafa] placeholder:text-[#71717a] focus:border-blue-500'
              }`}
              placeholder="Buscar notas fiscais... (Ctrl + F ou /)"
            />
            {!searchQuery && (
              <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none gap-1">
                <kbd className={`text-[9px] px-1 py-0.5 rounded border font-mono ${
                  currentTheme === 'light' 
                    ? 'bg-white border-[#cbd5e1] text-[#64748b]' 
                    : 'bg-[#27272a] border-[#3f3f46] text-[#a1a1aa]'
                }`}>
                  Ctrl+F
                </kbd>
                <kbd className={`text-[9px] px-1 py-0.5 rounded border font-mono ${
                  currentTheme === 'light' 
                    ? 'bg-white border-[#cbd5e1] text-[#64748b]' 
                    : 'bg-[#27272a] border-[#3f3f46] text-[#a1a1aa]'
                }`}>
                  /
                </kbd>
              </div>
            )}
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-2.5 flex items-center text-[#71717a] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Actions: Theme Selector, Primary Single Import & Settings */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Theme Switcher Pill */}
          <div className={`flex items-center p-0.5 rounded-lg border ${
            currentTheme === 'light'
              ? 'bg-[#f1f5f9] border-[#e2e8f0]'
              : 'bg-[#18181b] border-[#27272a]'
          }`}>
            <button
              onClick={() => updateSettings({ theme: 'light' })}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                currentTheme === 'light'
                  ? 'bg-white text-amber-500 shadow-xs'
                  : 'text-[#a1a1aa] hover:text-white'
              }`}
              title="Tema Light (Claro)"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateSettings({ theme: 'dark' })}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                currentTheme === 'dark'
                  ? 'bg-[#27272a] text-blue-400 shadow-xs'
                  : 'text-[#a1a1aa] hover:text-white'
              }`}
              title="Tema Dark (Escuro Padrão)"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => {
              setTargetUploadFolderId(selectedFolderId);
              fileInputRef.current?.click();
            }}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-md shadow-sm transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            title={selectedFolderId ? `Importar XML na pasta "${selectedFolderName}"` : 'Importar arquivos XML'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Importar XML</span>
          </button>

          {typeof window !== 'undefined' && (window as any).api?.openDirectory && (
            <button
              onClick={handleImportDirectory}
              disabled={isUploading}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
                currentTheme === 'light'
                  ? 'border border-[#cbd5e1] text-[#475569] bg-white hover:bg-[#f1f5f9]'
                : 'border border-[#27272a] text-[#a1a1aa] bg-[#18181b] hover:bg-[#27272a] hover:text-white'
              }`}
              title="Importar todos os XMLs de uma pasta"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Importar Pasta</span>
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-medium transition-colors cursor-pointer ${
              currentTheme === 'light'
                ? 'bg-white hover:bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]'
                : 'bg-[#18181b] hover:bg-[#27272a] text-[#d4d4d8] hover:text-white border-[#27272a]'
            }`}
            title="Configurações do Sistema"
          >
            <Settings className="w-3.5 h-3.5 text-[#a1a1aa]" />
            <span>Configurações</span>
          </button>
        </div>
      </header>

      {/* Error alert if any */}
      {uploadError && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between text-xs text-red-300 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main 3-Column Body (Workspace Tree | Documents List | DANFE Preview) */}
      <div className="flex-1 flex overflow-hidden relative print:overflow-visible">
        
        {/* Column 1: Workspace Hierarchy Tree */}
        {!isTreeCollapsed && (
          <aside
style={{ width: `${treeWidth}px` }} 
            className={`h-full flex flex-col shrink-0 print:hidden overflow-hidden border-r ${
              currentTheme === 'light'
                ? 'bg-[#f1f5f9] border-[#e2e8f0]'
                : 'bg-[#0d0d10] border-[#27272a]'
            }`}
          >
            <WorkspaceTree onImportToFolder={handleImportToSpecificFolder} />
          </aside>
        )}

        {/* Tree Resizer Handle & Collapse Toggle */}
        <div 
          onMouseDown={startResizingTree}
          className={`w-1.5 hover:bg-blue-500/80 active:bg-blue-600 transition-colors cursor-col-resize flex items-center justify-center relative z-10 shrink-0 group print:hidden select-none ${
            currentTheme === 'light'
              ? 'bg-[#e2e8f0]'
              : 'bg-[#18181b]'
          }`}
          title="Arraste para redimensionar o Workspace"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsTreeCollapsed(!isTreeCollapsed);
            }}
            className={`absolute -right-2.5 top-2 z-20 w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer border ${
              currentTheme === 'light'
                ? 'bg-white hover:bg-blue-600 hover:text-white text-[#334155] border-[#cbd5e1]'
                : 'bg-[#27272a] hover:bg-blue-600 border-[#3f3f46] text-white'
            }`}
            title={isTreeCollapsed ? 'Expandir pastas' : 'Ocultar pastas'}
          >
            {isTreeCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Column 2: Documents List with Bulk Selection and Actions */}
        <div
style={{ width: `${listWidth}px` }} 
          className={`h-full flex flex-col shrink-0 print:hidden overflow-hidden relative border-r ${
            currentTheme === 'light'
              ? 'bg-[#f8fafc] border-[#e2e8f0]'
              : 'bg-[#111114] border-[#27272a]'
          }`}
        >
          {/* List Header with Multi-Select Controls */}
          <div className={`h-11 px-3 border-b flex items-center justify-between shrink-0 ${
            currentTheme === 'light'
              ? 'bg-white border-[#e2e8f0]'
              : 'bg-[#141418] border-[#27272a]'
          }`}>
            <div className="flex items-center gap-2 min-w-0 pr-1">
              {filteredDocuments.length > 0 && (
                <button
                  onClick={() => selectAllDocs(!allFilteredSelected)}
                  className={`transition-colors cursor-pointer ${
                    currentTheme === 'light' ? 'text-[#64748b] hover:text-[#0f172a]' : 'text-[#71717a] hover:text-white'
                  }`}
                  title={allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos os documentos'}
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              )}
              <FolderOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className={`text-xs font-bold truncate ${currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'}`} title={selectedFolderName}>
                {selectedFolderName}
              </span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold shrink-0 ${
                currentTheme === 'light' ? 'bg-[#e2e8f0] text-[#475569]' : 'bg-[#27272a] text-[#a1a1aa]'
              }`}>
                {filteredDocuments.length}
              </span>
            </div>

            {/* Quick batch export button & selection counter */}
            <div className="flex items-center gap-1.5 shrink-0">
              {filteredDocuments.length > 0 && (
                <button
                  onClick={() => handleBatchPrint()}
                  className={`p-1.5 rounded text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                    currentTheme === 'light'
                      ? 'text-[#475569] hover:text-blue-600 hover:bg-blue-50'
                      : 'text-[#a1a1aa] hover:text-white hover:bg-white/10'
                  }`}
                  title="Exportar todas as notas em PDF / Imprimir em Lote"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden xl:inline">Exportar Lote</span>
                </button>
              )}
              {selectedDocIds.length > 0 && (
                <span className="text-[11px] font-semibold text-blue-500 shrink-0">
                  {selectedDocIds.length} sel.
                </span>
              )}
            </div>
          </div>

          {/* Floating Bulk Actions Toolbar when documents are selected */}
          {selectedDocIds.length > 0 && (
            <div className="p-2 bg-blue-950/90 border-b border-blue-500/30 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1">
              <span className="font-semibold text-white">
                {selectedDocIds.length} {selectedDocIds.length === 1 ? 'selecionado' : 'selecionados'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleBatchPrint(selectedDocIds)}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Exportar e imprimir notas fiscais selecionadas em PDF"
                >
                  <Printer className="w-3 h-3" />
                  Exportar PDF ({selectedDocIds.length})
                </button>
                <button
                  onClick={() => setIsBulkMoveOpen(true)}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Mover selecionados para outra pasta"
                >
                  <MoveRight className="w-3 h-3" />
                  Mover
                </button>
                <button
                  onClick={handleTriggerBulkDelete}
                  className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Excluir documentos selecionados"
                >
                  <Trash2 className="w-3 h-3" />
                  Excluir
                </button>
                <button
                  onClick={clearDocSelection}
                  className="p-1 text-blue-300 hover:text-white cursor-pointer"
                  title="Limpar seleção"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Document Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {isDocsLoading && filteredDocuments.length === 0 ? (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <DocumentCardSkeleton key={i} />
                ))}
              </>
            ) : (
              filteredDocuments.map(doc => {
              const isSelected = selectedDocumentId === doc.id;
              const isChecked = selectedDocIds.includes(doc.id);

              return (
                <div
                  key={doc.id}
                  data-doc-id={doc.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/fiscal-document-id', doc.id);
                  }}
                  onClick={() => selectDocument(doc.id, `${doc.type} ${doc.number || ''}`)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer relative group ${
                    isSelected 
                      ? currentTheme === 'light'
                        ? 'bg-blue-50 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                        : 'bg-[#1e1e24] border-blue-500 shadow-xs' 
                      : isChecked
                      ? currentTheme === 'light'
                        ? 'bg-blue-50/70 border-blue-300'
                        : 'bg-blue-950/20 border-blue-500/50'
                      : currentTheme === 'light'
                      ? 'bg-white border-[#e2e8f0] hover:bg-[#f1f5f9] hover:border-[#cbd5e1]'
                      : 'bg-[#141418] border-[#27272a] hover:bg-[#18181f] hover:border-[#3f3f46]'
                  }`}
                  title="Clique para visualizar o DANFE ou arraste para uma pasta do workspace"
                >
                  {/* Top Row: Multi-select Checkbox + Type & Date */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDocSelection(doc.id);
                        }}
                        className={`transition-colors cursor-pointer ${
                          currentTheme === 'light' ? 'text-[#94a3b8] hover:text-[#0f172a]' : 'text-[#71717a] hover:text-white'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isSelected 
                          ? 'bg-blue-600 text-white' 
                          : currentTheme === 'light'
                          ? 'bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]'
                          : 'bg-[#27272a] text-[#a1a1aa]'
                      }`}>
                        {doc.type || 'NF-e'}
                      </span>
                    </div>
                    <span className={`text-[11px] ${currentTheme === 'light' ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                      {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('pt-BR') : '-'}
                    </span>
                  </div>

                  {/* Number & Series */}
                  <div className={`text-xs font-bold mb-0.5 flex items-center justify-between pl-5 ${
                    currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'
                  }`}>
                    <span>Nº {doc.number || 'S/N'}</span>
                    {doc.series && (
                      <span className={`text-[10px] font-normal ${currentTheme === 'light' ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Série {doc.series}</span>
                    )}
                  </div>

                  {/* Issuer Name */}
                  <div className={`text-[11px] truncate mb-2 font-medium pl-5 ${
                    currentTheme === 'light' ? 'text-[#475569]' : 'text-[#a1a1aa]'
                  }`} title={doc.issuerName || 'Não Informado'}>
                    {doc.issuerName || 'Não Informado'}
                  </div>

                  {/* Bottom Row: Total & Actions */}
                  <div className={`flex items-center justify-between pt-1.5 pl-5 border-t ${
                    currentTheme === 'light' ? 'border-[#e2e8f0]' : 'border-[#27272a]/70'
                  }`}>
                    <span className={`text-xs font-bold ${currentTheme === 'light' ? 'text-green-600' : 'text-green-400'}`}>
                      {doc.totalAmount ? `R$ ${doc.totalAmount.toFixed(2)}` : 'R$ 0,00'}
                    </span>
                    
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingDocId(doc.id);
                        }}
                        className={`p-1 rounded transition-all cursor-pointer ${
                          currentTheme === 'light' ? 'hover:bg-blue-600 hover:text-white text-[#64748b]' : 'hover:bg-blue-600 hover:text-white text-[#71717a]'
                        }`}
                        title="Mover para outra pasta"
                      >
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectDocument(doc.id);
                          setTimeout(() => window.print(), 150);
                        }}
                        className={`p-1 rounded transition-all cursor-pointer ${
                          currentTheme === 'light' ? 'hover:bg-blue-600 hover:text-white text-[#64748b]' : 'hover:bg-blue-600 hover:text-white text-[#71717a]'
                        }`}
                        title="Imprimir DANFE"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTriggerSingleDelete(doc.id, `Nº ${doc.number || 'S/N'}`);
                        }}
                        className="p-1 rounded hover:bg-red-500/20 hover:text-red-500 text-[#71717a] transition-all cursor-pointer"
                        title="Remover documento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
              })
            )}

            {/* Empty state for documents list */}
            {filteredDocuments.length === 0 && !isDocsLoading && (
              <EmptyState
                icon="file"
                title="Nenhum XML nesta pasta"
                description={searchQuery ? 'Tente outra busca ou remova os filtros.' : 'Arraste arquivos aqui ou clique em Importar XML no topo.'}
                ctaLabel="Importar XML"
                ctaIcon={<UploadCloud className="w-3.5 h-3.5" />}
                onCta={() => {
                  setTargetUploadFolderId(selectedFolderId);
                  fileInputRef.current?.click();
                }}
              />
            )}
          </div>
        </div>

        {/* Document List Resizer Handle */}
        <div 
          onMouseDown={startResizingList}
          className={`w-1.5 hover:bg-blue-500/80 active:bg-blue-600 transition-colors cursor-col-resize flex items-center justify-center relative z-10 shrink-0 group print:hidden select-none ${
            currentTheme === 'light'
              ? 'bg-[#e2e8f0]'
              : 'bg-[#18181b]'
          }`}
          title="Arraste para redimensionar a lista de documentos"
        />

        {/* Column 3: DANFE / PDF Viewer & Converter Area */}
        <main
className={`flex-1 flex flex-col overflow-hidden print:overflow-visible print:bg-white ${
          currentTheme === 'light'
            ? 'bg-[#e2e8f0]'
            : 'bg-[#18181b]'
        }`}>
          {docDetails ? (
            <DocumentPreview docDetails={docDetails} />
          ) : (
            /* Clean Minimalist Welcome / Dropzone state when no file selected */
            <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center overflow-y-auto ${
              currentTheme === 'light' ? 'bg-[#f1f5f9]' : 'bg-[#131317]'
            }`}>
              <div className={`max-w-md w-full p-8 border-2 border-dashed rounded-2xl shadow-xl transition-all flex flex-col items-center ${
                currentTheme === 'light'
                  ? 'border-[#cbd5e1] hover:border-blue-500 bg-white'
                  : 'border-[#27272a] hover:border-blue-500/60 bg-[#0d0d10]'
              }`}>
                <div className="w-14 h-14 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-4 shadow-inner">
                  <UploadCloud className="w-7 h-7" />
                </div>

                <h3 className={`text-base font-bold mb-1 ${currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>
                  Visualizador e Conversor DANFE (PDF)
                </h3>
                
                <p className={`text-xs leading-relaxed mb-6 ${currentTheme === 'light' ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  Selecione uma nota fiscal na lista ou arraste arquivos XML para visualizar o DANFE em PDF no padrão A4 oficial com impressão direta.
                </p>

                <div className={`grid grid-cols-3 gap-3 w-full pt-4 border-t text-left ${
                  currentTheme === 'light' ? 'border-[#e2e8f0]' : 'border-[#27272a]'
                }`}>
                  <div className={`p-2.5 rounded-lg border ${
                    currentTheme === 'light' ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                  }`}>
                    <Sparkles className="w-4 h-4 text-amber-500 mb-1" />
                    <div className={`text-[11px] font-bold ${currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>Workspaces</div>
                    <div className={`text-[10px] ${currentTheme === 'light' ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Pastas livres</div>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    currentTheme === 'light' ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                  }`}>
                    <FileCheck className="w-4 h-4 text-blue-500 mb-1" />
                    <div className={`text-[11px] font-bold ${currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>DANFE A4</div>
                    <div className={`text-[10px] ${currentTheme === 'light' ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Padrão SEFAZ</div>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    currentTheme === 'light' ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                  }`}>
                    <Printer className="w-4 h-4 text-green-500 mb-1" />
                    <div className={`text-[11px] font-bold ${currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>Impressão</div>
                    <div className={`text-[10px] ${currentTheme === 'light' ? 'text-[#64748b]' : 'text-[#71717a]'}`}>PDF Direto</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className={`h-6 border-t flex items-center px-4 justify-between text-[11px] z-20 shrink-0 print:hidden ${
        currentTheme === 'light'
          ? 'bg-white border-[#e2e8f0] text-[#64748b]'
          : 'bg-[#09090b] border-[#27272a] text-[#71717a]'
      }`}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-blue-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Pasta ativa: <strong className={currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'}>{selectedFolderName}</strong>
          </span>
          <span>•</span>
          <span>{documents.length} {documents.length === 1 ? 'documento' : 'documentos'}</span>
          {selectedDocIds.length > 0 && (
            <>
              <span>•</span>
              <span className="text-blue-500 font-semibold">{selectedDocIds.length} selecionados</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>Arraste documentos para pastas ou crie qualquer estrutura hierárquica</span>
        </div>
      </footer>
    </div>
  );
}
