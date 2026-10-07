import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Company, FiscalDocument } from '@/core/buscador/domain/types';
import type { NfseEnvironment } from '@/core/buscador/nfse/domain/types';
import { NfseViewModel, type NfseViewModelApi } from '../../features/nfse/nfse-view-model';
import { NfseStatusCard } from './NfseStatusCard';
import { NfseDirectQuery } from './NfseDirectQuery';
import { NfseFilters } from './NfseFilters';
import { NfseDetailsModal } from './NfseDetailsModal';
import { DocumentTable } from '../DocumentTable/DocumentTable';
import { useUiStore } from '../../stores/ui.store';
import { normalizePageSize, type PageSize } from '@/core/buscador/domain/page-size';

export interface NfseWorkspaceProps {
  company: Company | null;
  environment: NfseEnvironment;
  onOpenSettings: () => void;
  onDownloadXml: (id: number) => void;
  onOpenFileFolder: (filePath: string) => void;
  onSyncStateChange?: (syncing: boolean) => void;
  registerSyncTrigger?: (trigger: () => Promise<void>) => void;
  selectedDocIds?: number[];
  onToggleSelectDoc?: (id: number) => void;
  onToggleSelectAll?: (allDocIds?: number[]) => void;
  onDocumentsChange?: (docs: FiscalDocument[]) => void;
}

export const NfseWorkspace: React.FC<NfseWorkspaceProps> = ({
  company,
  environment,
  onDownloadXml,
  onOpenFileFolder,
  onSyncStateChange,
  registerSyncTrigger,
  selectedDocIds: propSelectedDocIds,
  onToggleSelectDoc: propOnToggleSelectDoc,
  onToggleSelectAll: propOnToggleSelectAll,
  onDocumentsChange,
}) => {
  const pushFeedback = useUiStore((state) => state.pushFeedback);
  const [internalSelectedDocIds, setInternalSelectedDocIds] = useState<number[]>([]);
  const selectedDocIds = propSelectedDocIds ?? internalSelectedDocIds;
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const api: NfseViewModelApi = useMemo(() => ({
    searchDocuments: (filters) => window.fiscalApi.documents.search(filters),
    getStatus: (cid, env) => window.fiscalApi.nfse.getStatus(cid, env),
    sync: (cid, env) => window.fiscalApi.nfse.sync(cid, env),
    cancelSync: (cid, env) => window.fiscalApi.nfse.cancelSync(cid, env),
    resetNsu: (cid, env) => window.fiscalApi.nfse.resetNSU(cid, env),
    consultByKey: (cid, key, env) => window.fiscalApi.nfse.consultByKey(cid, key, env),
    getEvents: (cid, key, env) => window.fiscalApi.nfse.getEvents(cid, key, env),
  }), []);

  const vm = useMemo(() => new NfseViewModel(api, company?.id ?? null, environment), [api, company?.id, environment]);
  const [state, setState] = useState(vm.getState());

  useEffect(() => {
    const unsubscribe = vm.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, [vm]);

  useEffect(() => {
    vm.setCompany(company?.id ?? null);
    vm.setEnvironment(environment);
    if (company?.id) {
      vm.loadStatus();
      vm.loadDocuments();
    }
  }, [company?.id, environment, vm]);

  const handleSync = useCallback(async () => {
    const res = await vm.startSync();
    if (res.success) {
      pushFeedback({
        kind: 'success',
        title: 'Sincronização NFS-e concluída',
        message: `${res.documentsCount} documento(s) e ${res.eventsCount} evento(s) recebidos.`,
      });
    } else if (res.error) {
      pushFeedback({
        kind: res.error.includes('OpenAPI') || res.error.includes('wire contract') ? 'warning' : 'error',
        title: 'Resultado da sincronização NFS-e',
        message: res.error,
      });
    }
  }, [vm, pushFeedback]);

  useEffect(() => {
    onSyncStateChange?.(state.syncing || state.status.isRunning);
  }, [state.syncing, state.status.isRunning, onSyncStateChange]);

  useEffect(() => {
    registerSyncTrigger?.(handleSync);
  }, [registerSyncTrigger, handleSync]);

  const handleResetNsu = async () => {
    const confirmed = window.confirm(
      'Tem certeza de que deseja resetar o cursor NSU da NFS-e para zero? Isso fará com que a próxima sincronização consulte os documentos desde o início.'
    );
    if (!confirmed) return;

    const ok = await vm.resetNsu();
    if (ok) {
      pushFeedback({
        kind: 'info',
        title: 'Cursor NSU reiniciado',
        message: 'O cursor NSU da NFS-e foi redefinido para zero.',
      });
    }
  };

  const handleQueryByKey = async (accessKey: string) => {
    const res = await vm.queryByKey(accessKey);
    if (res.success) {
      pushFeedback({
        kind: 'success',
        title: 'NFS-e consultada com sucesso',
        message: `Documento nº ${res.document?.document_number || ''} localizado e armazenado.`,
      });
    } else if (res.error) {
      pushFeedback({
        kind: res.error.includes('OpenAPI') || res.error.includes('wire contract') ? 'warning' : 'error',
        title: 'Falha na consulta direta da NFS-e',
        message: res.error,
      });
    }
  };

  useEffect(() => {
    onDocumentsChange?.(state.documents);
  }, [state.documents, onDocumentsChange]);

  const handleToggleSelectDoc = useCallback((id: number) => {
    if (propOnToggleSelectDoc) {
      propOnToggleSelectDoc(id);
    } else {
      setInternalSelectedDocIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    }
  }, [propOnToggleSelectDoc]);

  const handleToggleSelectAll = useCallback(() => {
    if (propOnToggleSelectAll) {
      propOnToggleSelectAll(state.documents.map((d) => d.id));
    } else {
      setInternalSelectedDocIds((prev) =>
        prev.length === state.documents.length ? [] : state.documents.map((d) => d.id)
      );
    }
  }, [propOnToggleSelectAll, state.documents]);

  const handleViewDetails = async (doc: FiscalDocument) => {
    await vm.selectDocumentForDetails(doc);
    setIsDetailsOpen(true);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--surface-workspace)] select-none">
      {/* Top Controls: Status Card + Direct Query + Filters */}
      <div className="shrink-0 space-y-3 border-b border-[var(--border-subtle)] bg-[var(--surface-header)] p-4 shadow-xs">
        <NfseStatusCard
          environment={environment}
          lastNsu={state.status.lastNsu}
          maxNsu={state.status.maxNsu}
          isRunning={state.status.isRunning}
          syncing={state.syncing}
          contractGateError={state.contractGateError}
          onSync={handleSync}
          onResetNsu={handleResetNsu}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <NfseDirectQuery onQueryByKey={handleQueryByKey} loading={state.loading} />
          <NfseFilters
            filters={state.filters}
            onChange={(f) => vm.setFilters(f)}
            onSearch={() => vm.loadDocuments()}
            onClear={() => {
              vm.setFilters({ startDate: undefined, endDate: undefined, searchQuery: undefined });
              vm.loadDocuments();
            }}
            loading={state.loading}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DocumentTable
          documents={state.documents}
          totalDocs={state.pagination.total}
          currentPage={state.pagination.page}
          totalPages={state.pagination.totalPages}
          pageSize={normalizePageSize(state.pagination.pageSize) as PageSize}
          selectedDocIds={selectedDocIds}
          loadingDocs={state.loading}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleSelectDoc={handleToggleSelectDoc}
          onViewDetails={handleViewDetails}
          onDownloadXml={onDownloadXml}
          onDownloadPdf={() => {
            pushFeedback({
              kind: 'info',
              title: 'PDF Indisponível',
              message: 'O formato PDF/DANFSE não está disponível para NFS-e Nacional nesta etapa.',
            });
          }}
          onPageChange={(p) => {
            vm.setPage(p);
            vm.loadDocuments();
          }}
          onPageSizeChange={(s) => {
            vm.setPageSize(s);
            vm.loadDocuments();
          }}
        />
      </div>

      {/* Details Modal */}
      <NfseDetailsModal
        document={state.selectedDocument ?? null}
        events={state.selectedDocumentEvents}
        eventsLoading={state.eventsLoading}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onDownloadXml={onDownloadXml}
        onOpenFileFolder={onOpenFileFolder}
      />
    </div>
  );
};
