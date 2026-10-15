import { promises as fs, existsSync, statSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { DB_PATH, rawClient, db } from '../../../db';
import { storageService } from '../storage.service';
import { logger } from '../../utils/logger';
import { activityLogService } from '../activity-log.service';
import {
  BackupModule,
  BackupSettings,
  BackupManifest,
  getDefaultDestination,
} from './backup.types';

export interface CreateBackupOptions {
  modules: BackupModule[];
  customDestination?: string;
  customFilename?: string;
}

export interface CreateBackupResult {
  filename: string;
  path: string;
  sizeBytes: number;
  manifest: BackupManifest;
}

export async function createBackup(
  options: CreateBackupOptions,
  settings: BackupSettings,
  onAfterCreate?: (finalDir: string) => Promise<void>
): Promise<CreateBackupResult> {
  if (!existsSync(DB_PATH)) {
    throw new Error(`Arquivo do banco não encontrado: ${DB_PATH}`);
  }

  const modules = options.modules && options.modules.length > 0
    ? options.modules
    : (['NF_VIEW', 'DEPRECIATION', 'BUSCADOR', 'SETTINGS'] as BackupModule[]);

  // 1. Força flush do WAL antes da leitura
  try {
    if (rawClient) {
      await rawClient.execute('PRAGMA wal_checkpoint(TRUNCATE);');
    }
  } catch (chkErr) {
    logger.warn({ err: (chkErr as Error).message }, 'backup_wal_checkpoint_note');
  }

  const zip = new AdmZip();
  const manifestStats: BackupManifest['stats'] = {};
  const checksums: Record<string, string> = {};

  const addFileWithChecksum = (entryPath: string, buffer: Buffer) => {
    zip.addFile(entryPath, buffer);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    checksums[entryPath] = `sha256:${hash}`;
  };

  // 2. Extrai dados do módulo DEPRECIATION
  if (modules.includes('DEPRECIATION')) {
    const [compList, catList, assetList, depEntriesList, depExportsList] = await Promise.all([
      db.query.companies.findMany(),
      db.query.categories.findMany(),
      db.query.assets.findMany(),
      db.query.depreciationEntries.findMany(),
      db.query.depreciationExports.findMany(),
    ]);

    manifestStats.companies = compList.length;
    manifestStats.categories = catList.length;
    manifestStats.assets = assetList.length;
    manifestStats.depreciationEntries = depEntriesList.length;
    manifestStats.depreciationExports = depExportsList.length;

    const depreciationPayload = {
      companies: compList,
      categories: catList,
      assets: assetList,
      depreciationEntries: depEntriesList,
      depreciationExports: depExportsList,
    };

    addFileWithChecksum('data/depreciation.json', Buffer.from(JSON.stringify(depreciationPayload, null, 2), 'utf-8'));
  }

  // 3. Extrai dados do módulo NF_VIEW (e compacta os arquivos XML físicos)
  if (modules.includes('NF_VIEW')) {
    const [foldersList, batchesList, importJobsList, docsList, docItemsList, docTaxesList, docEventsList] = await Promise.all([
      db.query.folders.findMany(),
      db.query.batches.findMany(),
      db.query.importJobs.findMany(),
      db.query.documents.findMany(),
      db.query.documentItems.findMany(),
      db.query.documentTaxes.findMany(),
      db.query.documentEvents.findMany(),
    ]);

    manifestStats.folders = foldersList.length;
    manifestStats.batches = batchesList.length;
    manifestStats.importJobs = importJobsList.length;
    manifestStats.documents = docsList.length;
    manifestStats.documentItems = docItemsList.length;
    manifestStats.documentTaxes = docTaxesList.length;
    manifestStats.documentEvents = docEventsList.length;

    let xmlFileCount = 0;
    const docPayloads: any[] = [];

    for (const doc of docsList) {
      let xmlFileName: string | null = null;
      if (doc.rawXmlPath) {
        const baseName = path.basename(doc.rawXmlPath);
        xmlFileName = baseName;
        try {
          const xmlContent = await storageService.readXml(doc.rawXmlPath);
          addFileWithChecksum(`storage/documents/${baseName}`, Buffer.from(xmlContent, 'utf-8'));
          xmlFileCount++;
        } catch (e) {
          logger.warn({ docId: doc.id, rawXmlPath: doc.rawXmlPath }, 'backup_xml_read_failed');
        }
      }
      docPayloads.push({
        ...doc,
        xmlFileName,
      });
    }

    const eventPayloads: any[] = [];
    for (const ev of docEventsList) {
      let xmlFileName: string | null = null;
      if (ev.rawXmlPath) {
        const baseName = path.basename(ev.rawXmlPath);
        xmlFileName = baseName;
        try {
          const xmlContent = await storageService.readXml(ev.rawXmlPath);
          addFileWithChecksum(`storage/documents/${baseName}`, Buffer.from(xmlContent, 'utf-8'));
          xmlFileCount++;
        } catch (e) {
          logger.warn({ eventId: ev.id, rawXmlPath: ev.rawXmlPath }, 'backup_event_xml_read_failed');
        }
      }
      eventPayloads.push({
        ...ev,
        xmlFileName,
      });
    }

    manifestStats.storageXmlFiles = xmlFileCount;

    const nfViewPayload = {
      folders: foldersList,
      batches: batchesList,
      importJobs: importJobsList,
      documents: docPayloads,
      documentItems: docItemsList,
      documentTaxes: docTaxesList,
      documentEvents: eventPayloads,
    };

    addFileWithChecksum('data/nf_view.json', Buffer.from(JSON.stringify(nfViewPayload, null, 2), 'utf-8'));
  }

  // 4. Extrai dados do módulo BUSCADOR
  if (modules.includes('BUSCADOR')) {
    const tableRes = await rawClient.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('buscador_documents', 'certificates', 'distribution_state', 'nfse_events', 'query_history', 'app_settings', 'companies');"
    );
    const existingTables = new Set(tableRes.rows.map((r: any) => r.name));

    let buscadorDocs: any[] = [];
    let certsList: any[] = [];
    let distStatesList: any[] = [];
    let nfseEventsList: any[] = [];
    let queryHistoryList: any[] = [];
    let appSettingsList: any[] = [];
    let buscadorCompanies: any[] = [];

    if (existingTables.has('buscador_documents')) {
      const res = await rawClient.execute('SELECT * FROM "buscador_documents";');
      buscadorDocs = res.rows as any[];
    }
    if (existingTables.has('certificates')) {
      const res = await rawClient.execute('SELECT * FROM "certificates";');
      certsList = res.rows as any[];
    }
    if (existingTables.has('distribution_state')) {
      const res = await rawClient.execute('SELECT * FROM "distribution_state";');
      distStatesList = res.rows as any[];
    }
    if (existingTables.has('nfse_events')) {
      const res = await rawClient.execute('SELECT * FROM "nfse_events";');
      nfseEventsList = res.rows as any[];
    }
    if (existingTables.has('query_history')) {
      const res = await rawClient.execute('SELECT * FROM "query_history";');
      queryHistoryList = res.rows as any[];
    }
    if (existingTables.has('app_settings')) {
      const res = await rawClient.execute("SELECT * FROM \"app_settings\" WHERE key LIKE '%sefaz%' OR key LIKE '%nfse%';");
      appSettingsList = res.rows as any[];
    }
    if (existingTables.has('companies')) {
      const res = await rawClient.execute('SELECT * FROM "companies";');
      buscadorCompanies = res.rows as any[];
    }

    manifestStats.buscadorDocuments = buscadorDocs.length;
    manifestStats.certificates = certsList.length;
    manifestStats.distributionStates = distStatesList.length;
    manifestStats.nfseEvents = nfseEventsList.length;
    manifestStats.queryHistory = queryHistoryList.length;

    // Compacta arquivos físicos XML/PDF do Buscador caso existam em disco
    let buscadorXmlCount = 0;
    const docPayloads: any[] = [];
    for (const doc of buscadorDocs) {
      let xmlRelPath: string | null = null;
      let pdfRelPath: string | null = null;
      if (doc.xml_path && existsSync(doc.xml_path)) {
        try {
          const content = await fs.readFile(doc.xml_path);
          const base = path.basename(doc.xml_path);
          xmlRelPath = `storage/buscador/${base}`;
          addFileWithChecksum(xmlRelPath, content);
          buscadorXmlCount++;
        } catch {}
      }
      if (doc.pdf_path && existsSync(doc.pdf_path)) {
        try {
          const content = await fs.readFile(doc.pdf_path);
          const base = path.basename(doc.pdf_path);
          pdfRelPath = `storage/buscador/${base}`;
          addFileWithChecksum(pdfRelPath, content);
        } catch {}
      }
      docPayloads.push({
        ...doc,
        _backup_xml_entry: xmlRelPath,
        _backup_pdf_entry: pdfRelPath,
      });
    }

    const eventPayloads: any[] = [];
    for (const ev of nfseEventsList) {
      let xmlRelPath: string | null = null;
      if (ev.xml_path && existsSync(ev.xml_path)) {
        try {
          const content = await fs.readFile(ev.xml_path);
          const base = path.basename(ev.xml_path);
          xmlRelPath = `storage/buscador/${base}`;
          addFileWithChecksum(xmlRelPath, content);
          buscadorXmlCount++;
        } catch {}
      }
      eventPayloads.push({
        ...ev,
        _backup_xml_entry: xmlRelPath,
      });
    }

    manifestStats.storageBuscadorXmlFiles = buscadorXmlCount;

    const buscadorPayload = {
      companies: buscadorCompanies,
      documents: docPayloads,
      certificates: certsList,
      distributionStates: distStatesList,
      nfseEvents: eventPayloads,
      queryHistory: queryHistoryList,
      appSettings: appSettingsList,
    };

    addFileWithChecksum('data/buscador.json', Buffer.from(JSON.stringify(buscadorPayload, null, 2), 'utf-8'));
  }

  // 5. Extrai configurações gerais
  if (modules.includes('SETTINGS')) {
    const settingsList = await db.query.applicationSettings.findMany();
    manifestStats.applicationSettings = settingsList.length;

    const settingsPayload = {
      applicationSettings: settingsList,
    };

    addFileWithChecksum('data/settings.json', Buffer.from(JSON.stringify(settingsPayload, null, 2), 'utf-8'));
  }

  // 5. Gera Manifesto
  const manifest: BackupManifest = {
    format: 'workspace-fiscal-backup',
    formatVersion: '2.0',
    appVersion: '3.0.0',
    createdAt: new Date().toISOString(),
    modules,
    checksums,
    stats: manifestStats,
  };

  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'));

  // 6. Define destino e nome do arquivo
  const ts = new Date();
  const stamp = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}_${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}${String(ts.getSeconds()).padStart(2, '0')}`;
  const defaultFilename = `workspace-fiscal-backup-${stamp}.wfb`;

  let finalDir = settings.destination || getDefaultDestination();
  let finalFilename = defaultFilename;

  if (options.customDestination) {
    if (options.customDestination.toLowerCase().endsWith('.wfb') || options.customDestination.toLowerCase().endsWith('.zip')) {
      finalDir = path.dirname(options.customDestination);
      finalFilename = path.basename(options.customDestination);
    } else {
      finalDir = options.customDestination;
    }
  }

  if (options.customFilename) {
    finalFilename = options.customFilename.endsWith('.wfb') ? options.customFilename : `${options.customFilename}.wfb`;
  }

  await fs.mkdir(finalDir, { recursive: true });
  const fullDestPath = path.join(finalDir, finalFilename);

  zip.writeZip(fullDestPath);
  const stat = statSync(fullDestPath);

  // Aplica retenção caso configurada
  if (onAfterCreate) {
    await onAfterCreate(finalDir);
  }

  logger.info({ filename: finalFilename, sizeBytes: stat.size, fullDestPath, modules }, 'backup_wfb_created');
  activityLogService
    .record({
      level: 'SUCCESS',
      module: 'BACKUP',
      action: 'BACKUP_CREATE',
      message: `Backup ${finalFilename} gerado com sucesso (${(stat.size / 1024).toFixed(1)} KB).`,
      details: { filename: finalFilename, sizeBytes: stat.size, path: fullDestPath, modules },
    })
    .catch(() => {});

  return {
    filename: finalFilename,
    path: fullDestPath,
    sizeBytes: stat.size,
    manifest,
  };
}

export async function createSafetyBackup(
  settings: BackupSettings
): Promise<{ filename: string; path: string; sizeBytes: number }> {
  const ts = new Date();
  const stamp = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}_${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}${String(ts.getSeconds()).padStart(2, '0')}`;
  const destination = settings.destination || getDefaultDestination();
  await fs.mkdir(destination, { recursive: true });

  // Salva snapshot atômico do sqlite via VACUUM INTO para emergência absoluta
  const rawBackupPath = `${DB_PATH}.safety.${stamp}.bak`;
  try {
    if (existsSync(DB_PATH) && rawClient) {
      if (existsSync(rawBackupPath)) {
        await fs.unlink(rawBackupPath);
      }
      await rawClient.execute({
        sql: 'VACUUM INTO ?;',
        args: [rawBackupPath],
      });
    }
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'backup_raw_sqlite_safety_failed');
  }

  // Salva backup .wfb de segurança completo
  const safetyFilename = `safety-backup-before-restore-${stamp}.wfb`;
  const res = await createBackup(
    {
      modules: ['NF_VIEW', 'DEPRECIATION', 'BUSCADOR', 'SETTINGS'],
      customDestination: destination,
      customFilename: safetyFilename,
    },
    settings
  );

  return {
    filename: safetyFilename,
    path: res.path,
    sizeBytes: res.sizeBytes,
  };
}

