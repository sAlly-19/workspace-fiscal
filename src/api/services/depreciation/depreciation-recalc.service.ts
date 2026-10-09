import { db } from '../../../db';
import { depreciationEntries } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { assetsRepository } from '../../repositories/assets.repository';
import { companiesRepository } from '../../repositories/companies.repository';
import { generateSchedule, DepreciationRule } from '../../../core/depreciation/calculate';

export async function recalculateAssetSchedule(
  assetId: string,
  options?: { force?: boolean }
): Promise<{
  assetId: string;
  monthsRecalculated: number;
  monthsPreserved: number;
  schedule: Array<{
    competence: string;
    depreciationValue: number;
    accumulatedValue: number;
    currentValue: number;
  }>;
}> {
  const asset = await assetsRepository.findById(assetId);
  if (!asset) throw new Error('Bem não encontrado');

  const company = await companiesRepository.findById(asset.companyId);
  const rule = (company?.depreciationRule as DepreciationRule) || 'PROPORTIONAL';

  const newSchedule = generateSchedule({
    acquisitionValue: asset.acquisitionValue,
    annualRate: asset.annualRate,
    acquisitionDate: asset.acquisitionDate,
    depreciationRule: rule,
  });

  const existing = await db.query.depreciationEntries.findMany({
    where: eq(depreciationEntries.assetId, assetId),
  });
  const exportedEntries = existing.filter((e) => e.exported);

  if (exportedEntries.length > 0 && !options?.force) {
    const exportedComps = exportedEntries.map((e) => e.competence).sort();
    throw new Error(
      `Existem ${exportedEntries.length} competências já exportadas (${exportedComps[0]} a ${exportedComps[exportedComps.length - 1]}). ` +
        `Para recalcular desde o início, é necessário apagar essas exportações. Use force=true para confirmar.`
    );
  }

  // Remove entries não-exportadas
  const toDeleteIds = existing.filter((e) => !e.exported).map((e) => e.id);
  for (const id of toDeleteIds) {
    await db.delete(depreciationEntries).where(eq(depreciationEntries.id, id));
  }

  // Insere novas entries preservando as competências já exportadas
  const exportedSet = new Set(exportedEntries.map((e) => e.competence));
  let inserted = 0;
  for (const m of newSchedule) {
    if (exportedSet.has(m.competence)) continue;
    await db.insert(depreciationEntries).values({
      id: crypto.randomUUID(),
      assetId,
      competence: m.competence,
      depreciationValue: m.depreciationValue,
      accumulatedValue: m.accumulatedValue,
      currentValue: m.currentValue,
      exported: false,
    });
    inserted += 1;
  }

  return {
    assetId,
    monthsRecalculated: inserted,
    monthsPreserved: exportedEntries.length,
    schedule: newSchedule.map((m) => ({
      competence: m.competence,
      depreciationValue: m.depreciationValue,
      accumulatedValue: m.accumulatedValue,
      currentValue: m.currentValue,
    })),
  };
}

