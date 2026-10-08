import React, { useState, useRef, useMemo } from 'react';
import { useWorkspaceStore, type FolderNode } from '../../stores/workspace.store';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  WorkspaceTreeHeader,
  WorkspaceTreeNode,
  WorkspaceTreeRootArea,
} from './tree';

export interface WorkspaceTreeProps {
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

  const breadcrumb = useMemo(() => {
    const path: FolderNode[] = [];
    const find = (nodes: FolderNode[], id: string): boolean => {
      for (const n of nodes) {
        if (n.id === id) {
          path.unshift(n);
          return true;
        }
        if (n.children && find(n.children, id)) {
          path.unshift(n);
          return true;
        }
      }
      return false;
    };
    if (selectedFolderId) find(folders, selectedFolderId);
    return path;
  }, [folders, selectedFolderId]);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelectFolder = (folderId: string | null, name: string) => {
    selectFolder(folderId, name);
    onSelectFolder?.(folderId, name);
  };

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

  return (
    <div
      className={`flex flex-col h-full ${
        currentTheme === 'light'
          ? 'bg-[#f1f5f9] text-[#0f172a]'
          : 'bg-[#0d0d10] text-[#fafafa]'
      }`}
    >
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

      {/* Header and Breadcrumbs */}
      <WorkspaceTreeHeader
        currentTheme={currentTheme}
        selectedFolderId={selectedFolderId}
        breadcrumb={breadcrumb}
        onStartCreateRoot={(e) => handleStartCreate(null, e)}
        onSelectFolder={handleSelectFolder}
      />

      {/* Folders Tree Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <WorkspaceTreeRootArea
          currentTheme={currentTheme}
          selectedFolderId={selectedFolderId}
          dragOverFolderId={dragOverFolderId}
          creatingParentId={creatingParentId}
          newFolderName={newFolderName}
          foldersCount={folders.length}
          inputRef={inputRef}
          onSelectAllDocuments={() => handleSelectFolder(null, 'Todos os Documentos')}
          onStartCreateRoot={(e) => handleStartCreate(null, e)}
          onSaveCreate={handleSaveCreate}
          onCancelCreate={handleCancelCreate}
          onChangeNewFolderName={setNewFolderName}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />

        {/* Tree Nodes */}
        {folders.map((folder) => (
          <WorkspaceTreeNode
            key={folder.id}
            node={folder}
            depth={0}
            currentTheme={currentTheme}
            selectedFolderId={selectedFolderId}
            expandedFolderIds={expandedFolderIds}
            editingFolderId={editingFolderId}
            editingName={editingName}
            creatingParentId={creatingParentId}
            newFolderName={newFolderName}
            activeMenuId={activeMenuId}
            dragOverFolderId={dragOverFolderId}
            inputRef={inputRef}
            onSelectFolder={handleSelectFolder}
            onToggleExpand={toggleFolderExpand}
            onStartCreate={handleStartCreate}
            onSaveCreate={handleSaveCreate}
            onCancelCreate={handleCancelCreate}
            onChangeNewFolderName={setNewFolderName}
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={() => setEditingFolderId(null)}
            onChangeEditingName={setEditingName}
            onRequestDelete={handleRequestDelete}
            onToggleMenu={(id) => setActiveMenuId(activeMenuId === id ? null : id)}
            onCloseMenu={() => setActiveMenuId(null)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onImportToFolder={onImportToFolder}
          />
        ))}
      </div>
    </div>
  );
}
export default WorkspaceTree;
