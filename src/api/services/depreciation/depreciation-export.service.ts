import { db } from '../../../db';
import { depreciationEntries, depreciationExports } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { companiesRepository } from '../../repositories/companies.repository';
import { assetsRepository } from '../../repositories/assets.repository';
import {
  formatDepreciationRowsToCsv,
  ColumnMappingItem,
  DepreciationCsvRow,
} from './depreciation-csv.formatter';
import { calculateMonthlyDepreciation } from './depreciation-monthly.service';
import {
  generateSchedule,
  DepreciationRule,
  getLastClosedCompetence,
  getCompetencesBetween,
} from '../../../core/depreciation/calculate';
import { getDisposedCompetence } from './depreciation-disposal.utils';

export async function exportMonthlyCsv(
  companyId: string,
  competence: string,
  options?: {
    separator?: string;
    numericFormat?: 'BRL' | 'RAW';
    dateFormat?: 'DD/MM/YYYY' | 'YYYY-MM-DD';
    columns?: ColumnMappingItem[];
  }
): Promise<{
  csv: string;
  filename: string;
  total: number;
  count: number;
  alreadyExported: boolean;
}> {
  const { rows, total, isExported } = await calculateMonthlyDepreciation(companyId, competence);
  if (rows.length === 0) throw new Error('Nenhum bem para depreciar nesta competência');

  const company = await companiesRepository.findById(companyId);
  const filename = `depreciacao_${competence.replace('-', '')}_${company?.cnpj || companyId.slice(0, 8)}.csv`;

  const csvRows: DepreciationCsvRow[] = rows.map((r) => ({
    ...r,
    assetDescription: r.description,
  }));
  const csv = formatDepreciationRowsToCsv(csvRows, options);

  // Persiste entries + export
  for (const r of rows) {
    const existing = await db.query.depreciationEntries.findFirst({
      where: and(eq(depreciationEntries.assetId, r.assetId), eq(depreciationEntries.competence, competence)),
    });
    if (existing) {
      await db.update(depreciationEntries).set({
        depreciationValue: r.depreciationValue,
        accumulatedValue: r.accumulatedValue,
        currentValue: r.currentValue,
        exported: true,
        exportedAt: new Date(),
      }).where(eq(depreciationEntries.id, existing.id));
    } else {
      await db.insert(depreciationEntries).values({
        id: crypto.randomUUID(),
        assetId: r.assetId,
        competence,
        depreciationValue: r.depreciationValue,
        accumulatedValue: r.accumulatedValue,
        currentValue: r.currentValue,
        exported: true,
        exportedAt: new Date(),
      });
    }
  }

  // Registra export header (upsert)
  const existingExport = await db.query.depreciationExports.findFirst({
    where: and(eq(depreciationExports.companyId, companyId), eq(depreciationExports.competence, competence)),
  });
  if (existingExport) {
    await db.update(depreciationExports).set({
      filename,
      totalValue: total,
      generatedAt: new Date(),
      status: 'EXPORTED',
    }).where(eq(depreciationExports.id, existingExport.id));
  } else {
    await db.insert(depreciationExports).values({
      id: crypto.randomUUID(),
      companyId,
      competence,
      filename,
      totalValue: total,
      status: 'EXPORTED',
    });
  }

  return { csv, filename, total, count: rows.length, alreadyExported: isExported };
}

export async function exportRetroactiveAssetCsv(
  companyId: string,
  assetId: string
): Promise<{
  csv: string;
  filename: string;
  total: number;
  count: number;
  competences: string[];
}> {
  const asset = await assetsRepository.findById(assetId);
  if (!asset) throw new Error('Bem não encontrado');
  if (asset.companyId !== companyId) throw new Error('Bem não pertence à empresa');

  const company = await companiesRepository.findById(companyId);
  const rule = (company?.depreciationRule as DepreciationRule) || 'PROPORTIONAL';
  const schedule = generateSchedule({
    acquisitionValue: asset.acquisitionValue,
    annualRate: asset.annualRate,
    acquisitionDate: asset.acquisitionDate,
    depreciationRule: rule,
  });

  let lastClosed = getLastClosedCompetence();
  const disposedCompRetro = getDisposedCompetence(asset);
  if (disposedCompRetro && disposedCompRetro < lastClosed) lastClosed = disposedCompRetro;
  const startComp = schedule[0]?.competence;
  if (!startComp) throw new Error('Cronograma vazio');
  if (startComp > lastClosed) throw new Error('Bem adquirido após último mês fechado — nada a gerar retroativamente');

  const retroComps = getCompetencesBetween(startComp, lastClosed).filter((c) => schedule.some((m) => m.competence === c));
  if (retroComps.length === 0) throw new Error('Nenhuma competência retroativa');

  const rows = retroComps.map((comp) => schedule.find((m) => m.competence === comp)!);
  const rowsForCsv: DepreciationCsvRow[] = rows.map((r) => ({
    competence: r.competence,
    documentNumber: asset.documentNumber,
    description: asset.description,
    assetDescription: asset.description,
    categoryName: asset.categoryName || undefined,
    supplier: asset.supplier,
    acquisitionDate: asset.acquisitionDate,
    acquisitionValue: asset.acquisitionValue,
    annualRate: asset.annualRate,
    depreciationValue: r.depreciationValue,
    accumulatedValue: r.accumulatedValue,
    currentValue: r.currentValue,
    status: 'EXPORTADO',
  }));
  const csv = formatDepreciationRowsToCsv(rowsForCsv);
  const total = rows.reduce((acc, r) => acc + r.depreciationValue, 0);
  const filename = `retroativa_NF${asset.documentNumber}_${startComp.replace('-', '')}_a_${lastClosed.replace('-', '')}.csv`;

  for (const r of rows) {
    const existing = await db.query.depreciationEntries.findFirst({
      where: and(eq(depreciationEntries.assetId, assetId), eq(depreciationEntries.competence, r.competence)),
    });
    if (existing) {
      await db.update(depreciationEntries).set({
        depreciationValue: r.depreciationValue,
        accumulatedValue: r.accumulatedValue,
        currentValue: r.currentValue,
        exported: true,
        exportedAt: new Date(),
      }).where(eq(depreciationEntries.id, existing.id));
    } else {
      await db.insert(depreciationEntries).values({
        id: crypto.randomUUID(),
        assetId,
        competence: r.competence,
        depreciationValue: r.depreciationValue,
        accumulatedValue: r.accumulatedValue,
        currentValue: r.currentValue,
        exported: true,
        exportedAt: new Date(),
      });
    }
  }

  return { csv, filename, total, count: rows.length, competences: retroComps };
}

