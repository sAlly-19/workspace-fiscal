import { db } from '../../../db';
import { depreciationEntries, depreciationExports } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import {
  generateSchedule,
  DepreciationRule,
  getLastClosedCompetence,
} from '../../../core/depreciation/calculate';
import { assetsRepository } from '../../repositories/assets.repository';
import { companiesRepository } from '../../repositories/companies.repository';
import { isDisposedBefore, getDisposedCompetence } from './depreciation-disposal.utils';
import { DepreciationRow } from './depreciation.types';

export async function calculateMonthlyDepreciation(
  companyId: string,
  competence: string
): Promise<{
  rows: DepreciationRow[];
  total: number;
  count: number;
  isExported: boolean;
  exportInfo: any | null;
}> {
  const company = await companiesRepository.findById(companyId);
  if (!company) throw new Error('Empresa não encontrada');

  const rule = (company.depreciationRule as DepreciationRule) || 'PROPORTIONAL';
  const allAssets = await assetsRepository.findAll(companyId);

  // Busca exportação existente
  const existingExport = await db.query.depreciationExports.findFirst({
    where: and(eq(depreciationExports.companyId, companyId), eq(depreciationExports.competence, competence)),
  });

  // Busca entradas exportadas para marcar status
  const exportedMap = new Map<string, boolean>();
  if (existingExport) {
    const entries = await db.query.depreciationEntries.findMany({
      where: and(eq(depreciationEntries.competence, competence)),
    });
    for (const e of entries) {
      if (e.exported) exportedMap.set(e.assetId, true);
    }
  } else {
    const entries = await db.query.depreciationEntries.findMany({
      where: eq(depreciationEntries.competence, competence),
    });
    for (const e of entries) {
      if (e.exported) exportedMap.set(e.assetId, true);
    }
  }

  const lastClosed = getLastClosedCompetence();
  const rows: DepreciationRow[] = [];
  let total = 0;

  for (const asset of allAssets) {
    if (isDisposedBefore(asset, competence)) continue;
    const schedule = generateSchedule({
      acquisitionValue: asset.acquisitionValue,
      annualRate: asset.annualRate,
      acquisitionDate: asset.acquisitionDate,
      depreciationRule: rule,
    });

    const month = schedule.find((m) => m.competence === competence);
    if (!month) continue;

    const exported = exportedMap.has(asset.id);
    const existingEntry = await db.query.depreciationEntries.findFirst({
      where: and(eq(depreciationEntries.assetId, asset.id), eq(depreciationEntries.competence, competence)),
    });
    const hasEntry = !!existingEntry;

    let status: DepreciationRow['status'] = 'future';
    if (exported) {
      status = 'exported';
    } else if (hasEntry) {
      status = 'current';
    } else if (competence === lastClosed) {
      status = 'current';
    } else if (competence < lastClosed) {
      status = 'not_issued';
    } else {
      status = 'future';
    }

    let depVal = month.depreciationValue;
    let accum = month.accumulatedValue;
    let curr = month.currentValue;
    if (exported || hasEntry) {
      const entry =
        existingEntry ??
        (await db.query.depreciationEntries.findFirst({
          where: and(eq(depreciationEntries.assetId, asset.id), eq(depreciationEntries.competence, competence)),
        }));
      if (entry) {
        depVal = entry.depreciationValue;
        accum = entry.accumulatedValue;
        curr = entry.currentValue;
      }
    }

    total += depVal;
    rows.push({
      assetId: asset.id,
      supplier: asset.supplier,
      documentNumber: asset.documentNumber,
      description: asset.description,
      categoryName: asset.categoryName,
      acquisitionDate: asset.acquisitionDate,
      acquisitionValue: asset.acquisitionValue,
      annualRate: asset.annualRate,
      competence,
      depreciationValue: depVal,
      accumulatedValue: accum,
      currentValue: curr,
      isFirstProportional: month.isFirstProportional,
      isLastResidual: month.isLastResidual,
      exported,
      status,
    });
  }

  // Ordena por fornecedor
  rows.sort((a, b) => a.supplier.localeCompare(b.supplier));

  return {
    rows,
    total,
    count: rows.length,
    isExported: !!existingExport,
    exportInfo: existingExport || null,
  };
}

export async function calculateAssetHistory(assetId: string): Promise<{
  asset: any;
  schedule: DepreciationRow[];
  summary: {
    acquisitionValue: number;
    depreciated: number;
    currentValue: number;
    annualRate: number;
    endCompetence: string | null;
  };
}> {
  const asset = await assetsRepository.findById(assetId);
  if (!asset) throw new Error('Bem não encontrado');
  const company = await companiesRepository.findById(asset.companyId);
  const rule = (company?.depreciationRule as DepreciationRule) || 'PROPORTIONAL';

  let scheduleRaw = generateSchedule({
    acquisitionValue: asset.acquisitionValue,
    annualRate: asset.annualRate,
    acquisitionDate: asset.acquisitionDate,
    depreciationRule: rule,
  });

  const disposedCompHist = getDisposedCompetence(asset);
  if (disposedCompHist) {
    scheduleRaw = scheduleRaw.filter((m) => m.competence <= disposedCompHist);
  }

  const entries = await db.query.depreciationEntries.findMany({
    where: eq(depreciationEntries.assetId, assetId),
  });
  const exportedSet = new Set(entries.filter((e) => e.exported).map((e) => e.competence));
  const hasEntrySet = new Set(entries.map((e) => e.competence));
  const lastClosed = getLastClosedCompetence();

  const schedule: DepreciationRow[] = scheduleRaw.map((m) => {
    const exported = exportedSet.has(m.competence);
    const hasEntry = hasEntrySet.has(m.competence);
    let status: DepreciationRow['status'] = 'future';
    if (exported) status = 'exported';
    else if (hasEntry) status = 'current';
    else if (m.competence === lastClosed) status = 'current';
    else if (m.competence < lastClosed) status = 'not_issued';
    else status = 'future';

    return {
      assetId,
      supplier: asset.supplier,
      documentNumber: asset.documentNumber,
      description: asset.description,
      categoryName: asset.categoryName,
      acquisitionDate: asset.acquisitionDate,
      acquisitionValue: asset.acquisitionValue,
      annualRate: asset.annualRate,
      competence: m.competence,
      depreciationValue: m.depreciationValue,
      accumulatedValue: m.accumulatedValue,
      currentValue: m.currentValue,
      isFirstProportional: m.isFirstProportional,
      isLastResidual: m.isLastResidual,
      exported,
      status,
    };
  });

  const lastClosedComp = getLastClosedCompetence();
  const upToClosed = schedule.filter((m) => m.competence <= lastClosedComp);
  const lastClosedEntry = upToClosed[upToClosed.length - 1];
  const lastScheduleEntry = schedule[schedule.length - 1];
  const depreciated = lastClosedEntry ? lastClosedEntry.accumulatedValue : 0;
  const currentValue = lastClosedEntry ? lastClosedEntry.currentValue : asset.acquisitionValue;

  return {
    asset,
    schedule,
    summary: {
      acquisitionValue: asset.acquisitionValue,
      depreciated,
      currentValue,
      annualRate: asset.annualRate,
      endCompetence: lastScheduleEntry?.competence || null,
    },
  };
}

