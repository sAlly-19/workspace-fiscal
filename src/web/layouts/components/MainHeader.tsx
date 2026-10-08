import React from 'react';
import {
  ArrowLeft,
  FileText,
  Search,
  X,
  Sun,
  Moon,
  Plus,
  FolderOpen,
  Settings,
  AlertCircle,
} from 'lucide-react';

export interface MainHeaderProps {
  onBackToHome?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  currentTheme: string;
  onUpdateTheme: (theme: 'light' | 'dark') => void;
  selectedFolderId: string | null;
  selectedFolderName: string;
  isUploading: boolean;
  onTriggerUploadXml: () => void;
  onImportDirectory: () => void;
  onOpenSettings: () => void;
  uploadError: string | null;
  onDismissUploadError: () => void;
}

export function MainHeader({
  onBackToHome,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  currentTheme,
  onUpdateTheme,
  selectedFolderId,
  selectedFolderName,
  isUploading,
  onTriggerUploadXml,
  onImportDirectory,
  onOpenSettings,
  uploadError,
  onDismissUploadError,
}: MainHeaderProps) {
  return (
    <>
      <header className="h-14 border-b border-[var(--border-subtle)] bg-[var(--surface-header)] flex items-center px-4 justify-between z-20 shrink-0 print:hidden gap-4 select-none shadow-xs">
        {/* Brand + Back to Home */}
        <div className="flex items-center gap-2.5 shrink-0 select-none">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:scale-95 transition cursor-pointer shrink-0"
              title="Voltar ao Hub Fiscal"
              aria-label="Voltar ao Hub Fiscal"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs shrink-0 bg-red-600 text-white"
            title="Visualizador DANFE / PDF"
          >
            <FileText className="w-4 h-4" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-[var(--text-primary)]">NFView</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              NF-e • NFC-e • CT-e
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 border border-[var(--border-default)] bg-[var(--surface-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-lg py-1.5 pl-9 pr-16 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Buscar notas fiscais... (Ctrl + F ou /)"
            />
            {!searchQuery && (
              <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none gap-1">
                <kbd className="text-[9px] px-1 py-0.5 rounded border border-[var(--border-default)] bg-[var(--surface-inset)] text-[var(--text-muted)] font-mono">
                  Ctrl+F
                </kbd>
                <kbd className="text-[9px] px-1 py-0.5 rounded border border-[var(--border-default)] bg-[var(--surface-inset)] text-[var(--text-muted)] font-mono">
                  /
                </kbd>
              </div>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-2.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Actions: Theme Selector, Primary Single Import & Settings */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Theme Switcher Pill */}
          <div className="flex items-center p-0.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-inset)] shrink-0">
            <button
              type="button"
              onClick={() => onUpdateTheme('light')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                currentTheme === 'light'
                  ? 'bg-white text-amber-500 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Tema Claro"
              aria-label="Ativar tema claro"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onUpdateTheme('dark')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                currentTheme === 'dark'
                  ? 'bg-[#27272a] text-blue-400 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Tema Escuro"
              aria-label="Ativar tema escuro"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onTriggerUploadXml}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer shrink-0"
            title={selectedFolderId ? `Importar XML na pasta "${selectedFolderName}"` : 'Importar arquivos XML'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Importar XML</span>
          </button>

          {typeof window !== 'undefined' && (window as any).api?.openDirectory && (
            <button
              type="button"
              onClick={onImportDirectory}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer shrink-0"
              title="Importar todos os XMLs de uma pasta"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Importar Pasta</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:scale-95 transition cursor-pointer shrink-0"
            title="Configurações do Sistema"
            aria-label="Configurações do Sistema"
          >
            <Settings className="w-4 h-4" />
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
          <button onClick={onDismissUploadError} className="text-red-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}

