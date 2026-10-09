import { FiscalTotals, FiscalBilling } from '../../fiscal.types';
import { parseCteNumber } from './cte-number.utils';

export function parseIcms(imp: any): {
  cst?: string;
  base: number;
  aliq: number;
  value: number;
  reduction: number;
} {
  let cst: string | undefined;
  let base = 0;
  let aliq = 0;
  let value = 0;
  let reduction = 0;

  const icmsNode = imp.ICMS || {};
  for (const key of Object.keys(icmsNode)) {
    const mod = icmsNode[key];
    if (mod) {
      cst = mod.CST !== undefined ? String(mod.CST) : key.replace(/^ICMS/, '');
      if (mod.vBC !== undefined) base = parseCteNumber(mod.vBC);
      if (mod.pICMS !== undefined) aliq = parseCteNumber(mod.pICMS);
      if (mod.vICMS !== undefined) value = parseCteNumber(mod.vICMS);
      if (mod.pRedBC !== undefined) reduction = parseCteNumber(mod.pRedBC);
      break;
    }
  }

  return { cst, base, aliq, value, reduction };
}

export function parseBilling(cobrData: any): FiscalBilling | undefined {
  if (!cobrData) return undefined;
  const billing: FiscalBilling = {};
  let hasData = false;

  if (cobrData.fat) {
    const fat = cobrData.fat;
    billing.invoice = {
      number: fat.nFat ? String(fat.nFat) : undefined,
      originalAmount: fat.vOrig !== undefined ? parseCteNumber(fat.vOrig) : undefined,
      discountAmount: fat.vDesc !== undefined ? parseCteNumber(fat.vDesc) : undefined,
      netAmount: fat.vLiq !== undefined ? parseCteNumber(fat.vLiq) : undefined,
    };
    hasData = true;
  }

  if (cobrData.dup) {
    const dups = Array.isArray(cobrData.dup) ? cobrData.dup : [cobrData.dup];
    billing.duplicates = dups.map((d: any) => ({
      number: d.nDup ? String(d.nDup) : '',
      dueDate: d.dVenc ? String(d.dVenc) : '',
      amount: parseCteNumber(d.vDup),
    }));
    hasData = true;
  }

  return hasData ? billing : undefined;
}

export function parseTotals(
  vPrest: any,
  imp: any,
  icms: { base: number; value: number }
): FiscalTotals {
  const totalPrest = parseCteNumber(vPrest.vTPrest);
  const tribFed = imp.infTribFed || {};
  const pis = parseCteNumber(tribFed.vPIS) || parseCteNumber(imp.vPIS) || 0;
  const cofins = parseCteNumber(tribFed.vCOFINS) || parseCteNumber(imp.vCOFINS) || 0;
  const inss = parseCteNumber(tribFed.vINSS) || 0;
  const ir = parseCteNumber(tribFed.vIR) || 0;
  const csll = parseCteNumber(tribFed.vCSLL) || 0;
  const totalTaxes = parseCteNumber(imp.vTotTrib) || (icms.value + pis + cofins + inss + ir + csll);

  return {
    products: 0,
    total: totalPrest,
    icmsBase: icms.base,
    totalTaxes,
    taxes: {
      icms: icms.value,
      icmsBase: icms.base,
      pis,
      cofins,
      inss,
      ir,
      csll,
      totalTaxes,
    },
  };
}

