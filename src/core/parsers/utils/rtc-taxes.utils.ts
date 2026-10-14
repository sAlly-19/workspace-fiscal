import { parseFiscalNumber } from './xml-number.utils';

export interface ItemRtcTaxes {
  ibsBase?: number;
  ibsAliq?: number;
  ibsValue?: number;
  cbsBase?: number;
  cbsAliq?: number;
  cbsValue?: number;
  isBase?: number;
  isAliq?: number;
  isValue?: number;
}

export interface TotalsRtcTaxes {
  ibs?: number;
  ibsBase?: number;
  cbs?: number;
  cbsBase?: number;
  is?: number;
  isBase?: number;
}

/**
 * Extrai valores de tributos da Reforma Tributária (IBS, CBS e IS) de um item (<det><imposto>).
 * Suporta tags planas (<IBSCBS><vIBS>...) e aninhadas da NT 2024.002 (<gIBSCBS><gIBS>...).
 */
export function extractItemRtcTaxes(impostoNode: any): ItemRtcTaxes {
  if (!impostoNode) return {};

  const ibsCbs = impostoNode.IBSCBS || impostoNode.IBS || impostoNode.CBS;
  const isTag = impostoNode.IS;

  let ibsBase: number | undefined;
  let ibsAliq: number | undefined;
  let ibsValue: number | undefined;

  let cbsBase: number | undefined;
  let cbsAliq: number | undefined;
  let cbsValue: number | undefined;

  if (ibsCbs) {
    const gIbs = ibsCbs.gIBSCBS?.gIBS || ibsCbs.gIBS || ibsCbs;
    const gCbs = ibsCbs.gIBSCBS?.gCBS || ibsCbs.gCBS || ibsCbs;

    if (gIbs.vIBS !== undefined) ibsValue = parseFiscalNumber(gIbs.vIBS);
    if (gIbs.vBCIBS !== undefined) ibsBase = parseFiscalNumber(gIbs.vBCIBS);
    else if (gIbs.vBC !== undefined) ibsBase = parseFiscalNumber(gIbs.vBC);
    if (gIbs.pIBS !== undefined) ibsAliq = parseFiscalNumber(gIbs.pIBS);

    if (gCbs.vCBS !== undefined) cbsValue = parseFiscalNumber(gCbs.vCBS);
    if (gCbs.vBCCBS !== undefined) cbsBase = parseFiscalNumber(gCbs.vBCCBS);
    else if (gCbs.vBC !== undefined) cbsBase = parseFiscalNumber(gCbs.vBC);
    if (gCbs.pCBS !== undefined) cbsAliq = parseFiscalNumber(gCbs.pCBS);
  }

  let isBase: number | undefined;
  let isAliq: number | undefined;
  let isValue: number | undefined;

  if (isTag) {
    const gIs = isTag.gIS || isTag;
    if (gIs.vIS !== undefined) isValue = parseFiscalNumber(gIs.vIS);
    if (gIs.vBCIS !== undefined) isBase = parseFiscalNumber(gIs.vBCIS);
    else if (gIs.vBC !== undefined) isBase = parseFiscalNumber(gIs.vBC);
    if (gIs.pIS !== undefined) isAliq = parseFiscalNumber(gIs.pIS);
  }

  return {
    ibsBase: ibsBase !== undefined && ibsBase > 0 ? ibsBase : undefined,
    ibsAliq: ibsAliq !== undefined && ibsAliq > 0 ? ibsAliq : undefined,
    ibsValue: ibsValue !== undefined && ibsValue > 0 ? ibsValue : undefined,
    cbsBase: cbsBase !== undefined && cbsBase > 0 ? cbsBase : undefined,
    cbsAliq: cbsAliq !== undefined && cbsAliq > 0 ? cbsAliq : undefined,
    cbsValue: cbsValue !== undefined && cbsValue > 0 ? cbsValue : undefined,
    isBase: isBase !== undefined && isBase > 0 ? isBase : undefined,
    isAliq: isAliq !== undefined && isAliq > 0 ? isAliq : undefined,
    isValue: isValue !== undefined && isValue > 0 ? isValue : undefined,
  };
}

/**
 * Extrai totais da Reforma Tributária de um nó de totais (<total> ou <imp>).
 * Suporta tags planas e aninhadas da NT 2024.002.
 */
export function extractTotalsRtcTaxes(totalNode: any): TotalsRtcTaxes {
  if (!totalNode) return {};

  const ibsCbsTot = totalNode.IBSCBSTot?.gIBSCBS || totalNode.IBSCBSTot || totalNode.IBSCBS;
  const isTot = totalNode.ISTot?.gIS || totalNode.ISTot || totalNode.IS;

  let ibs: number | undefined;
  let ibsBase: number | undefined;
  let cbs: number | undefined;
  let cbsBase: number | undefined;

  if (ibsCbsTot) {
    if (ibsCbsTot.vIBS !== undefined) ibs = parseFiscalNumber(ibsCbsTot.vIBS);
    if (ibsCbsTot.vBCIBS !== undefined) ibsBase = parseFiscalNumber(ibsCbsTot.vBCIBS);
    else if (ibsCbsTot.vBC !== undefined) ibsBase = parseFiscalNumber(ibsCbsTot.vBC);

    if (ibsCbsTot.vCBS !== undefined) cbs = parseFiscalNumber(ibsCbsTot.vCBS);
    if (ibsCbsTot.vBCCBS !== undefined) cbsBase = parseFiscalNumber(ibsCbsTot.vBCCBS);
    else if (ibsCbsTot.vBC !== undefined) cbsBase = parseFiscalNumber(ibsCbsTot.vBC);
  }

  let is: number | undefined;
  let isBase: number | undefined;

  if (isTot) {
    if (isTot.vIS !== undefined) is = parseFiscalNumber(isTot.vIS);
    if (isTot.vBCIS !== undefined) isBase = parseFiscalNumber(isTot.vBCIS);
    else if (isTot.vBC !== undefined) isBase = parseFiscalNumber(isTot.vBC);
  }

  return {
    ibs: ibs !== undefined && ibs > 0 ? ibs : undefined,
    ibsBase: ibsBase !== undefined && ibsBase > 0 ? ibsBase : undefined,
    cbs: cbs !== undefined && cbs > 0 ? cbs : undefined,
    cbsBase: cbsBase !== undefined && cbsBase > 0 ? cbsBase : undefined,
    is: is !== undefined && is > 0 ? is : undefined,
    isBase: isBase !== undefined && isBase > 0 ? isBase : undefined,
  };
}

