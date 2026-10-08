import React from 'react';
import { UploadCloud, FolderOpen, X, FileText } from 'lucide-react';
import type { FolderNode } from '../../stores/workspace.store';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ImportProgressModal } from '../../components/ImportProgressModal';
import { SettingsModal } from '../../components/SettingsModal';
import { SplashScreen } from '../../components/SplashScreen';

export interface WorkspaceModalsProps {
  showSplash: boolean;
  onFinishSplash: () => void;
  confirmConfig: {
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void>;
  };
  isConfirmLoading: boolean;
  onCancelConfirm: () => void;
  isUploading: boolean;
  uploadProgress: { total: number; processed: number; percent: number } | null;
  selectedFolderName: string;
  onCloseImportProgress: () => void;
  isDraggingOver: boolean;
  selectedFolderId: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  movingDocId: string | null;
  isBulkMoveOpen: boolean;
  selectedDocIds: string[];
  currentTheme: string;
  folders: FolderNode[];
  onMoveToFolder: (folderId: string | null) => Promise<void>;
  onCloseFolderPicker: () => void;
}

export function WorkspaceModals({
  showSplash,
  onFinishSplash,
  confirmConfig,
  isConfirmLoading,
  onCancelConfirm,
  isUploading,
  uploadProgress,
  selectedFolderName,
  onCloseImportProgress,
  isDraggingOver,
  selectedFolderId,
  fileInputRef,
  onFileUpload,
  movingDocId,
  isBulkMoveOpen,
  selectedDocIds,
  currentTheme,
  folders,
  onMoveToFolder,
  onCloseFolderPicker,
}: WorkspaceModalsProps) {
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

  return (
    <>
      {/* Splash Screen on Initial Startup */}
      {showSplash && <SplashScreen onFinish={onFinishSplash} />}

      {/* Settings Modal */}
      <SettingsModal />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmLabel={confirmConfig.confirmLabel}
        confirmVariant="danger"
        isLoading={isConfirmLoading}
        onConfirm={confirmConfig.onConfirm}
        onCancel={onCancelConfirm}
      />

      {/* Import Progress Modal (with Minimizable Bubble) */}
      <ImportProgressModal
        isOpen={isUploading}
        total={uploadProgress?.total || 0}
        processed={uploadProgress?.processed || 0}
        percent={uploadProgress?.percent || 0}
        targetFolderName={selectedFolderName}
        onClose={onCloseImportProgress}
      />

      {/* Full-screen Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-blue-600/30 backdrop-blur-xs z-50 flex flex-col items-center justify-center border-4 border-dashed border-blue-400 m-4 rounded-2xl pointer-events-none animate-in fade-in zoom-in-95">
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
        onChange={onFileUpload}
        className="hidden"
      />

      {/* Folder Picker Modal for Moving Document(s) */}
      {(movingDocId || isBulkMoveOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 ${
              currentTheme === 'light'
                ? 'bg-white border border-[#cbd5e1] text-[#0f172a] shadow-2xl'
                : 'bg-[#18181b] border border-[#3f3f46] text-white shadow-2xl'
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between ${
                currentTheme === 'light'
                  ? 'bg-[#f8fafc] border-[#e2e8f0]'
                  : 'bg-[#141418] border-[#27272a]'
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold">
                  {isBulkMoveOpen
                    ? `Mover ${selectedDocIds.length} Documentos para Pasta`
                    : 'Mover Documento para Pasta'}
                </h3>
              </div>
              <button
                onClick={onCloseFolderPicker}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  currentTheme === 'light'
                    ? 'hover:bg-[#e2e8f0] text-[#64748b]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 max-h-72 overflow-y-auto space-y-1">
              <button
                onClick={() => onMoveToFolder(null)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                  currentTheme === 'light'
                    ? 'hover:bg-blue-600 hover:text-white text-[#334155]'
                    : 'hover:bg-blue-600 hover:text-white text-[#d4d4d8]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Sem Pasta (Raiz / Geral)</span>
              </button>

              <div
                className={`border-t my-1 ${
                  currentTheme === 'light' ? 'border-[#e2e8f0]' : 'border-[#27272a]'
                }`}
              />

              {getFlatFolders(folders).map((f) => (
                <button
                  key={f.id}
                  onClick={() => onMoveToFolder(f.id)}
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
                <p className="text-xs text-[#71717a] p-3 text-center">
                  Nenhuma pasta criada ainda no workspace.
                </p>
              )}
            </div>
            <div
              className={`p-3 border-t flex justify-end ${
                currentTheme === 'light'
                  ? 'bg-[#f8fafc] border-[#e2e8f0]'
                  : 'bg-[#111114] border-[#27272a]'
              }`}
            >
              <button
                onClick={onCloseFolderPicker}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  currentTheme === 'light'
                    ? 'bg-[#e2e8f0] text-[#0f172a] hover:bg-[#cbd5e1]'
                    : 'bg-[#27272a] hover:bg-[#3f3f46] text-white'
                }`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

