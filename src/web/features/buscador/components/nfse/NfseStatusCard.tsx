import React from 'react';
import { RefreshCw, RotateCcw, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import type { NfseEnvironment } from '@/core/buscador/nfse/domain/types';

export interface NfseStatusCardProps {
  environment: NfseEnvironment;
  lastNsu: string;
  maxNsu: string;
  isRunning: boolean;
  syncing: boolean;
  contractGateError?: string | null;
  onSync: () => void;
  onResetNsu: () => void;
}

export const NfseStatusCard: React.FC<NfseStatusCardProps> = ({
  environment,
  lastNsu,
  maxNsu,
  isRunning,
  syncing,
  contractGateError,
  onSync,
  onResetNsu,
}) => {
  const isProd = environment === 'production';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-sm select-none">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${
                isProd
                  ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-500'
                  : 'border-amber-500/35 bg-amber-500/10 text-amber-500'
              }`}
            >
              {isProd ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {isProd ? 'Produção Oficial' : 'Produção Restrita (Testes)'}
            </span>
          </div>

          <div className="flex items-center gap-3 border-l border-[var(--border-subtle)] pl-4 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Último NSU</span>
              <div className="font-mono font-bold text-[var(--text-primary)]">{lastNsu || '0'}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">NSU Máximo</span>
              <div className="font-mono font-bold text-[var(--text-primary)]">{maxNsu || '0'}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetNsu}
            disabled={syncing || isRunning}
            title="Resetar cursor NSU da NFS-e para zero"
            aria-label="Resetar cursor NSU"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40 transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Resetar NSU</span>
          </button>

          <button
            type="button"
            onClick={onSync}
            disabled={syncing || isRunning}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing || isRunning ? 'animate-spin' : ''}`} />
            <span>{syncing || isRunning ? 'Sincronizando...' : 'Sincronizar NFS-e'}</span>
          </button>
        </div>
      </div>

      {contractGateError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-300">Integração NFS-e Nacional protegida (Gate de contrato)</div>
            <p className="text-[11px] leading-relaxed text-amber-200/90">{contractGateError}</p>
          </div>
        </div>
      )}
    </div>
  );
};

