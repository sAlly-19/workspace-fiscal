import React, { useState, useRef, memo, useCallback } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Files,
  FolderPlus,
  Upload,
  Check,
  X
} from 'lucide-react';
import { useWorkspaceStore, type FolderNode } from '../../stores/workspace.store';
import { ConfirmModal } from '../../components/ConfirmModal';

interface WorkspaceTreeProps {
  onImportToFolder?: (folderId: string | null) => void;
  onSelectFolder?: (folderId: string | null, name: string) => void;
}

export function WorkspaceTree({ onImportToFolder, onSelectFolder }: WorkspaceTreeProps) {
  const {
    folders,
    selectedFolderId,
    expandedFolderIds,
    selectFolder,
    toggleFolderExpand,
    createFolder,
    updateFolder,
    deleteFolder,
    moveDocument,
    settings,
  } = useWorkspaceStore();

  const currentTheme = settings.theme || 'dark';

  const [creatingParentId, setCreatingParentId] = useState<string | null | undefined>(undefined);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Folder deletion modal state
  const [folderToDelete, setFolderToDelete] = useState<FolderNode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartCreate = (parentId: string | null = null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCreatingParentId(parentId);
    setNewFolderName('');
    setActiveMenuId(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSaveCreate = async () => {
    if (newFolderName.trim() && creatingParentId !== undefined) {
      await createFolder(newFolderName.trim(), creatingParentId);
    }
    setCreatingParentId(undefined);
    setNewFolderName('');
  };

  const handleCancelCreate = () => {
    setCreatingParentId(undefined);
    setNewFolderName('');
  };

  const handleStartEdit = (folder: FolderNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
    setActiveMenuId(null);
  };

  const handleSaveEdit = async () => {
    if (editingFolderId && editingName.trim()) {
      await updateFolder(editingFolderId, editingName.trim());
    }
    setEditingFolderId(null);
    setEditingName('');
  };

  const handleRequestDelete = (folder: FolderNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setFolderToDelete(folder);
  };

  const handleConfirmDelete = async () => {
    if (!folderToDelete) return;
    setIsDeleting(true);
    try {
      await deleteFolder(folderToDelete.id);
      setFolderToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Drag over folder to drop documents or move
  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    // Check if dragging an existing document
    const docId = e.dataTransfer.getData('application/fiscal-document-id');
    if (docId) {
      await moveDocument(docId, folderId);
      return;
    }

    // Otherwise check if files are being uploaded directly to this folder
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onImportToFolder) {
      onImportToFolder(folderId);
    }
  };

  const renderFolderNode = (node: FolderNode, depth = 0) => {
    const isExpanded = !!expandedFolderIds[node.id];
    const isSelected = selectedFolderId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const isEditing = editingFolderId === node.id;
    const isCreatingHere = creatingParentId === node.id;
    const isDragTarget = dragOverFolderId === node.id;

    return (
      <div key={node.id} className="select-none">
        {/* Folder Item Bar */}
        <div
          onClick={() => selectFolder(node.id, node.name)}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.id)}
          style={{ paddingLeft: `${Math.max(8, depth * 14 + 8)}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-md cursor-pointer text-xs transition-all relative ${
            isSelected
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : isDragTarget
              ? currentTheme === 'light'
                ? 'bg-blue-100 border border-blue-500 text-blue-950'
                : 'bg-blue-500/20 border border-blue-400 text-white'
              : currentTheme === 'light'
              ? 'text-[#334155] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
              : 'text-[#d4d4d8] hover:bg-[#1f1f23] hover:text-white'
          }`}
        >
          {/* Left: Expand Chevron + Folder Icon + Name */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1">
            {/* Chevron toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpand(node.id);
              }}
              className={`w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 ${
                hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Folder Icon */}
            {isExpanded ? (
              <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-blue-500'}`} />
            ) : (
              <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
            )}

            {/* Name / Input */}
            {isEditing ? (
              <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') setEditingFolderId(null);
                  }}
                  autoFocus
                  className={`w-full px-1.5 py-0.5 rounded text-xs outline-none border ${
                    currentTheme === 'light'
                      ? 'bg-white border-blue-500 text-[#0f172a]'
                      : 'bg-[#09090b] border-blue-400 text-white'
                  }`}
                />
                <button onClick={handleSaveEdit} className="p-0.5 hover:text-green-500">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditingFolderId(null)} className="p-0.5 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="truncate flex-1 tracking-tight" title={node.name}>
                {node.name}
              </span>
            )}
          </div>

          {/* Right: Badge / Action Controls */}
          {!isEditing && (
            <div className="flex items-center gap-1 shrink-0">
              {/* Document count badge */}
              {node.documentCount !== undefined && node.documentCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isSelected 
                      ? 'bg-blue-700 text-white' 
                      : currentTheme === 'light'
                      ? 'bg-[#e2e8f0] text-[#475569]'
                      : 'bg-[#27272a] text-[#a1a1aa]'
                  }`}
                >
                  {node.documentCount}
                </span>
              )}

              {/* Action Menu Trigger */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === node.id ? null : node.id);
                  }}
                  className={`p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity ${
                    activeMenuId === node.id ? 'opacity-100' : ''
                  }`}
                  title="Opções da pasta"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* Dropdown Popup */}
                {activeMenuId === node.id && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(null);
                      }}
                    />
                    <div className={`absolute right-0 top-6 z-40 w-44 rounded-xl shadow-2xl py-1 text-xs border ${
                      currentTheme === 'light'
                        ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                        : 'bg-[#18181b] border-[#3f3f46] text-[#fafafa]'
                    }`}>
                      <button
                        onClick={(e) => handleStartCreate(node.id, e)}
                        className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors cursor-pointer ${
                          currentTheme === 'light'
                            ? 'hover:bg-blue-600 hover:text-white text-[#334155]'
                            : 'hover:bg-blue-600 hover:text-white'
                        }`}
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
                        Nova Subpasta
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                          onImportToFolder?.(node.id);
                        }}
                        className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors cursor-pointer ${
                          currentTheme === 'light'
                            ? 'hover:bg-blue-600 hover:text-white text-[#334155]'
                            : 'hover:bg-blue-600 hover:text-white'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        Importar XML aqui
                      </button>
                      <button
                        onClick={(e) => handleStartEdit(node, e)}
                        className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors cursor-pointer ${
                          currentTheme === 'light'
                            ? 'hover:bg-blue-600 hover:text-white text-[#334155]'
                            : 'hover:bg-blue-600 hover:text-white'
                        }`}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                        Renomear
                      </button>
                      <div className={`border-t my-1 ${currentTheme === 'light' ? 'border-[#e2e8f0]' : 'border-[#27272a]'}`} />
                      <button
                        onClick={(e) => handleRequestDelete(node, e)}
                        className="w-full px-3 py-1.5 text-left hover:bg-red-600 hover:text-white text-red-400 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir Pasta
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Inline Subfolder Creation Form */}
        {isCreatingHere && (
          <div
            style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}
            className="py-1 pr-2 flex items-center gap-1.5 text-xs select-none"
          >
            <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Nome da subpasta..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCreate();
                if (e.key === 'Escape') handleCancelCreate();
              }}
              className={`flex-1 rounded px-2 py-0.5 text-xs outline-none border ${
                currentTheme === 'light'
                  ? 'bg-white border-blue-500 text-[#0f172a]'
                  : 'bg-[#18181b] border-blue-500 text-white'
              }`}
            />
            <button onClick={handleSaveCreate} className="p-1 hover:text-green-500">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleCancelCreate} className="p-1 hover:text-red-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Children Render */}
        {isExpanded && hasChildren && (
          <div className="relative">
            {/* Guide line */}
            <div
              style={{ left: `${depth * 14 + 16}px` }}
              className={`absolute top-0 bottom-1 w-px ${
                currentTheme === 'light' 
                  ? 'bg-[#cbd5e1]' 
                  : 'bg-[#27272a]'
              }`}
            />
            {node.children.map((child) => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full ${
      currentTheme === 'light'
        ? 'bg-[#f1f5f9] text-[#0f172a]'
        : 'bg-[#0d0d10] text-[#fafafa]'
    }`}>
      {/* Delete Folder Modal Confirmation */}
      <ConfirmModal
        isOpen={!!folderToDelete}
        title="Excluir Pasta"
        description={`Tem certeza que deseja excluir a pasta "${folderToDelete?.name}" e todas as suas eventuais subpastas? Os documentos serão movidos para a raiz.`}
        confirmLabel="Excluir Pasta"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setFolderToDelete(null)}
      />

      {/* Workspace Header */}
      <div className={`h-12 px-3 border-b flex items-center justify-between shrink-0 ${
        currentTheme === 'light'
          ? 'bg-[#f8fafc] border-[#e2e8f0]'
          : 'bg-[#111114] border-[#27272a]'
      }`}>
        <span className={`text-[11px] font-bold uppercase tracking-wider ${
          currentTheme === 'light' ? 'text-[#475569]' : 'text-[#a1a1aa]'
        }`}>
          Pastas
        </span>
        <button
          onClick={(e) => handleStartCreate(null, e)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded transition-all cursor-pointer ${
            currentTheme === 'light'
              ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
              : 'text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20'
          }`}
          title="Criar nova pasta no topo do workspace"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          Nova Pasta
        </button>
      </div>

      {/* Folders Tree Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {/* Root 'All Documents' Option */}
        <div
          onClick={() => selectFolder(null, 'Todos os Documentos')}
          onDragOver={(e) => handleDragOver(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
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
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCreate();
                if (e.key === 'Escape') handleCancelCreate();
              }}
              className={`flex-1 rounded px-2 py-0.5 text-xs outline-none border ${
                currentTheme === 'light'
                  ? 'bg-white border-blue-500 text-[#0f172a]'
                  : 'bg-[#18181b] border-blue-500 text-white'
              }`}
            />
            <button onClick={handleSaveCreate} className="p-1 hover:text-green-500">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleCancelCreate} className="p-1 hover:text-red-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tree Nodes */}
        {folders.map((folder) => renderFolderNode(folder, 0))}

        {/* Empty tree state */}
        {folders.length === 0 && creatingParentId === undefined && (
          <div className="py-8 px-4 text-center">
            <FolderPlus className={`w-8 h-8 mx-auto mb-2 opacity-50 ${currentTheme === 'light' ? 'text-[#94a3b8]' : 'text-[#52525b]'}`} />
            <p className={`text-xs font-semibold ${currentTheme === 'light' ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
              Nenhuma pasta criada
            </p>
            <p className={`text-[10px] mt-1 leading-relaxed ${currentTheme === 'light' ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
              Crie pastas livres para organizar empresas, anos, meses ou operações.
            </p>
            <button
              onClick={(e) => handleStartCreate(null, e)}
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
      </div>
    </div>
  );
}
