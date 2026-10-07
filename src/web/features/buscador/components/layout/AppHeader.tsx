import React from 'react';
import { ArrowLeft, Building2, Moon, RefreshCw, Settings, Sun } from 'lucide-react';
import type { Company, SefazEnvironment } from '@/core/buscador/domain/types';
import type { NfseEnvironment } from '@/core/buscador/nfse/domain/types';
import { NfseWorkspaceSelector } from '../NfseWorkspaceSelector';
import type { BuscadorWorkspaceMode } from '../../features/workspace/workspace-controller';

interface AppHeaderProps {
  activeCompany: Pick<Company, 'name'> | null;
  environment: SefazEnvironment | NfseEnvironment;
  workspaceMode?: BuscadorWorkspaceMode;
  onWorkspaceModeChange?: (mode: BuscadorWorkspaceMode) => void;
  theme: 'dark' | 'light';
  onBackToHome?: () => void;
  onToggleTheme?: () => void;
  onThemeChange?: (theme: 'dark' | 'light') => void;
  onOpenSettings: () => void;
  onSynchronize?: () => void;
  isSynchronizing?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeCompany,
  environment,
  workspaceMode = 'SEFAZ',
  onWorkspaceModeChange,
  theme,
  onBackToHome,
  onToggleTheme,
  onThemeChange,
  onOpenSettings,
  onSynchronize,
  isSynchronizing = false,
}) => (
  <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-header)] px-4 shadow-xs select-none">
    {onBackToHome && (
      <button
        type="button"
        onClick={onBackToHome}
        title="Voltar ao Hub Fiscal"
        aria-label="Voltar ao Hub Fiscal"
        className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:scale-95 transition cursor-pointer shrink-0"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
    )}

    <div className="flex min-w-44 items-center gap-2.5 shrink-0 select-none">
      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
        <Building2 className="h-4.5 w-4.5" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-bold tracking-tight text-[var(--text-primary)]">Buscador NF</div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {workspaceMode === 'NFSE' ? 'NFS-e · ADN / SEFIN' : 'NF-e e CT-e · SEFAZ'}
        </div>
      </div>
    </div>

    {onWorkspaceModeChange && (
      <NfseWorkspaceSelector
        mode={workspaceMode}
        onChange={onWorkspaceModeChange}
        disabled={isSynchronizing}
      />
    )}

    <div className="min-w-0 flex-1 border-l border-[var(--border-subtle)] pl-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Empresa ativa</div>
      <div className="truncate text-sm font-medium text-[var(--text-primary)]" title={activeCompany?.name || undefined}>
        {activeCompany?.name || 'Nenhuma empresa ativa'}
      </div>
    </div>

    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide shrink-0 ${
      environment === 'production'
        ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-500'
        : 'border-amber-500/35 bg-amber-500/10 text-amber-500'
    }`}>
      {environment === 'production'
        ? 'Produção'
        : (workspaceMode === 'NFSE' ? 'Produção Restrita' : 'Homologação')}
    </span>

    {/* Quick Theme Switcher Pill */}
    <div className="flex items-center p-0.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-inset)] shrink-0">
      <button
        type="button"
        onClick={() => (onThemeChange ? onThemeChange('light') : theme !== 'light' && onToggleTheme?.())}
        className={`p-1.5 rounded-md transition-all cursor-pointer ${
          theme === 'light'
            ? 'bg-white text-amber-500 shadow-xs'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
        title="Tema Claro"
        aria-label="Ativar tema claro"
      >
        <Sun className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => (onThemeChange ? onThemeChange('dark') : theme !== 'dark' && onToggleTheme?.())}
        className={`p-1.5 rounded-md transition-all cursor-pointer ${
          theme === 'dark'
            ? 'bg-[#27272a] text-blue-400 shadow-xs'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
        title="Tema Escuro"
        aria-label="Ativar tema escuro"
      >
        <Moon className="h-3.5 w-3.5" />
      </button>
    </div>

    <button
      type="button"
      onClick={onOpenSettings}
      title="Configurações do Sistema"
      aria-label="Configurações do Sistema"
      className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:scale-95 transition cursor-pointer shrink-0"
    >
      <Settings className="h-4 w-4" />
    </button>
  </header>
);
