import { useState } from 'react';
import type { Company, CertificateInfo } from '@/core/buscador/domain/types';
import { presentAfterRefresh } from '@/core/buscador/domain/sync-result';
import { FeedbackInput, useUiStore } from '../stores/ui.store';
import { feedbackFromError, feedbackFromSyncResult } from '../features/feedback/feedback-adapters';

export interface UseSefazSyncOptions {
  activeCompany: Company | null;
  companyCert: CertificateInfo | null;
  loadCompanyContext: (company: Company) => Promise<void>;
  onOpenCertModal: () => void;
}

export function useSefazSync({
  activeCompany,
  companyCert,
  loadCompanyContext,
  onOpenCertModal,
}: UseSefazSyncOptions) {
  const pushFeedback = useUiStore((state) => state.pushFeedback);

  const [isSefazModalOpen, setIsSefazModalOpen] = useState(false);
  const [sefazProgressMsg, setSefazProgressMsg] = useState('');
  const [sefazProgressNSU, setSefazProgressNSU] = useState('');
  const [sefazReceivedCount, setSefazReceivedCount] = useState<number | undefined>(undefined);
  const [activeConsultType, setActiveConsultType] = useState<'NF-e' | 'CT-e'>('NF-e');
  const [synchronizingType, setSynchronizingType] = useState<'NFE' | 'CTE' | null>(null);

  const [pendingNsuReset, setPendingNsuReset] = useState<'NFE' | 'CTE' | null>(null);
  const [isResettingNsu, setIsResettingNsu] = useState(false);

  const handleConsultSefaz = async (targetType?: 'NFE' | 'CTE') => {
    if (!activeCompany) return;
    if (!companyCert) {
      pushFeedback({
        kind: 'error',
        title: 'Certificado digital ausente',
        message: 'Nenhum certificado associado a esta empresa. Por favor, vincule um certificado na barra lateral.',
      });
      onOpenCertModal();
      return;
    }
    if (companyCert.is_expired) {
      pushFeedback({
        kind: 'error',
        title: 'Certificado digital expirado',
        message: 'O certificado associado a esta empresa está expirado. Selecione um certificado válido.',
      });
      return;
    }

    const initialStage = targetType === 'CTE' ? 'CT-e' : 'NF-e';
    setActiveConsultType(initialStage);
    setSynchronizingType(targetType || null);
    setIsSefazModalOpen(true);
    setSefazProgressMsg(`Iniciando comunicação com a SEFAZ (${initialStage})...`);
    setSefazProgressNSU('');
    setSefazReceivedCount(undefined);

    // Escuta progresso do main process
    const unsubscribe = window.fiscalApi?.sefaz.onProgress((data) => {
      if (data.companyId === activeCompany.id) {
        const stage = data.documentType === 'NFE' ? 'NF-e' : 'CT-e';
        setActiveConsultType(stage);
        setSefazProgressMsg(`${stage}: ${data.message}`);
        if (data.currentNSU) setSefazProgressNSU(data.currentNSU);
        if (data.count !== undefined) setSefazReceivedCount(data.count);
      }
    });

    let finalFeedback: FeedbackInput;

    try {
      const result = await window.fiscalApi?.sefaz.consultDocuments(activeCompany.id, targetType);

      if (result) {
        finalFeedback = feedbackFromSyncResult(result);
      } else {
        finalFeedback = {
          kind: 'info',
          title: 'Sincronização finalizada',
          message: 'Consulta finalizada sem resultado.',
        };
      }
    } catch (err: any) {
      finalFeedback = feedbackFromError(
        'Erro na sincronização',
        err,
        'Falha na comunicação com a SEFAZ.',
      );
    } finally {
      unsubscribe?.();
      setSynchronizingType(null);
      setIsSefazModalOpen(false);
      // Sempre atualiza o contexto da empresa (NSU, status e documentos) mesmo em caso de erro ou bloqueio
      await presentAfterRefresh(
        () => loadCompanyContext(activeCompany),
        finalFeedback!,
        pushFeedback
      );
    }
  };

  const handleCancelSefaz = async () => {
    if (activeCompany) {
      await window.fiscalApi?.sefaz.cancelQuery(activeCompany.id);
      setIsSefazModalOpen(false);
      pushFeedback({
        kind: 'info',
        title: 'Cancelamento solicitado',
        message: 'Solicitação de cancelamento enviada à SEFAZ.',
      });
    }
  };

  const handleResetNSU = (docType: 'NFE' | 'CTE') => {
    if (activeCompany) setPendingNsuReset(docType);
  };

  const handleConfirmResetNSU = async () => {
    if (!activeCompany || !pendingNsuReset) return;
    const docType = pendingNsuReset;
    const label = docType === 'NFE' ? 'NF-e' : 'CT-e';
    setIsResettingNsu(true);
    try {
      await window.fiscalApi?.sefaz.resetNSU(activeCompany.id, docType);
      await loadCompanyContext(activeCompany);
      pushFeedback({
        kind: 'success',
        title: `NSU de ${label} resetado`,
        message: `NSU de ${label} resetado com sucesso para 000000000000000. Agora você pode clicar em Sincronizar para nova busca.`,
      });
    } catch (err: any) {
      pushFeedback(feedbackFromError('Falha ao resetar NSU', err, 'Falha ao resetar NSU.'));
    } finally {
      setIsResettingNsu(false);
      setPendingNsuReset(null);
    }
  };

  return {
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
  };
}

