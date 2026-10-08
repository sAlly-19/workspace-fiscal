import { promises as fs, existsSync, statSync } from 'fs';
import path from 'path';
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
    : (['NF_VIEW', 'DEPRECIATION', 'SETTINGS'] as BackupModule[]);

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

    zip.addFile('data/depreciation.json', Buffer.from(JSON.stringify(depreciationPayload, null, 2), 'utf-8'));
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
          zip.addFile(`storage/documents/${baseName}`, Buffer.from(xmlContent, 'utf-8'));
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
          zip.addFile(`storage/documents/${baseName}`, Buffer.from(xmlContent, 'utf-8'));
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

    zip.addFile('data/nf_view.json', Buffer.from(JSON.stringify(nfViewPayload, null, 2), 'utf-8'));
  }

  // 4. Extrai configurações gerais
  if (modules.includes('SETTINGS')) {
    const settingsList = await db.query.applicationSettings.findMany();
    manifestStats.applicationSettings = settingsList.length;

    const settingsPayload = {
      applicationSettings: settingsList,
    };

    zip.addFile('data/settings.json', Buffer.from(JSON.stringify(settingsPayload, null, 2), 'utf-8'));
  }

  // 5. Gera Manifesto
  const manifest: BackupManifest = {
    format: 'workspace-fiscal-backup',
    formatVersion: '1.0',
    appVersion: '3.0.0',
    createdAt: new Date().toISOString(),
    modules,
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

  // Salva cópia bruta do sqlite para emergência absoluta
  const rawBackupPath = `${DB_PATH}.safety.${stamp}.bak`;
  try {
    if (existsSync(DB_PATH)) {
      await fs.copyFile(DB_PATH, rawBackupPath);
    }
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'backup_raw_sqlite_safety_failed');
  }

  // Salva backup .wfb de segurança completo
  const safetyFilename = `safety-backup-before-restore-${stamp}.wfb`;
  const res = await createBackup(
    {
      modules: ['NF_VIEW', 'DEPRECIATION', 'SETTINGS'],
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

