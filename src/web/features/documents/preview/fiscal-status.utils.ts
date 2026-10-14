export type FiscalStatusCategory = 'AUTHORIZED' | 'CANCELLED_DENIED' | 'UNAUTHORIZED_OR_DRAFT';

export interface FiscalStatusInfo {
  category: FiscalStatusCategory;
  label: string;
  badgeText: string;
  badgeClass: string;
  description: string;
}

/**
 * Resolve o status fiscal com base nos códigos cStat oficiais da SEFAZ (Salvaguarda IMP-019):
 * - cStat 100 e 150 (autorização fora de prazo) -> AUTHORIZED (Verde)
 * - cStat 101, 151, 110, 301, 302, 303 ou status === 'CANCELLED' -> CANCELLED_DENIED (Vermelho)
 * - Sem protocolo oficial -> UNAUTHORIZED_OR_DRAFT (Âmbar)
 */
export function resolveFiscalStatus(docOrParams: {
  protocolStatus?: string;
  hasAuthorizationProtocol?: boolean;
  status?: string;
  documentStatus?: string;
  protocolStatusDescription?: string;
}): FiscalStatusInfo {
  const cStat = docOrParams?.protocolStatus ? String(docOrParams.protocolStatus).trim() : '';
  const status = docOrParams?.status || docOrParams?.documentStatus;
  const isCancelled = ['101', '151', '110', '301', '302', '303'].includes(cStat) || status === 'CANCELLED';

  if (isCancelled) {
    return {
      category: 'CANCELLED_DENIED',
      label: 'Cancelada / Denegada',
      badgeText: 'Cancelada/Denegada',
      badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
      description:
        docOrParams?.protocolStatusDescription ||
        (cStat ? `SEFAZ cStat ${cStat} (Cancelamento/Denegação)` : 'Cancelamento homologado ou denegado'),
    };
  }

  const isAuthorized = cStat === '100' || cStat === '150' || docOrParams?.hasAuthorizationProtocol === true;
  if (isAuthorized) {
    const isOutOfTime = cStat === '150';
    return {
      category: 'AUTHORIZED',
      label: isOutOfTime ? 'Autorizada (Fora de Prazo)' : 'Uso Autorizado na SEFAZ',
      badgeText: 'Autorizada',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      description:
        docOrParams?.protocolStatusDescription ||
        (cStat ? `SEFAZ cStat ${cStat} (Uso Autorizado)` : 'Documento Homologado na SEFAZ'),
    };
  }

  return {
    category: 'UNAUTHORIZED_OR_DRAFT',
    label: 'Sem Protocolo SEFAZ',
    badgeText: 'Sem Protocolo',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    description: 'XML sem protocolo de autorização oficial (Documento Não Homologado ou Rascunho)',
  };
}
