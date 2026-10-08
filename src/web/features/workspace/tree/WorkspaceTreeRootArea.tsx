import React from 'react';
import { Files, Folder, FolderPlus, Plus, Check, X } from 'lucide-react';

export interface WorkspaceTreeRootAreaProps {
  currentTheme: string;
  selectedFolderId: string | null;
  dragOverFolderId: string | null;
  creatingParentId: string | null | undefined;
  newFolderName: string;
  foldersCount: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelectAllDocuments: () => void;
  onStartCreateRoot: (e: React.MouseEvent) => void;
  onSaveCreate: () => void;
  onCancelCreate: () => void;
  onChangeNewFolderName: (name: string) => void;
  onDragOver: (e: React.DragEvent, folderId: string | null) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, folderId: string | null) => void;
}

export function WorkspaceTreeRootArea({
  currentTheme,
  selectedFolderId,
  dragOverFolderId,
  creatingParentId,
  newFolderName,
  foldersCount,
  inputRef,
  onSelectAllDocuments,
  onStartCreateRoot,
  onSaveCreate,
  onCancelCreate,
  onChangeNewFolderName,
  onDragOver,
  onDragLeave,
  onDrop,
}: WorkspaceTreeRootAreaProps) {
  return (
    <>
      {/* Root 'All Documents' Option */}
      <div
        onClick={onSelectAllDocuments}
        onDragOver={(e) => onDragOver(e, null)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, null)}
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer text-xs transition-all ${
          selectedFolderId === null
            ? 'bg-blue-600 text-white font-semibold shadow-xs'
            : dragOverFolderId === 'root'
            ? currentTheme === 'light'
              ? 'bg-blue-100 border border-blue-500 text-blue-950'
              : 'bg-blue-500/20 border border-blue-400 text-white'
            : currentTheme === 'light'
            ? 'text-[#334155] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
            : 'text-[#d4d4d8] hover:bg-[#1f1f23] hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          <Files className={`w-3.5 h-3.5 ${selectedFolderId === null ? 'text-white' : 'text-blue-500'}`} />
          <span>Todos os Documentos</span>
        </div>
      </div>

      <div className={`my-1 border-t ${currentTheme === 'light' ? 'border-[#e2e8f0]' : 'border-[#27272a]'}`} />

      {/* Root level creation input if active */}
      {creatingParentId === null && (
        <div className="py-1 px-2 flex items-center gap-1.5 text-xs">
          <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Ex: Empresa ABC, 2026, Saída..."
            value={newFolderName}
            onChange={(e) => onChangeNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveCreate();
              if (e.key === 'Escape') onCancelCreate();
            }}
            className={`flex-1 rounded px-2 py-0.5 text-xs outline-none border ${
              currentTheme === 'light'
                ? 'bg-white border-blue-500 text-[#0f172a]'
                : 'bg-[#18181b] border-blue-500 text-white'
            }`}
          />
          <button onClick={onSaveCreate} className="p-1 hover:text-green-500">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={onCancelCreate} className="p-1 hover:text-red-500">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Empty tree state (rendered outside the list when foldersCount === 0) */}
      {foldersCount === 0 && creatingParentId === undefined && (
        <div className="py-8 px-4 text-center">
          <FolderPlus className={`w-8 h-8 mx-auto mb-2 opacity-50 ${currentTheme === 'light' ? 'text-[#94a3b8]' : 'text-[#52525b]'}`} />
          <p className={`text-xs font-semibold ${currentTheme === 'light' ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
            Nenhuma pasta criada
          </p>
          <p className={`text-[10px] mt-1 leading-relaxed ${currentTheme === 'light' ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
            Crie pastas livres para organizar empresas, anos, meses ou operações.
          </p>
          <button
            onClick={onStartCreateRoot}
            className={`mt-3 px-3 py-1.5 border text-xs rounded-md transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              currentTheme === 'light'
                ? 'bg-white hover:bg-blue-600 hover:text-white border-[#cbd5e1] text-[#334155]'
                : 'bg-[#18181b] hover:bg-blue-600 hover:text-white border-[#27272a] text-[#a1a1aa]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Criar Primeira Pasta
          </button>
        </div>
      )}
    </>
  );
}

