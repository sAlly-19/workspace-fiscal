import React from 'react';
import { Download, Send } from 'lucide-react';

export interface FooterDownloadBarProps {
  selectedCount: number;
  totalOnPage: number;
  defaultStoragePath?: string;
  onOpenDownloadModal: () => void;
  onOpenSendModal?: () => void;
}

export const FooterDownloadBar: React.FC<FooterDownloadBarProps> = ({
  selectedCount,
  totalOnPage,
  defaultStoragePath,
  onOpenDownloadModal,
  onOpenSendModal,
}) => (
  <footer
    data-testid="workspace-footer"
    className="flex h-14 shrink-0 items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-header)] px-5 text-xs select-none"
  >
    <div className="flex min-w-0 items-center gap-2 pr-4 text-[var(--text-secondary)]">
      <span>
        <strong className="font-semibold text-[var(--text-primary)]">{selectedCount}</strong> de {totalOnPage} selecionado(s)
      </span>
      {defaultStoragePath && (
        <>
          <span className="text-[var(--text-muted)]">·</span>
          <span className="truncate text-[var(--text-muted)]" title={defaultStoragePath}>
            Destino padrão: <span className="font-mono text-[11px] text-[var(--text-secondary)]">{defaultStoragePath}</span>
          </span>
        </>
      )}
    </div>

    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={selectedCount === 0}
        onClick={onOpenSendModal}
        className="flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] shadow-xs transition hover:bg-[var(--surface-hover)] hover:border-blue-500/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        title={selectedCount === 0 ? 'Selecione notas para enviar ao NF View' : 'Enviar notas selecionadas para o NF View'}
      >
        <Send className="h-4 w-4 text-blue-500" />
        <span>Enviar para NF View</span>
      </button>

      <button
        type="button"
        disabled={selectedCount === 0}
        onClick={onOpenDownloadModal}
        className="flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
      >
        <Download className="h-4 w-4" />
        <span>Baixar selecionados</span>
      </button>
    </div>
  </footer>
);
