import React from 'react';
import type { BuscadorWorkspaceMode } from '../features/workspace/workspace-controller';

export interface NfseWorkspaceSelectorProps {
  mode: BuscadorWorkspaceMode;
  onChange: (mode: BuscadorWorkspaceMode) => void;
  disabled?: boolean;
}

export const NfseWorkspaceSelector: React.FC<NfseWorkspaceSelectorProps> = ({
  mode,
  onChange,
  disabled = false,
}) => {
  return (
    <div
      role="tablist"
      aria-label="Seletor de Workspace Fiscal"
      className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-0.5 text-xs font-semibold shadow-inner"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'SEFAZ'}
        disabled={disabled}
        onClick={() => onChange('SEFAZ')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition-all cursor-pointer ${
          mode === 'SEFAZ'
            ? 'bg-purple-600 text-white shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span>SEFAZ · NF-e / CT-e</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={mode === 'NFSE'}
        disabled={disabled}
        onClick={() => onChange('NFSE')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition-all cursor-pointer ${
          mode === 'NFSE'
            ? 'bg-purple-600 text-white shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span>NFS-e Nacional</span>
      </button>
    </div>
  );
};

