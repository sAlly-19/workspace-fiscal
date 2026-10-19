import React from 'react';
import { FolderSync, Check, X, FolderOpen } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspace.store';
import type { WatchPromptItem } from '../hooks/useFolderWatcherEvents';

export interface FolderWatchPromptCardProps {
  prompts: WatchPromptItem[];
  onConfirm: (folderId: string) => Promise<void>;
  onDismiss: (folderId: string) => Promise<void>;
  onViewFolder: (folderId: string, folderName: string) => void;
}

export function FolderWatchPromptCard({
  prompts,
  onConfirm,
  onDismiss,
  onViewFolder,
}: FolderWatchPromptCardProps) {
  const currentTheme = useWorkspaceStore((s) => s.settings.theme || 'dark');
  const isLight = currentTheme === 'light';

  if (!prompts || prompts.length === 0) return null;

  return (
    <aside
      aria-label="Notificações de Pastas Monitoradas"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full px-4 sm:px-0 pointer-events-none"
    >
      {prompts.map((p) => (
        <div
          key={p.folderId}
          className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border transition-all animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            isLight
              ? 'bg-white/95 border-blue-200 text-slate-800 backdrop-blur-md'
              : 'bg-[#18181b]/95 border-blue-500/30 text-white backdrop-blur-md'
          }`}
        >
          <div className="flex items-start gap-3">
            {/* Pulsing indicator icon */}
            <div className="relative mt-0.5 shrink-0">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <FolderSync className="w-5 h-5 animate-spin-slow" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">
                  Pasta Monitorada
                </h4>
                <button
                  onClick={() => onDismiss(p.folderId)}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    isLight
                      ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Dispensar notificação"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm font-semibold truncate mt-0.5" title={p.folderName}>
                {p.folderName}
              </p>
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}
              >
                {p.pendingCount === 1
                  ? '1 novo arquivo XML aguardando importação.'
                  : `${p.pendingCount} novos arquivos XML aguardando importação.`}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => onConfirm(p.folderId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Importar Agora
                </button>

                <button
                  onClick={() => onViewFolder(p.folderId, p.folderName)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    isLight
                      ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
                      : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                  Ver Pasta
                </button>

                <button
                  onClick={() => onDismiss(p.folderId)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                    isLight
                      ? 'text-slate-500 hover:text-slate-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Ignorar
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </aside>
  );
}

