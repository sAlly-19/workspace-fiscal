import { assets, companies, depreciationEntries, depreciationExports } from '../../db/schema';
import { db } from '../../db';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import {
  generateSchedule,
  DepreciationRule,
  getLastClosedCompetence,
  getCompetencesBetween,
} from '../../core/depreciation/calculate';
import { assetsRepository } from '../repositories/assets.repository';
import { companiesRepository } from '../repositories/companies.repository';

// Re-exporta utilitários e tipos modularizados para manter 100% de compatibilidade com os consumidores
export * from './depreciation/index';
import {
  ColumnMappingItem,
  DEFAULT_COLUMN_MAPPINGS,
  DepreciationCsvRow,
  colLetterToIndex,
  formatDepreciationRowsToCsv,
  getDisposedCompetence,
  isDisposedBefore,
  executeRetroactiveBatch,
  RetroactiveBatchParams,
  RetroactiveBatchResult,
} from './depreciation/index';

export interface DepreciationRow {
  assetId: string;
  supplier: string;
  documentNumber: string;
  description: string;
  categoryName: string | null;
  acquisitionDate: Date;
  acquisitionValue: number;
  annualRate: number;
  competence: string;
  depreciationValue: number;
  accumulatedValue: number;
  currentValue: number;
  isFirstProportional?: boolean;
  isLastResidual?: boolean;
  exported: boolean;
  status: 'exported' | 'current' | 'not_issued' | 'future';
}

export class DepreciationService {
  /**
   * Retorna linhas de depreciação para uma competência e empresa
   */
  async getMonthlyDepreciation(companyId: string, competence: string): Promise<{
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
        // Apenas marca exported se asset pertence à empresa (via join implícito)
        // Simplifica: se entry existe e exported true, marca
        if (e.exported) exportedMap.set(e.assetId, true);
      }
    } else {
      // Busca entries exportadas mesmo sem export header (caso legado)
      const entries = await db.query.depreciationEntries.findMany({
        where: eq(depreciationEntries.competence, competence),
      });
      for (const e of entries) if (e.exported) exportedMap.set(e.assetId, true);
    }

    const lastClosed = this.getLastClosedCompetence();
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

      // Trunca se baixado antes do fim da vida (não deve depreciar após baixa)
      const disposedComp = getDisposedCompetence(asset);
      if (disposedComp && schedule.length && schedule[schedule.length - 1].competence > disposedComp) {
        // Remove meses após baixa (não afeta month already filtered, mas garante consistência)
      }

      const month = schedule.find((m) => m.competence === competence);
      if (!month) continue;
      // Se baixado e competência é após baixa, já filtrado acima, mas se competência == baixa ainda deprecia

      const exported = exportedMap.has(asset.id);
      // Verifica se já existe entry gerada para esta competência (independente de export)
      const existingEntry = await db.query.depreciationEntries.findFirst({
        where: and(eq(depreciationEntries.assetId, asset.id), eq(depreciationEntries.competence, competence)),
      });
      const hasEntry = !!existingEntry;

      let status: DepreciationRow['status'] = 'future';
      if (exported) {
        status = 'exported';
      } else if (hasEntry) {
        // Já existe lançamento gerado (retroativa ou cálculo) → tratado como "atual/processado"
        status = 'current';
      } else if (competence === lastClosed) {
        status = 'current';
      } else if (competence < lastClosed) {
        // Competência anterior ao último mês fechado e sem lançamento gerado → "Não Lançado"
        status = 'not_issued';
      } else {
        status = 'future';
      }

      // Se já exportado ou já tem entry, busca valor da entry (para garantir que total bate com gerado/exportado)
      let depVal = month.depreciationValue;
      let accum = month.accumulatedValue;
      let curr = month.currentValue;
      if (exported || hasEntry) {
        const entry = existingEntry ?? await db.query.depreciationEntries.findFirst({
          where: and(eq(depreciationEntries.assetId, asset.id), eq(depreciationEntries.competence, competence)),
        });
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

  /**
   * Gera histórico completo de um bem (todas as competências)
   */
  async getAssetHistory(assetId: string): Promise<{
    asset: any;
    schedule: DepreciationRow[];
    summary: { acquisitionValue: number; depreciated: number; currentValue: number; annualRate: number; endCompetence: string | null };
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
    // Se baixado, trunca histórico até competência da baixa (inclusive)
    const disposedCompHist = getDisposedCompetence(asset);
    if (disposedCompHist) {
      scheduleRaw = scheduleRaw.filter((m) => m.competence <= disposedCompHist);
    }

    // Busca entries exportadas para marcar
    const entries = await db.query.depreciationEntries.findMany({
      where: eq(depreciationEntries.assetId, assetId),
    });
    const exportedSet = new Set(entries.filter((e) => e.exported).map((e) => e.competence));
    const hasEntrySet = new Set(entries.map((e) => e.competence));
    const lastClosed = this.getLastClosedCompetence();

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

    // Saldos até último mês fechado (contábil)
    const lastClosedComp = this.getLastClosedCompetence();
    const upToClosed = schedule.filter((m) => m.competence <= lastClosedComp);
    const lastClosedEntry = upToClosed[upToClosed.length - 1];
    const lastScheduleEntry = schedule[schedule.length - 1];
    // Se bem ainda não começou a depreciar (aquisição após fechamento), mostra 0 depreciado
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

  /**
   * Gera CSV e registra exportação para uma competência
   */
  async generateCsv(companyId: string, competence: string, options?: {
    separator?: string;
    numericFormat?: 'BRL' | 'RAW';
    dateFormat?: 'DD/MM/YYYY' | 'YYYY-MM-DD';
    columns?: ColumnMappingItem[];
  }): Promise<{
    csv: string;
    filename: string;
    total: number;
    count: number;
    alreadyExported: boolean;
  }> {
    const { rows, total, isExported } = await this.getMonthlyDepreciation(companyId, competence);
    if (rows.length === 0) throw new Error('Nenhum bem para depreciar nesta competência');

    const sep = options?.separator || ';';
    const company = await companiesRepository.findById(companyId);
    const filename = `depreciacao_${competence.replace('-', '')}_${company?.cnpj || companyId.slice(0, 8)}.csv`;

    // Verifica se já exportado
    if (isExported) {
      // Não bloqueia, apenas informa; a rota decidirá se exige confirmação
    }

    const csvRows: DepreciationCsvRow[] = rows.map((r) => ({
      ...r,
      assetDescription: r.description,
    }));
    const csv = formatDepreciationRowsToCsv(csvRows, options);

    // Persiste entries + export
    // Cria/atualiza depreciation_entries para cada asset na competência
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

  getCurrentCompetence(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  getLastClosedCompetence(): string {
    return getLastClosedCompetence();
  }

  /**
   * Gera CSV retroativo para um bem específico: todas as competências desde aquisição até último fechado
   */
  async generateRetroactiveForAsset(companyId: string, assetId: string): Promise<{
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
    let lastClosed = this.getLastClosedCompetence();
    const disposedCompRetro = getDisposedCompetence(asset);
    if (disposedCompRetro && disposedCompRetro < lastClosed) lastClosed = disposedCompRetro;
    const startComp = schedule[0]?.competence;
    if (!startComp) throw new Error('Cronograma vazio');
    if (startComp > lastClosed) throw new Error('Bem adquirido após último mês fechado — nada a gerar retroativamente');

    const retroComps = getCompetencesBetween(startComp, lastClosed).filter((c) => schedule.some((m) => m.competence === c));
    if (retroComps.length === 0) throw new Error('Nenhuma competência retroativa');

    // Monta linhas
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
    const filename = `retroativa_NF${asset.documentNumber}_${startComp.replace('-','')}_a_${lastClosed.replace('-','')}.csv`;

    // Marca entries como exportadas
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

  /**
   * Recalcula o cronograma de depreciação de um bem quando a taxa ou categoria muda.
   * Estratégia:
   * - Bloqueia se houver entries já marcadas como exported=true (competências imutáveis).
   * - Remove apenas entries com exported=0 (futuras/pendentes) e reinsere com novos valores.
   * - Retorna o número de meses recalculados.
   */
  async recalculateAsset(assetId: string, options?: { force?: boolean }): Promise<{
    assetId: string;
    monthsRecalculated: number;
    monthsPreserved: number;
    schedule: Array<{ competence: string; depreciationValue: number; accumulatedValue: number; currentValue: number }>;
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

    // Busca entries existentes
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

    // Remove entries não-exportadas (passadas não exportadas e futuras)
    const toDeleteIds = existing.filter((e) => !e.exported).map((e) => e.id);
    for (const id of toDeleteIds) {
      await db.delete(depreciationEntries).where(eq(depreciationEntries.id, id));
    }

    // Insere novas entries para o cronograma, exceto as competências já exportadas (que permanecem como estavam)
    const exportedSet = new Set(exportedEntries.map((e) => e.competence));
    let inserted = 0;
    for (const m of newSchedule) {
      if (exportedSet.has(m.competence)) continue; // preserva
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

  /**
   * F8: Depreciação retroativa em lote.
   * Recebe lista de assetIds + range de competências e gera entries para cada par (asset, competence),
   * respeitando a regra da empresa, a data de aquisição de cada bem e a competência da baixa (se houver).
   * Substitui entries não-exportadas existentes; preserva exportadas.
   */
  async generateRetroactiveBatch(params: RetroactiveBatchParams): Promise<RetroactiveBatchResult> {
    return executeRetroactiveBatch(params);
  }

  async getDashboard(companyId: string) {
    const allAssets = await assetsRepository.findAll(companyId);
    const company = await companiesRepository.findById(companyId);
    const rule = (company?.depreciationRule as DepreciationRule) || 'PROPORTIONAL';
    let totalAcquisition = 0;
    let totalCurrent = 0;
    let fullyDepreciated = 0;
    for (const asset of allAssets) {
      totalAcquisition += asset.acquisitionValue;
      if (asset.status === 'DISPOSED') {
        // Baixados: não contam como depreciados e não entram no valor contábil atual
        continue;
      }
      const schedule = generateSchedule({
        acquisitionValue: asset.acquisitionValue,
        annualRate: asset.annualRate,
        acquisitionDate: asset.acquisitionDate,
        depreciationRule: rule,
      });
      const last = schedule[schedule.length - 1];
      const lastClosedComp = this.getLastClosedCompetence();
      if (last && last.competence <= lastClosedComp && last.currentValue === 0) fullyDepreciated += 1;
      // Valor contábil considerado até último fechado (truncado se baixado)
      let history = schedule.filter((m) => m.competence <= lastClosedComp);
      const disposedCompDash = getDisposedCompetence(asset);
      if (disposedCompDash) history = history.filter((m) => m.competence <= disposedCompDash);
      const lastHist = history[history.length - 1];
      if (lastHist) totalCurrent += lastHist.currentValue;
      else totalCurrent += asset.acquisitionValue; // ainda não começou
    }
    return {
      totalAssets: allAssets.length,
      totalAcquisition,
      totalCurrent,
      fullyDepreciated,
      company,
    };
  }
}

export const depreciationService = new DepreciationService();

