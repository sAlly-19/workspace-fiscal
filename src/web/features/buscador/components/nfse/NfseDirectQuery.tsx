import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

export interface NfseDirectQueryProps {
  onQueryByKey: (accessKey: string) => Promise<void>;
  loading?: boolean;
}

export const NfseDirectQuery: React.FC<NfseDirectQueryProps> = ({
  onQueryByKey,
  loading = false,
}) => {
  const [accessKey, setAccessKey] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const cleanKey = accessKey.replace(/\D/g, '');
  const isValid = cleanKey.length === 50;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setLocalError('A chave de acesso da NFS-e Nacional deve conter exatamente 50 dígitos numéricos.');
      return;
    }
    setLocalError(null);
    try {
      await onQueryByKey(cleanKey);
      setAccessKey('');
    } catch (err: any) {
      setLocalError(err?.message || 'Falha na consulta direta.');
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-sm select-none">
      <div className="mb-2 text-xs font-semibold text-[var(--text-primary)]">
        Consulta Direta por Chave (SEFIN)
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-72">
          <input
            type="text"
            value={accessKey}
            onChange={(e) => {
              setAccessKey(e.target.value);
              if (localError) setLocalError(null);
            }}
            placeholder="Digite a chave de acesso da NFS-e (50 dígitos)..."
            maxLength={60}
            disabled={loading}
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-workspace)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
          />
          {cleanKey.length > 0 && (
            <span
              className={`absolute right-3 top-2.5 font-mono text-[10px] ${
                isValid ? 'text-emerald-500 font-bold' : 'text-[var(--text-muted)]'
              }`}
            >
              {cleanKey.length}/50
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !isValid}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40 transition cursor-pointer"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          <span>{loading ? 'Consultando...' : 'Consultar por Chave'}</span>
        </button>
      </form>

      {localError && (
        <div className="mt-2 text-[11px] text-rose-500 font-medium">
          {localError}
        </div>
      )}
    </div>
  );
};

