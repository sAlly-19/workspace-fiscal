import { useState } from 'react';
import type { Company, CertificateInfo, CertificateHealthResult } from '@/core/buscador/domain/types';
import { presentAfterRefresh } from '@/core/buscador/domain/sync-result';
import { FeedbackInput, useUiStore } from '../stores/ui.store';
import { feedbackFromError, feedbackFromSyncResult } from '../features/feedback/feedback-adapters';
import { calculateRemainingSeconds, formatRemainingTime } from '../utils/cooldown';

export interface UseSefazSyncOptions {
  activeCompany: Company | null;
  companyCert: CertificateInfo | null;
  certHealth?: CertificateHealthResult | null;
  nsuStatus?: {
    nfeLastNSU: string;
    cteLastNSU: string;
    nfeStatus?: 'IDLE' | 'RUNNING' | 'RATE_LIMITED' | 'ERROR';
    nfeNextQueryAt?: string | null;
    cteStatus?: 'IDLE' | 'RUNNING' | 'RATE_LIMITED' | 'ERROR';
    cteNextQueryAt?: string | null;
  };
  loadCompanyContext: (company: Company) => Promise<void>;
  onOpenCertModal: () => void;
}

export function useSefazSync({
  activeCompany,
  companyCert,
  certHealth,
  nsuStatus,
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

    if (window.fiscalApi?.certificates?.checkHealth) {
      try {
        const liveHealth = await window.fiscalApi.certificates.checkHealth(activeCompany.id);
        if (liveHealth && liveHealth.status !== 'READY') {
          pushFeedback({
            kind: 'warning',
            title: 'Certificado indisponível',
            message: liveHealth.message,
          });
          return;
        }
      } catch (err: any) {
        console.warn('Falha no health-check do certificado:', err);
      }
    }

    const nowMs = Date.now();
    if (
      (!targetType || targetType === 'NFE') &&
      nsuStatus?.nfeNextQueryAt &&
      Date.parse(nsuStatus.nfeNextQueryAt) > nowMs
    ) {
      const remaining = calculateRemainingSeconds(nsuStatus.nfeNextQueryAt, nowMs);
      pushFeedback({
        kind: 'warning',
        title: 'Consulta NF-e em espera (SEFAZ)',
        message: `Limite de requisições da SEFAZ ativo (Consumo Indevido). Aguarde ${formatRemainingTime(remaining)} antes de tentar novamente.`,
      });
      return;
    }

    if (
      targetType === 'CTE' &&
      nsuStatus?.cteNextQueryAt &&
      Date.parse(nsuStatus.cteNextQueryAt) > nowMs
    ) {
      const remaining = calculateRemainingSeconds(nsuStatus.cteNextQueryAt, nowMs);
      pushFeedback({
        kind: 'warning',
        title: 'Consulta CT-e em espera (SEFAZ)',
        message: `Limite de requisições da SEFAZ ativo. Aguarde ${formatRemainingTime(remaining)} antes de tentar novamente.`,
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

