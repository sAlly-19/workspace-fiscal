import type { Company, FiscalDocument, AppSettings, DownloadBatchResult } from '@/core/buscador/domain/types';
import type { BuscadorWorkspaceMode } from '../features/workspace/workspace-controller';
import { BuscadorSplashScreen } from '../BuscadorSplashScreen';
import { CompanyModal } from './CompanyModal';
import { CertificateModal } from './CertificateModal';
import { SettingsModal } from '@/web/components/SettingsModal';
import { DownloadModal } from './DownloadModal';
import { SefazProgressModal } from './SefazProgressModal';
import { DocumentDetailsModal } from './DocumentDetailsModal';
import { ConfirmDialog } from './feedback/ConfirmDialog';
import { FeedbackModalHost } from './feedback/FeedbackModalHost';

export interface BuscadorModalsProps {
  showSplash: boolean;
  onFinishSplash: () => void;
  // Company Modal
  isCompanyModalOpen: boolean;
  onCloseCompanyModal: () => void;
  editingCompany: Company | null;
  onSaveCompany: (data: any) => Promise<void>;
  onTriggerDeleteCompany: (company: Company) => void;
  // Certificate Modal
  isCertModalOpen: boolean;
  onCloseCertModal: () => void;
  activeCompany: Company | null;
  onCertAssociated: () => void;
  // Settings Modal
  isSettingsModalOpen: boolean;
  onCloseSettingsModal: () => void;
  // Download Modal
  isDownloadModalOpen: boolean;
  onCloseDownloadModal: () => void;
  workspaceMode: BuscadorWorkspaceMode;
  selectedDocIds: number[];
  selectedNfseDocIds: number[];
  settings: AppSettings | null;
  onDownloadBatchSuccess: (res: DownloadBatchResult) => void;
  // SEFAZ Progress Modal
  isSefazModalOpen: boolean;
  activeConsultType: 'NF-e' | 'CT-e';
  sefazProgressNSU: string;
  sefazProgressMsg: string;
  sefazReceivedCount: number | undefined;
  onCancelSefaz: () => void;
  // Document Details Modal
  selectedDetailsDoc: FiscalDocument | null;
  onCloseDetailsDoc: () => void;
  onDownloadXml: (docId: number) => void;
  onDownloadPdf: (docId: number) => void;
  onOpenFolder: (filePath: string) => void;
  // NSU Reset Dialog
  pendingNsuReset: 'NFE' | 'CTE' | null;
  isResettingNsu: boolean;
  onConfirmResetNSU: () => void;
  onCancelResetNSU: () => void;
  // Delete Company Dialog
  companyToDelete: Company | null;
  isDeletingCompany: boolean;
  onConfirmDeleteCompany: () => void;
  onCancelDeleteCompany: () => void;
}

export function BuscadorModals({
  showSplash,
  onFinishSplash,
  isCompanyModalOpen,
  onCloseCompanyModal,
  editingCompany,
  onSaveCompany,
  onTriggerDeleteCompany,
  isCertModalOpen,
  onCloseCertModal,
  activeCompany,
  onCertAssociated,
  isSettingsModalOpen,
  onCloseSettingsModal,
  isDownloadModalOpen,
  onCloseDownloadModal,
  workspaceMode,
  selectedDocIds,
  selectedNfseDocIds,
  settings,
  onDownloadBatchSuccess,
  isSefazModalOpen,
  activeConsultType,
  sefazProgressNSU,
  sefazProgressMsg,
  sefazReceivedCount,
  onCancelSefaz,
  selectedDetailsDoc,
  onCloseDetailsDoc,
  onDownloadXml,
  onDownloadPdf,
  onOpenFolder,
  pendingNsuReset,
  isResettingNsu,
  onConfirmResetNSU,
  onCancelResetNSU,
  companyToDelete,
  isDeletingCompany,
  onConfirmDeleteCompany,
  onCancelDeleteCompany,
}: BuscadorModalsProps) {
  return (
    <>
      {showSplash && <BuscadorSplashScreen onFinish={onFinishSplash} />}

      {/* MODAIS DA APLICAÇÃO */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={onCloseCompanyModal}
        editingCompany={editingCompany}
        onSave={onSaveCompany}
        onDelete={onTriggerDeleteCompany}
      />

      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={onCloseCertModal}
        company={activeCompany}
        onAssociated={onCertAssociated}
      />

      <SettingsModal
        open={isSettingsModalOpen}
        onClose={onCloseSettingsModal}
        initialTab="buscador"
      />

      {activeCompany && (
        <DownloadModal
          isOpen={isDownloadModalOpen}
          onClose={onCloseDownloadModal}
          companyId={activeCompany.id}
          selectedCount={workspaceMode === 'NFSE' ? selectedNfseDocIds.length : selectedDocIds.length}
          selectedDocIds={workspaceMode === 'NFSE' ? selectedNfseDocIds : selectedDocIds}
          defaultFolder={settings?.default_storage_path}
          isNfse={workspaceMode === 'NFSE'}
          onSuccess={onDownloadBatchSuccess}
        />
      )}

      <SefazProgressModal
        isOpen={isSefazModalOpen}
        companyName={activeCompany?.name || ''}
        docType={`NF-e e CT-e · etapa ${activeConsultType}`}
        currentNSU={sefazProgressNSU}
        message={sefazProgressMsg}
        receivedCount={sefazReceivedCount}
        onCancel={onCancelSefaz}
      />

      <DocumentDetailsModal
        isOpen={Boolean(selectedDetailsDoc)}
        onClose={onCloseDetailsDoc}
        document={selectedDetailsDoc}
        onDownloadXml={onDownloadXml}
        onDownloadPdf={onDownloadPdf}
        onOpenFolder={onOpenFolder}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingNsuReset)}
        title={`Resetar NSU de ${pendingNsuReset === 'CTE' ? 'CT-e' : 'NF-e'}`}
        description={`Deseja resetar o contador de NSU de ${pendingNsuReset === 'CTE' ? 'CT-e' : 'NF-e'} para 000000000000000? Os documentos já salvos localmente serão preservados e a próxima consulta à SEFAZ buscará todo o histórico disponível desde o início.`}
        confirmLabel="Resetar NSU"
        variant="danger"
        isBusy={isResettingNsu}
        onConfirm={onConfirmResetNSU}
        onCancel={onCancelResetNSU}
      />

      <ConfirmDialog
        isOpen={Boolean(companyToDelete)}
        title="Excluir Empresa"
        description={`Tem certeza que deseja excluir a empresa "${companyToDelete?.name || ''}" (${companyToDelete?.cnpj || ''})? Todos os documentos e configurações associados serão removidos localmente. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir Empresa"
        variant="danger"
        isBusy={isDeletingCompany}
        onConfirm={onConfirmDeleteCompany}
        onCancel={onCancelDeleteCompany}
      />

      <FeedbackModalHost />
    </>
  );
}

