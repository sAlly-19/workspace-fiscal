import { db, rawClient } from '../../../db';
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

  let buscadorDocsCount = 0;
  let certsCount = 0;
  let eventsBuscadorCount = 0;
  let distStatesCount = 0;
  let buscadorXmlCount = 0;

  try {
    const tableRes = await rawClient.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('buscador_documents', 'certificates', 'distribution_state', 'nfse_events');");
    const existingTables = new Set(tableRes.rows.map((r: any) => r.name));

    if (existingTables.has('buscador_documents')) {
      const bdocs = await rawClient.execute('SELECT COUNT(*) as c, COUNT(xml_path) as xc FROM buscador_documents;');
      buscadorDocsCount = Number((bdocs.rows[0] as any)?.c || 0);
      buscadorXmlCount = Number((bdocs.rows[0] as any)?.xc || 0);
    }
    if (existingTables.has('certificates')) {
      const certs = await rawClient.execute('SELECT COUNT(*) as c FROM certificates;');
      certsCount = Number((certs.rows[0] as any)?.c || 0);
    }
    if (existingTables.has('distribution_state')) {
      const dist = await rawClient.execute('SELECT COUNT(*) as c FROM distribution_state;');
      distStatesCount = Number((dist.rows[0] as any)?.c || 0);
    }
    if (existingTables.has('nfse_events')) {
      const evs = await rawClient.execute('SELECT COUNT(*) as c FROM nfse_events;');
      eventsBuscadorCount = Number((evs.rows[0] as any)?.c || 0);
    }
  } catch {}

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
    buscador: {
      documents: buscadorDocsCount,
      certificates: certsCount,
      events: eventsBuscadorCount,
      distributionStates: distStatesCount,
      storageXmlFiles: buscadorXmlCount,
    },
    settings: {
      count: settingsCount.length,
    },
  };
}

