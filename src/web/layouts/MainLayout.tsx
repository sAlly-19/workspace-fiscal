import { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspace.store';
import { DocumentPreview } from '../features/documents/DocumentPreview';
import { WorkspaceTree } from '../features/workspace/WorkspaceTree';
import { TitleBar } from '../components/TitleBar';
import { ToastHost, toast } from '../components/Toast';
import { apiFetch } from '../lib/api';
import { MainHeader } from './components/MainHeader';
import { MainFooter } from './components/MainFooter';
import { WorkspaceModals } from './components/WorkspaceModals';
import { DocumentListPane } from '../features/documents/workspace/DocumentListPane';
import { DocumentPreviewEmptyState } from '../features/documents/workspace/DocumentPreviewEmptyState';

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
    moveDocument,
    searchQuery,
    setSearchQuery,
    settings,
    updateSettings,
    setIsSettingsOpen,
  } = useWorkspaceStore();

  const currentTheme = settings.theme || 'dark';

  const [showSplash, setShowSplash] = useState(true);
  const [docDetails, setDocDetails] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; processed: number; percent: number } | null>(
    null
  );
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

  // Load selected document details
  useEffect(() => {
    if (selectedDocumentId) {
      let isCurrent = true;
      const loadDoc = async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await apiFetch(`/api/documents/${selectedDocumentId}`);
            if (res.ok) {
              const data = await res.json();
              if (isCurrent) setDocDetails(data);
              return;
            }
          } catch {
            // retry on connection reset
          }
          await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
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

  // Redimensionamento de painéis
  const startResizingTree = useCallback(() => {
    isResizingTreeRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingTreeRef.current) return;
      setTreeWidth(Math.max(180, Math.min(450, e.clientX)));
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

  const startResizingList = useCallback(() => {
    isResizingListRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingListRef.current) return;
      const effectiveTreeWidth = isTreeCollapsed ? 0 : treeWidth;
      const newWidth = e.clientX - effectiveTreeWidth;
      setListWidth(Math.max(260, Math.min(600, newWidth)));
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

  // Filter documents by search and by selected workspace folder
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      (doc.number && doc.number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.issuerName && doc.issuerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.recipientName && doc.recipientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.accessKey && doc.accessKey.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFolder = selectedFolderId === null ? true : doc.batchId === selectedFolderId;

    return matchesSearch && matchesFolder;
  });

  const allFilteredSelected =
    filteredDocuments.length > 0 && filteredDocuments.every((d) => selectedDocIds.includes(d.id));

  // Batch Print handler
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

  // Upload handlers
  const processFiles = async (files: FileList | File[], folderId?: string | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setIsUploading(true);
    setUploadProgress({ total: files.length, processed: 0, percent: 0 });

    const targetFolder = folderId !== undefined ? folderId : targetUploadFolderId || selectedFolderId;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    if (targetFolder) {
      formData.append('batchId', targetFolder);
    }

    try {
      const res = await apiFetch('/api/import/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errMsg = 'Erro ao fazer upload dos arquivos.';
        try {
          const errData = await res.json();
          if (errData?.error) errMsg = errData.error;
        } catch {}
        setUploadError(errMsg);
        setIsUploading(false);
        setUploadProgress(null);
        setTargetUploadFolderId(null);
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
            const total = statusData.total ?? data.queued ?? files.length;
            const isCompleted =
              statusData.status === 'completed' ||
              statusData.status === 'COMPLETED' ||
              (total > 0 && processed >= total);
            const isFailed = statusData.status === 'error' || statusData.status === 'failed' || statusData.status === 'FAILED';

            const pct = isCompleted ? 100 : total > 0 ? Math.min(99, Math.round((processed / total) * 100)) : 0;

            setUploadProgress({
              total,
              processed: isCompleted ? total : processed,
              percent: pct,
            });

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

    const targetFolder = folderId !== undefined ? folderId : targetUploadFolderId || selectedFolderId;

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
            const isCompleted =
              statusData.status === 'completed' ||
              statusData.status === 'COMPLETED' ||
              (total > 0 && processed >= total);
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
      const jobId = data.jobId;
      const poll = setInterval(async () => {
        try {
          const statusRes = await apiFetch(`/api/import/${jobId}`);
          if (!statusRes.ok) throw new Error(`HTTP ${statusRes.status}`);
          const statusData = await statusRes.json();
          const processed = statusData.processed ?? 0;
          const total = statusData.total ?? data.queued;
          const isCompleted =
            statusData.status === 'completed' || statusData.status === 'COMPLETED' || (total > 0 && processed >= total);
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
            setTimeout(() => {
              setIsUploading(false);
              setUploadProgress(null);
            }, 2200);
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
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
          toast.success('Documento excluído', 'A nota fiscal foi removida do workspace.');
        } catch (err: any) {
          toast.error('Erro ao excluir', err?.message || 'Tente novamente.');
        } finally {
          setIsConfirmLoading(false);
        }
      },
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
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
          toast.success(`${selectedDocIds.length} documento(s) excluído(s)`, 'Remoção em lote concluída.');
        } catch (err: any) {
          toast.error('Erro ao excluir em lote', err?.message || 'Tente novamente.');
        } finally {
          setIsConfirmLoading(false);
        }
      },
    });
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    if (isBulkMoveOpen) {
      await bulkMoveDocuments(selectedDocIds, folderId);
    } else if (movingDocId) {
      await moveDocument(movingDocId, folderId);
    }
    setMovingDocId(null);
    setIsBulkMoveOpen(false);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isInputActive =
        activeElement &&
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);
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

      if (isInputActive && !isSearchInput) {
        return;
      }

      // 3. Setas Cima / Baixo -> Navegar entre as notas na lista
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (filteredDocuments.length === 0) return;
        e.preventDefault();

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
          const activeDoc =
            filteredDocuments.find((d) => d.id === selectedDocumentId) ||
            documents.find((d) => d.id === selectedDocumentId);
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
    documents,
  ]);

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden font-sans select-none relative transition-colors duration-200 theme-${currentTheme} ${
        currentTheme === 'light' ? 'bg-[#f8fafc] text-[#0f172a]' : 'bg-[#09090b] text-[#fafafa]'
      } ${typeof window !== 'undefined' && (window as any).api ? 'electron-app' : ''}`}
      style={{ paddingTop: typeof window !== 'undefined' && (window as any).api ? 36 : 0 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Title Bar (Electron only) */}
      <TitleBar />

      {/* Toast Notifications */}
      <ToastHost />

      {/* Workspace Modals (Confirmation, Import Progress, Move picker, Splash, Settings) */}
      <WorkspaceModals
        showSplash={showSplash}
        onFinishSplash={() => setShowSplash(false)}
        confirmConfig={confirmConfig}
        isConfirmLoading={isConfirmLoading}
        onCancelConfirm={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        selectedFolderName={selectedFolderName}
        onCloseImportProgress={() => {
          setIsUploading(false);
          setUploadProgress(null);
        }}
        isDraggingOver={isDraggingOver}
        selectedFolderId={selectedFolderId}
        fileInputRef={fileInputRef}
        onFileUpload={handleFileUpload}
        movingDocId={movingDocId}
        isBulkMoveOpen={isBulkMoveOpen}
        selectedDocIds={selectedDocIds}
        currentTheme={currentTheme}
        folders={folders}
        onMoveToFolder={handleMoveToFolder}
        onCloseFolderPicker={() => {
          setMovingDocId(null);
          setIsBulkMoveOpen(false);
        }}
      />

      {/* Top Header */}
      <MainHeader
        onBackToHome={onBackToHome}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchInputRef={searchInputRef}
        currentTheme={currentTheme}
        onUpdateTheme={(theme) => updateSettings({ theme })}
        selectedFolderId={selectedFolderId}
        selectedFolderName={selectedFolderName}
        isUploading={isUploading}
        onTriggerUploadXml={() => {
          setTargetUploadFolderId(selectedFolderId);
          fileInputRef.current?.click();
        }}
        onImportDirectory={handleImportDirectory}
        onOpenSettings={() => setIsSettingsOpen(true)}
        uploadError={uploadError}
        onDismissUploadError={() => setUploadError(null)}
      />

      {/* Main 3-Column Body (Workspace Tree | Documents List | DANFE Preview) */}
      <div className="flex-1 flex overflow-hidden relative print:overflow-visible">
        {/* Column 1: Workspace Hierarchy Tree */}
        {!isTreeCollapsed && (
          <aside
            style={{ width: `${treeWidth}px` }}
            className={`h-full flex flex-col shrink-0 print:hidden overflow-hidden border-r ${
              currentTheme === 'light' ? 'bg-[#f1f5f9] border-[#e2e8f0]' : 'bg-[#0d0d10] border-[#27272a]'
            }`}
          >
            <WorkspaceTree onImportToFolder={handleImportToSpecificFolder} />
          </aside>
        )}

        {/* Tree Resizer Handle & Collapse Toggle */}
        <div
          onMouseDown={startResizingTree}
          className={`w-1.5 hover:bg-blue-500/80 active:bg-blue-600 transition-colors cursor-col-resize flex items-center justify-center relative z-10 shrink-0 group print:hidden select-none ${
            currentTheme === 'light' ? 'bg-[#e2e8f0]' : 'bg-[#18181b]'
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
            {isTreeCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        </div>

        {/* Column 2: Documents List with Bulk Selection and Actions */}
        <DocumentListPane
          listWidth={listWidth}
          currentTheme={currentTheme}
          filteredDocuments={filteredDocuments}
          selectedDocumentId={selectedDocumentId}
          selectedDocIds={selectedDocIds}
          selectedFolderName={selectedFolderName}
          allFilteredSelected={allFilteredSelected}
          isDocsLoading={isDocsLoading}
          searchQuery={searchQuery}
          onSelectAllDocs={(checked) => selectAllDocs(checked)}
          onSelectDocument={selectDocument}
          onToggleDocSelection={toggleDocSelection}
          onBatchPrint={handleBatchPrint}
          onOpenBulkMove={() => setIsBulkMoveOpen(true)}
          onTriggerBulkDelete={handleTriggerBulkDelete}
          onClearDocSelection={clearDocSelection}
          onSetMovingDocId={setMovingDocId}
          onTriggerSingleDelete={handleTriggerSingleDelete}
          onTriggerUploadXml={() => {
            setTargetUploadFolderId(selectedFolderId);
            fileInputRef.current?.click();
          }}
        />

        {/* Document List Resizer Handle */}
        <div
          onMouseDown={startResizingList}
          className={`w-1.5 hover:bg-blue-500/80 active:bg-blue-600 transition-colors cursor-col-resize flex items-center justify-center relative z-10 shrink-0 group print:hidden select-none ${
            currentTheme === 'light' ? 'bg-[#e2e8f0]' : 'bg-[#18181b]'
          }`}
          title="Arraste para redimensionar a lista de documentos"
        />

        {/* Column 3: DANFE / PDF Viewer & Converter Area */}
        <main
          className={`flex-1 flex flex-col overflow-hidden select-text print:overflow-visible print:bg-white ${
            currentTheme === 'light' ? 'bg-[#e2e8f0]' : 'bg-[#18181b]'
          }`}
        >
          {docDetails ? (
            <DocumentPreview docDetails={docDetails} />
          ) : (
            <DocumentPreviewEmptyState currentTheme={currentTheme} />
          )}
        </main>
      </div>

      {/* Footer */}
      <MainFooter
        currentTheme={currentTheme}
        selectedFolderName={selectedFolderName}
        documentsCount={documents.length}
        selectedCount={selectedDocIds.length}
      />
    </div>
  );
}
