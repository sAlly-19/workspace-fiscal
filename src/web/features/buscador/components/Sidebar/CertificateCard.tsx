import React from 'react';
import { KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import { CertificateInfo, CertificateHealthResult, Company } from '@/core/buscador/domain/types';

export interface CertificateCardProps {
  activeCompany: Company | null;
  companyCert: CertificateInfo | null;
  certHealth?: CertificateHealthResult | null;
  onOpenCertModal: () => void;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  activeCompany,
  companyCert,
  certHealth,
  onOpenCertModal,
}) => {
  const isValid = companyCert && !companyCert.is_expired;
  const isLiveReady = certHealth?.status === 'READY';
  const isNotFoundInStore = certHealth?.status === 'NOT_FOUND_IN_STORE';

  return (
    <div className="m-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 text-xs shadow-xs">
      <div className="mb-2 flex items-center gap-2 font-bold text-[var(--text-primary)]">
        <KeyRound className="h-4 w-4 text-[var(--primary)]" />
        <span>Certificado digital</span>
      </div>

      {!activeCompany ? (
        <p className="text-[var(--text-muted)]">Selecione uma empresa.</p>
      ) : companyCert ? (
        <div className="space-y-1">
          <p
            className={`flex items-center gap-1 font-semibold ${
              isNotFoundInStore
                ? 'text-amber-500'
                : isLiveReady || (isValid && !certHealth)
                ? 'text-[var(--success)]'
                : 'text-[var(--danger)]'
            }`}
          >
            {isNotFoundInStore ? (
              <ShieldAlert className="h-4 w-4 text-amber-500" />
            ) : isLiveReady || (isValid && !certHealth) ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            <span>
              {isNotFoundInStore
                ? 'Não Detectado no Windows'
                : isLiveReady
                ? 'Conectado e Válido'
                : isValid
                ? 'Válido'
                : 'Expirado'}
            </span>
          </p>
          <p
            className="truncate font-mono text-[11px] text-[var(--text-secondary)]"
            title={companyCert.subject}
          >
            {companyCert.subject}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Validade: {new Date(companyCert.valid_to).toLocaleDateString('pt-BR')}
          </p>
          {isNotFoundInStore && (
            <p className="rounded bg-amber-500/10 border border-amber-500/20 p-1 text-[10px] text-amber-500 leading-tight">
              Conecte o Token / Smartcard na máquina para sincronizar.
            </p>
          )}
        </div>
      ) : (
        <p className="text-[var(--warning)]">Nenhum certificado associado.</p>
      )}

      <button
        type="button"
        disabled={!activeCompany}
        onClick={onOpenCertModal}
        className="mt-3 w-full rounded border border-[var(--border-default)] bg-[var(--surface-panel)] py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {companyCert ? 'Alterar certificado' : 'Associar certificado'}
      </button>
    </div>
  );
};
