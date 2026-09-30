import { db } from '../../../db';
import { depreciationEntries } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import {
  generateSchedule,
  DepreciationRule,
  getLastClosedCompetence,
  getCompetencesBetween,
  competenceFromDate,
} from '../../../core/depreciation/calculate';
import { assetsRepository } from '../../repositories/assets.repository';
import { companiesRepository } from '../../repositories/companies.repository';
import { formatDepreciationRowsToCsv, DepreciationCsvRow } from './depreciation-csv.formatter';
import { getDisposedCompetence } from './depreciation-disposal.utils';

export interface RetroactiveBatchParams {
  companyId: string;
  assetIds: string[];
  startCompetence: string;
  endCompetence: string;
  options?: Parameters<typeof formatDepreciationRowsToCsv>[1];
}

export interface RetroactiveBatchResult {
  processed: number;
  skipped: number;
  entriesCreated: number;
  entriesPreserved: number;
  details: Array<{ assetId: string; entriesCreated: number; entriesPreserved: number }>;
  csv: string;
  filename: string;
  count: number;
  total: number;
}

export async function executeRetroactiveBatch(params: RetroactiveBatchParams): Promise<RetroactiveBatchResult> {
  const { companyId, assetIds, startCompetence, endCompetence, options } = params;
  if (!companyId || !Array.isArray(assetIds) || assetIds.length === 0) {
    throw new Error('companyId e assetIds são obrigatórios');
  }
  if (!/^\d{4}-\d{2}$/.test(startCompetence) || !/^\d{4}-\d{2}$/.test(endCompetence)) {
    throw new Error('Competências inválidas (use YYYY-MM)');
  }
  if (startCompetence > endCompetence) {
    throw new Error('Competência inicial deve ser anterior à final');
  }

  const company = await companiesRepository.findById(companyId);
  if (!company) throw new Error('Empresa não encontrada');
  const rule = (company.depreciationRule as DepreciationRule) || 'PROPORTIONAL';

  const lastClosed = getLastClosedCompetence();
  const effectiveEnd = endCompetence > lastClosed ? lastClosed : endCompetence;

  let processed = 0;
  let skipped = 0;
  let totalCreated = 0;
  let totalPreserved = 0;
  const details: Array<{ assetId: string; entriesCreated: number; entriesPreserved: number }> = [];
  const rowsForCsv: DepreciationCsvRow[] = [];

  for (const assetId of assetIds) {
    const asset = await assetsRepository.findById(assetId);
    if (!asset || asset.companyId !== companyId) {
      skipped += 1;
      continue;
    }

    const schedule = generateSchedule({
      acquisitionValue: asset.acquisitionValue,
      annualRate: asset.annualRate,
      acquisitionDate: asset.acquisitionDate,
      depreciationRule: rule,
    });
    const disposedComp = getDisposedCompetence(asset);

    // Determina start efetivo baseado na aquisição
    const acqComp = competenceFromDate(asset.acquisitionDate);
    const effectiveStart = acqComp > startCompetence ? acqComp : startCompetence;
    const finalEnd = disposedComp && disposedComp < effectiveEnd ? disposedComp : effectiveEnd;
    if (effectiveStart > finalEnd) {
      skipped += 1;
      continue;
    }

    const competences = getCompetencesBetween(effectiveStart, finalEnd);
    const scheduleByComp = new Map(schedule.map((m) => [m.competence, m]));

    const existing = await db.query.depreciationEntries.findMany({
      where: eq(depreciationEntries.assetId, assetId),
    });
    const existingByComp = new Map(existing.map((e) => [e.competence, e]));

    let created = 0;
    for (const comp of competences) {
      const m = scheduleByComp.get(comp);
      if (!m) continue;
      const prior = existingByComp.get(comp);
      const values = {
        depreciationValue: m.depreciationValue,
        accumulatedValue: m.accumulatedValue,
        currentValue: m.currentValue,
        exported: true,
        exportedAt: new Date(),
      };
      if (prior) {
        await db.update(depreciationEntries).set(values).where(eq(depreciationEntries.id, prior.id));
      } else {
        await db.insert(depreciationEntries).values({
          id: crypto.randomUUID(),
          assetId,
          competence: comp,
          ...values,
        });
      }
      created += 1;

      rowsForCsv.push({
        competence: comp,
        documentNumber: asset.documentNumber,
        description: asset.description,
        assetDescription: asset.description,
        categoryName: asset.categoryName || undefined,
        supplier: asset.supplier,
        acquisitionDate: asset.acquisitionDate,
        acquisitionValue: asset.acquisitionValue,
        annualRate: asset.annualRate,
        depreciationValue: m.depreciationValue,
        accumulatedValue: m.accumulatedValue,
        currentValue: m.currentValue,
        status: 'EXPORTADO',
      });
    }

    details.push({ assetId, entriesCreated: created, entriesPreserved: 0 });
    processed += 1;
    totalCreated += created;
  }

  // Ordenação consistente: por competência crescente e por documento
  rowsForCsv.sort((a, b) => {
    const cmpComp = a.competence.localeCompare(b.competence);
    if (cmpComp !== 0) return cmpComp;
    return a.documentNumber.localeCompare(b.documentNumber, undefined, { numeric: true });
  });

  const csv = formatDepreciationRowsToCsv(rowsForCsv, options);
  const total = rowsForCsv.reduce((acc, r) => acc + r.depreciationValue, 0);
  const filename = assetIds.length === 1 && rowsForCsv.length > 0
    ? `retroativa_NF${rowsForCsv[0].documentNumber}_${startCompetence.replace('-', '')}_a_${effectiveEnd.replace('-', '')}.csv`
    : `retroativa_lote_${startCompetence.replace('-', '')}_a_${effectiveEnd.replace('-', '')}.csv`;

  return {
    processed,
    skipped,
    entriesCreated: totalCreated,
    entriesPreserved: totalPreserved,
    details,
    csv,
    filename,
    count: rowsForCsv.length,
    total,
  };
}
