import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Company, 
  FiscalDocument, 
  CertificateInfo, 
  CertificateHealthResult,
  AppSettings, 
  DocumentType,
  DownloadBatchResult
} from '@/core/buscador/domain/types';
import { AppShell } from './components/layout/AppShell';
import { AppHeader } from './components/layout/AppHeader';
import { CompanySidebar } from './components/layout/CompanySidebar';
import { DocumentWorkspace } from './components/documents/DocumentWorkspace';
import { NfseWorkspace } from './components/nfse/NfseWorkspace';
import { FooterDownloadBar } from './components/FooterDownloadBar';
import { BuscadorModals } from './components/BuscadorModals';
import { useSefazSync } from './hooks/useSefazSync';
import { useWorkspaceStore } from '@/web/stores/workspace.store';
import { normalizePageSize, PageSize } from '@/core/buscador/domain/page-size';
import { changePageSize } from './features/documents/page-size-controller';
import { useUiStore } from './stores/ui.store';
import { feedbackFromError } from './features/feedback/feedback-adapters';
import type { BuscadorWorkspaceMode } from './features/workspace/workspace-controller';
import { toast } from '@/web/components/Toast';
import { apiFetch } from '@/web/lib/api';

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface BuscadorAppProps {
  onBackToHome?: () => void;
  onNavigateNfView?: (folderId: string | null, folderName: string) => void;
}

export function BuscadorApp({ onBackToHome, onNavigateNfView }: BuscadorAppProps) {
  const { settings: wfSettings, updateSettings: updateWfSettings } = useWorkspaceStore();
  const theme = (wfSettings.theme || 'dark') as 'dark' | 'light';
  const toggleTheme = () => updateWfSettings({ theme: theme === 'dark' ? 'light' : 'dark' });
  const pushFeedback = useUiStore((state) => state.pushFeedback);
  const companyContextRequest = useRef(0);
  const documentSearchRequest = useRef(0);

  // Estados principais
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [companyCert, setCompanyCert] = useState<CertificateInfo | null>(null);
  const [certHealth, setCertHealth] = useState<CertificateHealthResult | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [nsuStatus, setNsuStatus] = useState<{
    nfeLastNSU: string;
    cteLastNSU: string;
    isRunning?: boolean;
    environment?: string;
    nfeStatus?: 'IDLE' | 'RUNNING' | 'RATE_LIMITED' | 'ERROR';
    nfeNextQueryAt?: string | null;
    cteStatus?: 'IDLE' | 'RUNNING' | 'RATE_LIMITED' | 'ERROR';
    cteNextQueryAt?: string | null;
  }>({
    nfeLastNSU: '000000000000000',
    cteLastNSU: '000000000000000',
  });
  const [workspaceMode, setWorkspaceMode] = useState<BuscadorWorkspaceMode>('SEFAZ');

  // Filtros locais
  const [selectedDocTypes, setSelectedDocTypes] = useState<{ nfe: boolean; cte: boolean }>({ nfe: true, cte: true });
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return formatLocalDate(d);
  });
  const [endDate, setEndDate] = useState(() => formatLocalDate(new Date()));
  const [searchQuery, setSearchQuery] = useState('');

  // Tabela e Paginação
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [selectedNfseDocIds, setSelectedNfseDocIds] = useState<number[]>([]);
  const [nfseDocuments, setNfseDocuments] = useState<FiscalDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Modais de Empresa, Certificado, Configurações e Detalhes
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [selectedDetailsDoc, setSelectedDetailsDoc] = useState<FiscalDocument | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  // Sincronização NFS-e
  const nfseSyncTriggerRef = useRef<(() => Promise<void>) | null>(null);
  const [isNfseSyncing, setIsNfseSyncing] = useState(false);

  // Estados para Envio ao NF View
  const [isSendToNfViewModalOpen, setIsSendToNfViewModalOpen] = useState(false);
  const [docsToSendToNfView, setDocsToSendToNfView] = useState<FiscalDocument[]>([]);
  const [isSendingToNfView, setIsSendingToNfView] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ total: number; processed: number; percent: number } | null>(null);
  const [sendTargetFolderName, setSendTargetFolderName] = useState<string>('Sem Pasta (Raiz / Geral)');
  const [sendJobId, setSendJobId] = useState<string | null>(null);
  const [isSendCancelled, setIsSendCancelled] = useState(false);
  const [isSendCancelling, setIsSendCancelling] = useState(false);
  const sendPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (sendPollIntervalRef.current) {
        clearInterval(sendPollIntervalRef.current);
        sendPollIntervalRef.current = null;
      }
    };
  }, []);

  // Carregamento inicial e sincronização reativa de empresas (IMP-012)
  useEffect(() => {
    loadInitialData();
    const handleCompaniesUpdated = () => {
      loadInitialData();
    };
    window.addEventListener('wsf:companies-updated', handleCompaniesUpdated);
    return () => {
      window.removeEventListener('wsf:companies-updated', handleCompaniesUpdated);
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const [allCompanies, active, curSettings] = await Promise.all([
        window.fiscalApi?.companies.list() || [],
        window.fiscalApi?.companies.getActive() || null,
        window.fiscalApi?.settings.get() || null,
      ]);

      setCompanies(allCompanies);
      setActiveCompany(active || allCompanies[0] || null);
      setSettings(curSettings);

      if (active || allCompanies[0]) {
        const target = active || allCompanies[0];
        loadCompanyContext(target, curSettings || undefined);
      }
    } catch (err: any) {
      pushFeedback(feedbackFromError('Falha ao iniciar o aplicativo', err, 'Falha ao inicializar dados locais.'));
    }
  };

  const loadCompanyContext = async (company: Company, settingsOverride?: AppSettings) => {
    const requestId = ++companyContextRequest.current;
    try {
      const [cert, status, health] = await Promise.all([
        window.fiscalApi?.certificates.getForCompany(company.id) || null,
        window.fiscalApi?.sefaz.getStatus(company.id) || { nfeLastNSU: '000000000000000', cteLastNSU: '000000000000000' },
        window.fiscalApi?.certificates?.checkHealth ? window.fiscalApi.certificates.checkHealth(company.id) : null,
      ]);
      if (requestId !== companyContextRequest.current) return;
      setCompanyCert(cert);
      setNsuStatus(status);
      setCertHealth(health);
      if (workspaceMode !== 'NFSE') {
        await searchLocalDocuments(company.id, 1, undefined, settingsOverride?.items_per_page);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSelectCompany = async (companyId: number) => {
    try {
      const selected = await window.fiscalApi?.companies.selectActive(companyId);
      if (selected) {
        setActiveCompany(selected);
        setSelectedDocIds([]);
        setSelectedNfseDocIds([]);
        loadCompanyContext(selected);
      }
    } catch (err: any) {
      pushFeedback(feedbackFromError('Falha ao selecionar empresa', err, 'Não foi possível selecionar a empresa.'));
    }
  };

  const searchLocalDocuments = useCallback(async (
    companyId?: number,
    page: number = 1,
    typeOverride?: { nfe: boolean; cte: boolean },
    pageSizeOverride?: number,
    modeOverride?: BuscadorWorkspaceMode
  ) => {
    const targetCompanyId = companyId || activeCompany?.id;
    if (!targetCompanyId) return;
    const currentMode = modeOverride || workspaceMode;
    if (currentMode === 'NFSE') return;
    const requestId = ++documentSearchRequest.current;

    setLoadingDocs(true);

    const docTypes: DocumentType[] = [];
    const effectiveTypes = typeOverride || selectedDocTypes;
    if (effectiveTypes.nfe) docTypes.push('NFE');
    if (effectiveTypes.cte) docTypes.push('CTE');

    const currentEnv = settings?.sefaz_environment || 'production';

    try {
      const result = await window.fiscalApi?.documents.search({
        company_id: targetCompanyId,
        document_types: docTypes.length > 0 ? docTypes : undefined,
        environment: currentEnv,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search_query: searchQuery || undefined,
        page,
        page_size: pageSizeOverride || settings?.items_per_page || 50,
      });

      if (result && requestId === documentSearchRequest.current) {
        setDocuments(result.items);
        setTotalDocs(result.total);
        setCurrentPage(result.page);
        setTotalPages(result.total_pages);
      }
    } catch (err: any) {
      if (requestId === documentSearchRequest.current) {
        pushFeedback(feedbackFromError('Falha ao buscar documentos', err, 'Falha ao buscar documentos locais.'));
      }
    } finally {
      if (requestId === documentSearchRequest.current) setLoadingDocs(false);
    }
  }, [activeCompany, workspaceMode, selectedDocTypes, startDate, endDate, searchQuery, settings]);

  const handleWorkspaceModeChange = (newMode: BuscadorWorkspaceMode) => {
    setWorkspaceMode(newMode);
    setSelectedDocIds([]);
    setSelectedNfseDocIds([]);
    setCurrentPage(1);
    if (activeCompany && newMode !== 'NFSE') {
      searchLocalDocuments(activeCompany.id, 1, undefined, undefined, newMode);
    }
  };

  // Hook de Sincronização e NSU SEFAZ
  const {
    isSefazModalOpen,
    sefazProgressMsg,
    sefazProgressNSU,
    sefazReceivedCount,
    activeConsultType,
    synchronizingType,
    pendingNsuReset,
    setPendingNsuReset,
    isResettingNsu,
    handleConsultSefaz,
    handleCancelSefaz,
    handleResetNSU,
    handleConfirmResetNSU,
  } = useSefazSync({
    activeCompany,
    companyCert,
    certHealth,
    nsuStatus,
    loadCompanyContext: (comp) => loadCompanyContext(comp),
    onOpenCertModal: () => setIsCertModalOpen(true),
  });

  const handleConfirmDeleteCompany = async () => {
    if (!companyToDelete) return;
    setIsDeletingCompany(true);
    try {
      await window.fiscalApi.companies.delete(companyToDelete.id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('wsf:companies-updated', {
            detail: { action: 'delete', companyId: companyToDelete.id },
          })
        );
      }
      pushFeedback({
        kind: 'success',
        title: 'Empresa removida',
        message: `Empresa "${companyToDelete.name}" foi excluída com sucesso.`,
      });
      setCompanyToDelete(null);
      await loadInitialData();
    } catch (err: any) {
      pushFeedback(feedbackFromError('Falha ao excluir empresa', err, 'Não foi possível excluir a empresa.'));
    } finally {
      setIsDeletingCompany(false);
    }
  };

  // Downloads Individuais
  const handleDownloadXml = async (docId: number) => {
    if (!activeCompany) return;
    try {
      const res = await window.fiscalApi?.documents.downloadXml({
        company_id: activeCompany.id,
        document_id: docId,
      });
      if (res?.success) {
        pushFeedback({ kind: 'success', title: 'XML exportado', message: `XML exportado com sucesso para: ${res.filePath}` });
      } else if (res?.error && res.error !== 'Operação cancelada.') {
        pushFeedback(feedbackFromError('Falha ao exportar XML', res.error, 'Não foi possível exportar o XML.'));
      }
    } catch (err: any) {
      pushFeedback(feedbackFromError('Falha ao exportar XML', err, 'Não foi possível exportar o XML.'));
    }
  };

  const handleDownloadPdf = async (docId: number) => {
    if (!activeCompany) return;
    try {
      const res = await window.fiscalApi?.documents.downloadPdf({
        company_id: activeCompany.id,
        document_id: docId,
      });
      if (res?.success) {
        pushFeedback({ kind: 'success', title: 'PDF exportado', message: `PDF exportado com sucesso para: ${res.filePath}` });
      } else if (res?.error && res.error !== 'Operação cancelada.') {
        pushFeedback(feedbackFromError('Falha ao exportar PDF', res.error, 'Não foi possível exportar o PDF.'));
      }
    } catch (err: any) {
      pushFeedback(feedbackFromError('Falha ao exportar PDF', err, 'Não foi possível exportar o PDF.'));
    }
  };

  const handleOpenFolder = async (filePath: string) => {
    if (!activeCompany) return;
    await window.fiscalApi?.documents.openFileFolder({
      company_id: activeCompany.id,
      file_path: filePath,
    });
  };

  // Envio de Notas para o NF View
  const handleTriggerSendSingle = (doc: FiscalDocument) => {
    if (doc.xml_status !== 'XML_DISPONIVEL' || !doc.xml_path) {
      toast.warning('XML Indisponível', 'Esta nota não possui XML baixado localmente para envio.');
      return;
    }
    setDocsToSendToNfView([doc]);
    setIsSendToNfViewModalOpen(true);
  };

  const handleTriggerSendBatch = () => {
    const isNfse = workspaceMode === 'NFSE';
    const currentList = isNfse ? nfseDocuments : documents;
    const currentSelectedIds = isNfse ? selectedNfseDocIds : selectedDocIds;
    const selectedDocs = currentList.filter((d) => currentSelectedIds.includes(d.id));

    if (selectedDocs.length === 0) {
      toast.info('Nenhuma nota selecionada', 'Selecione ao menos uma nota fiscal para enviar ao NF View.');
      return;
    }

    setDocsToSendToNfView(selectedDocs);
    setIsSendToNfViewModalOpen(true);
  };

  const handleConfirmSendToNfView = async (
    targetFolderId: string | null,
    targetFolderName: string,
    validDocs: FiscalDocument[]
  ) => {
    const filePaths = validDocs.map((d) => d.xml_path!).filter(Boolean);
    if (filePaths.length === 0) {
      toast.warning('Nenhum XML disponível', 'Nenhum documento selecionado possui arquivo XML baixado localmente.');
      return;
    }

    setIsSendToNfViewModalOpen(false);
    setIsSendingToNfView(true);
    setSendTargetFolderName(targetFolderName);
    setSendProgress({ total: filePaths.length, processed: 0, percent: 0 });
    setIsSendCancelled(false);
    setIsSendCancelling(false);

    try {
      const res = await apiFetch('/api/import/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePaths,
          batchId: targetFolderId || undefined,
        }),
      });

      if (!res.ok) {
        let errMsg = 'Falha ao iniciar envio ao NF View.';
        try {
          const errData = await res.json();
          if (errData?.error) errMsg = errData.error;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      const jobId = data.jobId;
      setSendJobId(jobId);

      if (sendPollIntervalRef.current) {
        clearInterval(sendPollIntervalRef.current);
      }

      const totalExpected = data.queued ?? filePaths.length;

      sendPollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await apiFetch(`/api/import/${jobId}`);
          if (!statusRes.ok) return;
          const statusData = await statusRes.json();
          const processed = statusData.processed ?? 0;
          const total = statusData.total ?? totalExpected;
          const isCancelled = statusData.status === 'cancelled' || statusData.status === 'CANCELLED';
          const isCompleted =
            !isCancelled &&
            (statusData.status === 'completed' ||
              statusData.status === 'COMPLETED' ||
              (total > 0 && processed >= total));
          const isFailed = statusData.status === 'error' || statusData.status === 'failed' || statusData.status === 'FAILED';

          const pct = isCompleted
            ? 100
            : total > 0
              ? Math.min(isCancelled ? 100 : 99, Math.round((processed / total) * 100))
              : 0;

          setSendProgress({
            total,
            processed: isCompleted ? total : processed,
            percent: pct,
          });

          if (isCancelled) {
            if (sendPollIntervalRef.current) {
              clearInterval(sendPollIntervalRef.current);
              sendPollIntervalRef.current = null;
            }
            setIsSendCancelled(true);
            return;
          }

          if (isCompleted || isFailed) {
            if (sendPollIntervalRef.current) {
              clearInterval(sendPollIntervalRef.current);
              sendPollIntervalRef.current = null;
            }

            // Limpa seleções no buscador
            setSelectedDocIds([]);
            setSelectedNfseDocIds([]);

            if (isCompleted) {
              const duplicates = statusData.duplicates || 0;
              const imported = total - duplicates;
              const desc = duplicates > 0
                ? `${imported} nota(s) importada(s) para "${targetFolderName}" (${duplicates} já existiam no NF View e foram ignoradas).`
                : `${total} nota(s) enviada(s) com sucesso para "${targetFolderName}".`;

              toast.success('Envio Concluído', desc, onNavigateNfView ? {
                label: 'Ver no NF View',
                onClick: () => onNavigateNfView(targetFolderId, targetFolderName),
              } : undefined);
            } else {
              toast.error('Falha no Envio', statusData.error || 'Ocorreu um erro ao processar os arquivos no NF View.');
            }

            setTimeout(() => {
              setIsSendingToNfView(false);
              setSendProgress(null);
              setSendJobId(null);
            }, 2000);
          }
        } catch (pollErr) {
          console.error('[SendPoll] Erro ao consultar status da importação:', pollErr);
        }
      }, 250);
    } catch (err: any) {
      console.error('[handleConfirmSendToNfView] Erro:', err);
      setIsSendingToNfView(false);
      setSendProgress(null);
      setSendJobId(null);
      toast.error('Erro no Envio', err.message || 'Falha ao enviar notas para o NF View.');
    }
  };

  const handleCancelSendImport = async () => {
    if (!sendJobId || isSendCancelled || isSendCancelling) return;
    setIsSendCancelling(true);
    try {
      if (sendPollIntervalRef.current) {
        clearInterval(sendPollIntervalRef.current);
        sendPollIntervalRef.current = null;
      }
      await apiFetch(`/api/import/${sendJobId}/cancel`, { method: 'POST' });
      setIsSendCancelled(true);
      toast.info('Cancelamento Solicitado', 'O envio ao NF View foi interrompido.');
    } catch (err: any) {
      console.error('[handleCancelSendImport] Erro ao cancelar:', err);
    } finally {
      setIsSendCancelling(false);
    }
  };

  const toggleSelectDoc = (id: number) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map(d => d.id));
    }
  };

  const handlePageSizeChange = async (size: PageSize) => {
    try {
      await changePageSize(
        size,
        async (value) => {
          const updated = await window.fiscalApi.settings.update(value);
          setSettings(updated);
          return updated;
        },
        async (selectedSize) => {
          setSelectedDocIds([]);
          await searchLocalDocuments(undefined, 1, undefined, selectedSize);
        },
      );
    } catch (err: any) {
      pushFeedback(feedbackFromError('Falha ao alterar paginação', err, 'Falha ao alterar itens por página.'));
    }
  };

  const activeFilter: 'ALL' | 'NFE' | 'CTE' | 'NFSE' =
    workspaceMode === 'NFSE'
      ? 'NFSE'
      : selectedDocTypes.nfe && !selectedDocTypes.cte
      ? 'NFE'
      : !selectedDocTypes.nfe && selectedDocTypes.cte
      ? 'CTE'
      : 'ALL';

  return (
    <AppShell
      header={(
        <AppHeader
          activeCompany={activeCompany}
          certHealth={certHealth}
          environment={workspaceMode === 'NFSE' ? (settings?.nfse_environment || 'production') : (settings?.sefaz_environment || 'production')}
          workspaceMode={workspaceMode}
          onWorkspaceModeChange={handleWorkspaceModeChange}
          theme={theme}
          onBackToHome={onBackToHome}
          onToggleTheme={toggleTheme}
          onThemeChange={(nextTheme) => updateWfSettings({ theme: nextTheme })}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onSynchronize={() => {
            if (workspaceMode === 'NFSE') {
              nfseSyncTriggerRef.current?.();
            } else {
              handleConsultSefaz();
            }
          }}
          isSynchronizing={workspaceMode === 'NFSE' ? isNfseSyncing : isSefazModalOpen}
        />
      )}
      sidebar={(
        <CompanySidebar
          companies={companies}
          activeCompany={activeCompany}
          companyCert={companyCert}
          certHealth={certHealth}
          activeFilter={activeFilter}
          onSelectCompany={handleSelectCompany}
          onNewCompany={() => {
            setEditingCompany(null);
            setIsCompanyModalOpen(true);
          }}
          onEditCompany={(comp) => {
            setEditingCompany(comp);
            setIsCompanyModalOpen(true);
          }}
          onDeleteCompany={(comp) => {
            setCompanyToDelete(comp);
          }}
          onFilterNFeOnly={(id) => {
            if (workspaceMode !== 'SEFAZ') setWorkspaceMode('SEFAZ');
            const types = { nfe: true, cte: false };
            setSelectedDocTypes(types);
            searchLocalDocuments(id, 1, types, undefined, 'SEFAZ');
          }}
          onFilterCTeOnly={(id) => {
            if (workspaceMode !== 'SEFAZ') setWorkspaceMode('SEFAZ');
            const types = { nfe: false, cte: true };
            setSelectedDocTypes(types);
            searchLocalDocuments(id, 1, types, undefined, 'SEFAZ');
          }}
          onFilterAllTypes={(id) => {
            if (workspaceMode !== 'SEFAZ') setWorkspaceMode('SEFAZ');
            const types = { nfe: true, cte: true };
            setSelectedDocTypes(types);
            searchLocalDocuments(id, 1, types, undefined, 'SEFAZ');
          }}
          onFilterNFSeOnly={(id) => {
            if (activeCompany?.id !== id) {
              handleSelectCompany(id);
            }
            if (workspaceMode !== 'NFSE') {
              handleWorkspaceModeChange('NFSE');
            }
          }}
          onOpenCertModal={() => setIsCertModalOpen(true)}
        />
      )}
      toolbar={null}
      content={workspaceMode === 'NFSE' ? (
        <NfseWorkspace
          company={activeCompany}
          environment={(settings?.nfse_environment || 'production')}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onDownloadXml={handleDownloadXml}
          onOpenFileFolder={handleOpenFolder}
          onSyncStateChange={setIsNfseSyncing}
          registerSyncTrigger={(fn) => { nfseSyncTriggerRef.current = fn; }}
          selectedDocIds={selectedNfseDocIds}
          onToggleSelectDoc={(id) => {
            setSelectedNfseDocIds((prev) =>
              prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
            );
          }}
          onToggleSelectAll={(allIds) => {
            setSelectedNfseDocIds((prev) =>
              prev.length === (allIds?.length ?? 0) ? [] : (allIds ?? [])
            );
          }}
          onDocumentsChange={setNfseDocuments}
          onSendToNfView={handleTriggerSendSingle}
        />
      ) : (
        <DocumentWorkspace
          nsuStatus={nsuStatus}
          certHealth={certHealth}
          onCooldownEnd={() => { if (activeCompany) loadCompanyContext(activeCompany); }}
          selectedDocTypes={selectedDocTypes}
          onToggleDocType={(type, checked) => setSelectedDocTypes(prev => ({ ...prev, [type]: checked }))}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchLocal={() => searchLocalDocuments()}
          onResetNSU={handleResetNSU}
          onSynchronize={handleConsultSefaz}
          onSynchronizeNfe={() => handleConsultSefaz('NFE')}
          onSynchronizeCte={() => handleConsultSefaz('CTE')}
          isSynchronizing={isSefazModalOpen}
          synchronizingType={synchronizingType}
          hasActiveCompany={Boolean(activeCompany)}
          documents={documents}
          totalDocs={totalDocs}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={normalizePageSize(settings?.items_per_page)}
          selectedDocIds={selectedDocIds}
          loadingDocs={loadingDocs}
          onToggleSelectAll={toggleSelectAll}
          onToggleSelectDoc={toggleSelectDoc}
          onViewDetails={(doc) => setSelectedDetailsDoc(doc)}
          onDownloadXml={handleDownloadXml}
          onDownloadPdf={handleDownloadPdf}
          onSendToNfView={handleTriggerSendSingle}
          onPageChange={(page) => searchLocalDocuments(undefined, page)}
          onPageSizeChange={(size) => void handlePageSizeChange(size)}
        />
      )}

      footer={(
        <FooterDownloadBar
          selectedCount={workspaceMode === 'NFSE' ? selectedNfseDocIds.length : selectedDocIds.length}
          totalOnPage={workspaceMode === 'NFSE' ? nfseDocuments.length : documents.length}
          defaultStoragePath={settings?.default_storage_path}
          onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
          onOpenSendModal={handleTriggerSendBatch}
        />
      )}
      overlays={(
        <BuscadorModals
          showSplash={showSplash}
          onFinishSplash={() => setShowSplash(false)}
          isCompanyModalOpen={isCompanyModalOpen}
          onCloseCompanyModal={() => setIsCompanyModalOpen(false)}
          editingCompany={editingCompany}
          onSaveCompany={async (data) => {
            if (editingCompany) {
              await window.fiscalApi.companies.update({ id: editingCompany.id, ...data });
            } else {
              await window.fiscalApi.companies.create(data);
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('wsf:companies-updated', {
                  detail: { action: editingCompany ? 'update' : 'create' },
                })
              );
            }
            loadInitialData();
          }}
          onTriggerDeleteCompany={(company) => {
            setIsCompanyModalOpen(false);
            setCompanyToDelete(company);
          }}
          isCertModalOpen={isCertModalOpen}
          onCloseCertModal={() => setIsCertModalOpen(false)}
          activeCompany={activeCompany}
          onCertAssociated={() => {
            if (activeCompany) loadCompanyContext(activeCompany);
          }}
          isSettingsModalOpen={isSettingsModalOpen}
          onCloseSettingsModal={() => {
            setIsSettingsModalOpen(false);
            loadInitialData();
          }}
          isDownloadModalOpen={isDownloadModalOpen}
          onCloseDownloadModal={() => setIsDownloadModalOpen(false)}
          workspaceMode={workspaceMode}
          selectedDocIds={selectedDocIds}
          selectedNfseDocIds={selectedNfseDocIds}
          settings={settings}
          onDownloadBatchSuccess={(res: DownloadBatchResult) => {
            pushFeedback({
              kind: 'success',
              title: 'Lote exportado',
              message: `Arquivo ZIP com ${res.copied_files_count} documento(s) gerado com sucesso em: ${res.zip_path}`,
            });
            if (workspaceMode === 'NFSE') {
              setSelectedNfseDocIds([]);
            } else {
              setSelectedDocIds([]);
            }
          }}
          isSefazModalOpen={isSefazModalOpen}
          activeConsultType={activeConsultType}
          sefazProgressNSU={sefazProgressNSU}
          sefazProgressMsg={sefazProgressMsg}
          sefazReceivedCount={sefazReceivedCount}
          onCancelSefaz={handleCancelSefaz}
          selectedDetailsDoc={selectedDetailsDoc}
          onCloseDetailsDoc={() => setSelectedDetailsDoc(null)}
          onDownloadXml={handleDownloadXml}
          onDownloadPdf={handleDownloadPdf}
          onOpenFolder={handleOpenFolder}
          pendingNsuReset={pendingNsuReset}
          isResettingNsu={isResettingNsu}
          onConfirmResetNSU={() => void handleConfirmResetNSU()}
          onCancelResetNSU={() => {
            if (!isResettingNsu) setPendingNsuReset(null);
          }}
          companyToDelete={companyToDelete}
          isDeletingCompany={isDeletingCompany}
          onConfirmDeleteCompany={() => void handleConfirmDeleteCompany()}
          onCancelDeleteCompany={() => {
            if (!isDeletingCompany) setCompanyToDelete(null);
          }}
          isSendToNfViewModalOpen={isSendToNfViewModalOpen}
          onCloseSendToNfViewModal={() => setIsSendToNfViewModalOpen(false)}
          docsToSendToNfView={docsToSendToNfView}
          onConfirmSendToNfView={handleConfirmSendToNfView}
          isSendingToNfView={isSendingToNfView}
          sendProgress={sendProgress}
          sendTargetFolderName={sendTargetFolderName}
          isSendCancelled={isSendCancelled}
          isSendCancelling={isSendCancelling}
          onCancelSendImport={handleCancelSendImport}
          onCloseSendProgress={() => {
            setIsSendingToNfView(false);
            setSendProgress(null);
          }}
        />
      )}
    />
  );
}

export default BuscadorApp;
