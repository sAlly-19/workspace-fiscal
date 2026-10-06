import React from 'react';
import { X, FileText, FolderOpen, Copy, Check, Calendar, DollarSign, Building, AlertCircle } from 'lucide-react';
import type { FiscalDocument } from '@/core/buscador/domain/types';
import type { NfseEvent } from '@/core/buscador/nfse/domain/types';

export interface NfseDetailsModalProps {
  document: FiscalDocument | null;
  events: NfseEvent[];
  eventsLoading?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onDownloadXml: (id: number) => void;
  onOpenFileFolder: (filePath: string) => void;
}

export const NfseDetailsModal: React.FC<NfseDetailsModalProps> = ({
  document: doc,
  events,
  eventsLoading = false,
  isOpen,
  onClose,
  onDownloadXml,
  onOpenFileFolder,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !doc) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(doc.access_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedValue = Number(doc.total_value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const formattedDate = doc.issue_date
    ? new Date(doc.issue_date).toLocaleString('pt-BR')
    : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-modal)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-600/20 text-purple-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  NFS-e Nacional nº {doc.document_number || '—'}
                </h2>
                <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-purple-400">
                  Série {doc.series || '—'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Origem: {doc.origin || 'NFS-e Nacional'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6 text-xs">
          {/* Chave de Acesso de 50 dígitos */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-workspace)] p-3.5">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Chave de Acesso (50 dígitos)
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs break-all font-semibold text-[var(--text-primary)]">
                {doc.access_key}
              </span>
              <button
                type="button"
                onClick={handleCopyKey}
                className="inline-flex items-center gap-1 shrink-0 rounded-md border border-[var(--border-default)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copiada' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Dados Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prestador */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-workspace)] p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <Building className="h-3.5 w-3.5" />
                <span>Prestador de Serviços</span>
              </div>
              <div className="font-semibold text-sm text-[var(--text-primary)]">
                {doc.issuer_name || '—'}
              </div>
              <div className="font-mono text-xs text-[var(--text-muted)]">
                CNPJ: {doc.issuer_cnpj || '—'}
              </div>
            </div>

            {/* Tomador */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-workspace)] p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <Building className="h-3.5 w-3.5" />
                <span>Tomador de Serviços</span>
              </div>
              <div className="font-semibold text-sm text-[var(--text-primary)]">
                {doc.recipient_name || '—'}
              </div>
              <div className="font-mono text-xs text-[var(--text-muted)]">
                CNPJ: {doc.recipient_cnpj || '—'}
              </div>
            </div>
          </div>

          {/* Valores, Datas e Situação */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-workspace)] p-3">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <Calendar className="h-3 w-3" />
                <span>Emissão</span>
              </div>
              <div className="mt-1 font-semibold text-[var(--text-primary)]">{formattedDate}</div>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-workspace)] p-3">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <DollarSign className="h-3 w-3" />
                <span>Valor Total</span>
              </div>
              <div className="mt-1 font-mono font-bold text-sm text-emerald-400">{formattedValue}</div>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-workspace)] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Situação Fiscal
              </div>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    doc.situacao_fiscal === 'CANCELADA'
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  {doc.situacao_fiscal || 'AUTORIZADA'}
                </span>
              </div>
            </div>
          </div>

          {/* Avisos de Armazenamento e PDF */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-workspace)] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Arquivo XML:</span>
              <span
                className={`font-semibold ${
                  doc.xml_status === 'XML_DISPONIVEL' ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {doc.xml_status === 'XML_DISPONIVEL' ? 'Disponível no disco' : 'Indisponível'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Documento Auxiliar (PDF / DANFSE):</span>
              <span className="italic text-[var(--text-muted)]">
                PDF indisponível nesta etapa (integração sem DANFSE)
              </span>
            </div>
          </div>

          {/* Timeline de Eventos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Eventos Vinculados ({events.length})
              </h3>
              {eventsLoading && <span className="text-[10px] text-[var(--text-muted)]">Carregando eventos...</span>}
            </div>

            {events.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-center text-[var(--text-muted)]">
                <AlertCircle className="mx-auto mb-1 h-5 w-5 text-[var(--border-strong)]" />
                <span>Nenhum evento registrado para esta NFS-e.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-workspace)] p-2.5 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        {ev.event_type} {ev.event_sequence ? `(Seq. ${ev.event_sequence})` : ''}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        Data: {ev.event_date ? new Date(ev.event_date).toLocaleString('pt-BR') : '—'}
                      </div>
                    </div>
                    <span className="rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] text-purple-400">
                      {ev.schema_type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex shrink-0 items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-panel)] px-6 py-3.5">
          <div className="text-[11px] text-[var(--text-muted)]">
            Ambiente: {doc.environment === 'production' ? 'Produção' : 'Produção Restrita'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenFileFolder(doc.xml_path || '')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition cursor-pointer"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              <span>Abrir Pasta</span>
            </button>

            <button
              type="button"
              onClick={() => onDownloadXml(doc.id)}
              disabled={doc.xml_status !== 'XML_DISPONIVEL'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 disabled:opacity-40 transition cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Baixar XML</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
