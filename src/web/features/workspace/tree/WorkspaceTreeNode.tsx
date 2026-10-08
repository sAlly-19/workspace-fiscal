import React from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit2,
  Trash2,
  FolderPlus,
  Upload,
  Check,
  X,
} from 'lucide-react';
import type { FolderNode } from '../../../stores/workspace.store';

export interface WorkspaceTreeNodeProps {
  node: FolderNode;
  depth?: number;
  currentTheme: string;
  selectedFolderId: string | null;
  expandedFolderIds: Record<string, boolean>;
  editingFolderId: string | null;
  editingName: string;
  creatingParentId: string | null | undefined;
  newFolderName: string;
  activeMenuId: string | null;
  dragOverFolderId: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelectFolder: (folderId: string, name: string) => void;
  onToggleExpand: (folderId: string) => void;
  onStartCreate: (parentId: string | null, e?: React.MouseEvent) => void;
  onSaveCreate: () => void;
  onCancelCreate: () => void;
  onChangeNewFolderName: (name: string) => void;
  onStartEdit: (folder: FolderNode, e: React.MouseEvent) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onChangeEditingName: (name: string) => void;
  onRequestDelete: (folder: FolderNode, e: React.MouseEvent) => void;
  onToggleMenu: (folderId: string) => void;
  onCloseMenu: () => void;
  onDragOver: (e: React.DragEvent, folderId: string | null) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, folderId: string | null) => void;
  onImportToFolder?: (folderId: string | null) => void;
}

export function WorkspaceTreeNode({
  node,
  depth = 0,
  currentTheme,
  selectedFolderId,
  expandedFolderIds,
  editingFolderId,
  editingName,
  creatingParentId,
  newFolderName,
  activeMenuId,
  dragOverFolderId,
  inputRef,
  onSelectFolder,
  onToggleExpand,
  onStartCreate,
  onSaveCreate,
  onCancelCreate,
  onChangeNewFolderName,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onChangeEditingName,
  onRequestDelete,
  onToggleMenu,
  onCloseMenu,
  onDragOver,
  onDragLeave,
  onDrop,
  onImportToFolder,
}: WorkspaceTreeNodeProps) {
  const isExpanded = !!expandedFolderIds[node.id];
  const isSelected = selectedFolderId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const isEditing = editingFolderId === node.id;
  const isCreatingHere = creatingParentId === node.id;
  const isDragTarget = dragOverFolderId === node.id;

  return (
    <div className="select-none">
      {/* Folder Item Bar */}
      <div
        onClick={() => onSelectFolder(node.id, node.name)}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, node.id)}
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
              onToggleExpand(node.id);
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
                onChange={(e) => onChangeEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveEdit();
                  if (e.key === 'Escape') onCancelEdit();
                }}
                autoFocus
                className={`w-full px-1.5 py-0.5 rounded text-xs outline-none border ${
                  currentTheme === 'light'
                    ? 'bg-white border-blue-500 text-[#0f172a]'
                    : 'bg-[#09090b] border-blue-400 text-white'
                }`}
              />
              <button onClick={onSaveEdit} className="p-0.5 hover:text-green-500">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={onCancelEdit} className="p-0.5 hover:text-red-500">
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
                  onToggleMenu(node.id);
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
                      onCloseMenu();
                    }}
                  />
                  <div className={`absolute right-0 top-6 z-40 w-44 rounded-xl shadow-2xl py-1 text-xs border ${
                    currentTheme === 'light'
                      ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                      : 'bg-[#18181b] border-[#3f3f46] text-[#fafafa]'
                  }`}>
                    <button
                      onClick={(e) => onStartCreate(node.id, e)}
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
                        onCloseMenu();
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
                      onClick={(e) => onStartEdit(node, e)}
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
                      onClick={(e) => onRequestDelete(node, e)}
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
          {node.children!.map((child) => (
            <WorkspaceTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
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
              onSelectFolder={onSelectFolder}
              onToggleExpand={onToggleExpand}
              onStartCreate={onStartCreate}
              onSaveCreate={onSaveCreate}
              onCancelCreate={onCancelCreate}
              onChangeNewFolderName={onChangeNewFolderName}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onChangeEditingName={onChangeEditingName}
              onRequestDelete={onRequestDelete}
              onToggleMenu={onToggleMenu}
              onCloseMenu={onCloseMenu}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onImportToFolder={onImportToFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

