import React from 'react';
import { FolderPlus, ChevronRight } from 'lucide-react';
import type { FolderNode } from '../../../stores/workspace.store';

export interface WorkspaceTreeHeaderProps {
  currentTheme: string;
  selectedFolderId: string | null;
  breadcrumb: FolderNode[];
  onStartCreateRoot: (e: React.MouseEvent) => void;
  onSelectFolder: (folderId: string | null, name: string) => void;
}

export function WorkspaceTreeHeader({
  currentTheme,
  selectedFolderId,
  breadcrumb,
  onStartCreateRoot,
  onSelectFolder,
}: WorkspaceTreeHeaderProps) {
  return (
    <>
      {/* Workspace Header */}
      <div
        className={`h-12 px-3 border-b flex items-center justify-between shrink-0 ${
          currentTheme === 'light'
            ? 'bg-[#f8fafc] border-[#e2e8f0]'
            : 'bg-[#111114] border-[#27272a]'
        }`}
      >
        <span
          className={`text-[11px] font-bold uppercase tracking-wider ${
            currentTheme === 'light' ? 'text-[#475569]' : 'text-[#a1a1aa]'
          }`}
        >
          Pastas
        </span>
        <button
          onClick={onStartCreateRoot}
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

      {/* Breadcrumb (caminho da pasta atual) */}
      {selectedFolderId && breadcrumb.length > 0 && (
        <div
          className={`px-3 py-1.5 text-[10px] flex items-center gap-1 overflow-x-auto whitespace-nowrap shrink-0 ${
            currentTheme === 'light'
              ? 'bg-[#f1f5f9] text-[#475569] border-b border-[#e2e8f0]'
              : 'bg-[#0a0a0c] text-[#a1a1aa] border-b border-[#27272a]'
          }`}
          aria-label="Caminho da pasta atual"
        >
          {breadcrumb.map((node, idx) => (
            <React.Fragment key={node.id}>
              {idx > 0 && <ChevronRight className="w-3 h-3 opacity-50 shrink-0" />}
              <button
                onClick={() => onSelectFolder(node.id, node.name)}
                className="hover:underline truncate max-w-[120px]"
                title={node.name}
              >
                {node.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </>
  );
}

