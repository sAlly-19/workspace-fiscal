import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Company, 
  FiscalDocument, 
  CertificateInfo, 
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

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface BuscadorAppProps {
  onBackToHome?: () => void;
}

export function BuscadorApp({ onBackToHome }: BuscadorAppProps) {
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
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [nsuStatus, setNsuStatus] = useState<{ nfeLastNSU: string; cteLastNSU: string }>({
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

  // Carregamento inicial
  useEffect(() => {
    loadInitialData();
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
      const [cert, status] = await Promise.all([
        window.fiscalApi?.certificates.getForCompany(company.id) || null,
        window.fiscalApi?.sefaz.getStatus(company.id) || { nfeLastNSU: '000000000000000', cteLastNSU: '000000000000000' },
      ]);
      if (requestId !== companyContextRequest.current) return;
      setCompanyCert(cert);
      setNsuStatus(status);
      await searchLocalDocuments(company.id, 1, undefined, settingsOverride?.items_per_page);
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
    const requestId = ++documentSearchRequest.current;

    setLoadingDocs(true);

    const docTypes: DocumentType[] = [];
    if (currentMode === 'NFSE') {
      docTypes.push('NFSE');
    } else {
      const effectiveTypes = typeOverride || selectedDocTypes;
      if (effectiveTypes.nfe) docTypes.push('NFE');
      if (effectiveTypes.cte) docTypes.push('CTE');
    }

    const currentEnv = currentMode === 'NFSE'
      ? (settings?.nfse_environment || 'homologation')
      : (settings?.sefaz_environment || 'homologation');

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
    if (activeCompany) {
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
    loadCompanyContext: (comp) => loadCompanyContext(comp),
    onOpenCertModal: () => setIsCertModalOpen(true),
  });

  const handleConfirmDeleteCompany = async () => {
    if (!companyToDelete) return;
    setIsDeletingCompany(true);
    try {
      await window.fiscalApi.companies.delete(companyToDelete.id);
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
          environment={workspaceMode === 'NFSE' ? (settings?.nfse_environment || 'homologation') : (settings?.sefaz_environment || 'homologation')}
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
          environment={(settings?.nfse_environment || 'homologation')}
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
        />
      ) : (
        <DocumentWorkspace
          nsuStatus={nsuStatus}
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
        />
      )}
    />
  );
}

export default BuscadorApp;
