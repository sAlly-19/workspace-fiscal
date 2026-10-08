import { db } from '../../../db';
import type { DatabaseStats } from './backup.types';

export async function getDatabaseStats(): Promise<DatabaseStats> {
  const [
    docsCount,
    itemsCount,
    taxesCount,
    eventsCount,
    foldersCount,
    batchesCount,
    companiesCount,
    categoriesCount,
    assetsCount,
    depEntriesCount,
    depExportsCount,
    settingsCount,
  ] = await Promise.all([
    db.query.documents.findMany({ columns: { id: true, rawXmlPath: true } }).catch(() => []),
    db.query.documentItems.findMany({ columns: { id: true } }).catch(() => []),
    db.query.documentTaxes.findMany({ columns: { id: true } }).catch(() => []),
    db.query.documentEvents.findMany({ columns: { id: true } }).catch(() => []),
    db.query.folders.findMany({ columns: { id: true } }).catch(() => []),
    db.query.batches.findMany({ columns: { id: true } }).catch(() => []),
    db.query.companies.findMany({ columns: { id: true } }).catch(() => []),
    db.query.categories.findMany({ columns: { id: true } }).catch(() => []),
    db.query.assets.findMany({ columns: { id: true } }).catch(() => []),
    db.query.depreciationEntries.findMany({ columns: { id: true } }).catch(() => []),
    db.query.depreciationExports.findMany({ columns: { id: true } }).catch(() => []),
    db.query.applicationSettings.findMany({ columns: { key: true } }).catch(() => []),
  ]);

  let xmlCount = 0;
  for (const d of docsCount) {
    if (d.rawXmlPath) xmlCount++;
  }

  return {
    nfView: {
      documents: docsCount.length,
      items: itemsCount.length,
      taxes: taxesCount.length,
      events: eventsCount.length,
      folders: foldersCount.length,
      batches: batchesCount.length,
      storageXmlFiles: xmlCount,
    },
    depreciation: {
      companies: companiesCount.length,
      categories: categoriesCount.length,
      assets: assetsCount.length,
      depreciationEntries: depEntriesCount.length,
      depreciationExports: depExportsCount.length,
    },
    settings: {
      count: settingsCount.length,
    },
  };
}

