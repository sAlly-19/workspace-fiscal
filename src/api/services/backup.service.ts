import { promises as fs, existsSync, statSync, readdirSync, unlinkSync, readFileSync } from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { createClient } from '@libsql/client';
import { DB_PATH, rawClient, db, reconfigureDatabase } from '../../db';
import {
  applicationSettings,
  companies,
  categories,
  assets,
  depreciationEntries,
  depreciationExports,
  folders,
  batches,
  importJobs,
  documents,
  documentItems,
  documentTaxes,
  documentEvents,
} from '../../db/schema';
import { eq } from 'drizzle-orm';
import { storageService } from './storage.service';
import { logger } from '../utils/logger';

export type BackupModule = 'NF_VIEW' | 'DEPRECIATION' | 'SETTINGS';

export interface BackupSettings {
  enabled: boolean;
  intervalDays: number;
  retentionCount: number;
  destination: string; // absolute path
}

export interface BackupManifest {
  format: 'workspace-fiscal-backup';
  formatVersion: '1.0';
  appVersion: string;
  createdAt: string;
  modules: BackupModule[];
  stats: {
    companies?: number;
    categories?: number;
    assets?: number;
    depreciationEntries?: number;
    depreciationExports?: number;
    folders?: number;
    batches?: number;
    importJobs?: number;
    documents?: number;
    documentItems?: number;
    documentTaxes?: number;
    documentEvents?: number;
    storageXmlFiles?: number;
    applicationSettings?: number;
  };
}

export interface BackupInspectionResult {
  valid: boolean;
  error?: string;
  isLegacy?: boolean;
  format?: 'wfb' | 'legacy-sqlite';
  appVersion?: string;
  createdAt?: string;
  filePath?: string;
  modules?: BackupModule[] | ['FULL_DATABASE'];
  stats?: BackupManifest['stats'];
}

export interface DatabaseStats {
  nfView: {
    documents: number;
    items: number;
    taxes: number;
    events: number;
    folders: number;
    batches: number;
    storageXmlFiles: number;
  };
  depreciation: {
    companies: number;
    categories: number;
    assets: number;
    depreciationEntries: number;
    depreciationExports: number;
  };
  settings: {
    count: number;
  };
}

function getDefaultDestination(): string {
  try {
    const electron = require('electron');
    const app = electron?.app;
    if (app && typeof app.getPath === 'function' && app.isReady()) {
      return path.join(app.getPath('documents'), 'workspace-fiscal-backups');
    }
  } catch {}
  return path.join(process.cwd(), 'backups');
}

const DEFAULT_SETTINGS: BackupSettings = {
  enabled: true,
  intervalDays: 7,
  retentionCount: 30,
  destination: getDefaultDestination(),
};

export class BackupService {
  private settings: BackupSettings = { ...DEFAULT_SETTINGS };
  private lastRunAt: number | null = null;
  private timer: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    await this.loadSettingsFromDb();
  }

  async loadSettingsFromDb(): Promise<BackupSettings> {
    try {
      if (!this.settings.destination) {
        this.settings.destination = getDefaultDestination();
      }
      const row = await db.query.applicationSettings.findFirst({
        where: eq(applicationSettings.key, 'backup_settings'),
      });
      if (row?.value) {
        const parsed = JSON.parse(row.value);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'backup_settings_load_db_note');
    }
    return this.settings;
  }

  private async saveSettingsToDb(): Promise<void> {
    try {
      const value = JSON.stringify(this.settings);
      const existing = await db.query.applicationSettings.findFirst({
        where: eq(applicationSettings.key, 'backup_settings'),
      });
      if (existing) {
        await db
          .update(applicationSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(applicationSettings.key, 'backup_settings'));
      } else {
        await db.insert(applicationSettings).values({
          key: 'backup_settings',
          value,
          updatedAt: new Date(),
        });
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'backup_settings_save_db_failed');
    }
  }

  getSettings(): BackupSettings {
    if (!this.settings.destination) {
      this.settings.destination = getDefaultDestination();
    }
    return { ...this.settings };
  }

  updateSettings(partial: Partial<BackupSettings>): BackupSettings {
    this.settings = { ...this.settings, ...partial };
    if (!this.settings.destination) {
      this.settings.destination = getDefaultDestination();
    }
    this.saveSettingsToDb().catch(() => {});
    logger.info({ settings: this.settings }, 'backup_settings_updated');
    return this.getSettings();
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
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

  async createBackup(options: {
    modules: BackupModule[];
    customDestination?: string;
    customFilename?: string;
  }): Promise<{ filename: string; path: string; sizeBytes: number; manifest: BackupManifest }> {
    if (!existsSync(DB_PATH)) {
      throw new Error(`Arquivo do banco não encontrado: ${DB_PATH}`);
    }

    const modules = options.modules && options.modules.length > 0 ? options.modules : (['NF_VIEW', 'DEPRECIATION', 'SETTINGS'] as BackupModule[]);

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

    let finalDir = this.settings.destination || getDefaultDestination();
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
    this.lastRunAt = Date.now();

    // Aplica retenção caso salvo na pasta padrão
    if (path.resolve(finalDir) === path.resolve(this.settings.destination || getDefaultDestination())) {
      await this.applyRetention(finalDir);
    }

    logger.info({ filename: finalFilename, sizeBytes: stat.size, fullDestPath, modules }, 'backup_wfb_created');
    return {
      filename: finalFilename,
      path: fullDestPath,
      sizeBytes: stat.size,
      manifest,
    };
  }

  async createSafetyBackup(): Promise<{ filename: string; path: string; sizeBytes: number }> {
    const ts = new Date();
    const stamp = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}_${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}${String(ts.getSeconds()).padStart(2, '0')}`;
    const destination = this.settings.destination || getDefaultDestination();
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
    const res = await this.createBackup({
      modules: ['NF_VIEW', 'DEPRECIATION', 'SETTINGS'],
      customDestination: destination,
      customFilename: safetyFilename,
    });

    return {
      filename: safetyFilename,
      path: res.path,
      sizeBytes: res.sizeBytes,
    };
  }

  async inspectBackup(filePath: string): Promise<BackupInspectionResult> {
    if (!existsSync(filePath)) {
      return { valid: false, error: `Arquivo de backup não encontrado: ${filePath}` };
    }

    const st = statSync(filePath);
    if (st.isDirectory()) {
      return { valid: false, error: 'O caminho selecionado é um diretório e não um arquivo.' };
    }

    // 1. Verifica se é um arquivo SQLite legado
    try {
      const headerBuffer = Buffer.alloc(16);
      const fd = readFileSync(filePath);
      const isSqlite = fd.subarray(0, 16).toString('utf-8').startsWith('SQLite format 3');
      if (isSqlite || filePath.toLowerCase().endsWith('.db')) {
        const tempClient = createClient({ url: `file:${path.resolve(filePath)}` });
        try {
          const integrity = await tempClient.execute('PRAGMA integrity_check;');
          const checkRes = integrity.rows?.[0]?.[0] ?? (integrity.rows?.[0] as any)?.integrity_check;
          if (checkRes !== 'ok') {
            return {
              valid: false,
              isLegacy: true,
              format: 'legacy-sqlite',
              error: 'O arquivo SQLite está corrompido ou falhou na verificação de integridade.',
            };
          }

          // Lê contagens das tabelas suportadas
          let compCount = 0;
          let assetCount = 0;
          let docCount = 0;
          try {
            const cRes = await tempClient.execute('SELECT COUNT(*) as c FROM companies;');
            compCount = Number((cRes.rows[0] as any)?.c || (cRes.rows[0] as any)?.[0] || 0);
          } catch {}
          try {
            const aRes = await tempClient.execute('SELECT COUNT(*) as c FROM assets;');
            assetCount = Number((aRes.rows[0] as any)?.c || (aRes.rows[0] as any)?.[0] || 0);
          } catch {}
          try {
            const dRes = await tempClient.execute('SELECT COUNT(*) as c FROM documents;');
            docCount = Number((dRes.rows[0] as any)?.c || (dRes.rows[0] as any)?.[0] || 0);
          } catch {}

          return {
            valid: true,
            isLegacy: true,
            format: 'legacy-sqlite',
            appVersion: 'Legado (cópia bruta)',
            createdAt: st.mtime.toISOString(),
            filePath,
            modules: ['FULL_DATABASE'],
            stats: {
              companies: compCount,
              assets: assetCount,
              documents: docCount,
            },
          };
        } finally {
          tempClient.close();
        }
      }
    } catch {
      // Prossegue para validação WFB
    }

    // 2. Valida como arquivo estruturado .wfb
    try {
      const zip = new AdmZip(filePath);
      const manifestEntry = zip.getEntry('manifest.json');
      if (!manifestEntry) {
        return {
          valid: false,
          error: 'Arquivo não é um backup válido do Workspace Fiscal (manifesto ausente).',
        };
      }

      const manifestContent = manifestEntry.getData().toString('utf-8');
      const manifest: BackupManifest = JSON.parse(manifestContent);

      if (manifest.format !== 'workspace-fiscal-backup') {
        return {
          valid: false,
          error: 'Formato do arquivo de backup incompatível com o Workspace Fiscal.',
        };
      }

      // Valida presença dos dados declarados no manifesto
      if (manifest.modules.includes('DEPRECIATION') && !zip.getEntry('data/depreciation.json')) {
        return { valid: false, error: 'Arquivo corrompido: dados de Depreciação ausentes no pacote.' };
      }
      if (manifest.modules.includes('NF_VIEW') && !zip.getEntry('data/nf_view.json')) {
        return { valid: false, error: 'Arquivo corrompido: dados de NF View ausentes no pacote.' };
      }
      if (manifest.modules.includes('SETTINGS') && !zip.getEntry('data/settings.json')) {
        return { valid: false, error: 'Arquivo corrompido: dados de Configurações ausentes no pacote.' };
      }

      return {
        valid: true,
        isLegacy: false,
        format: 'wfb',
        appVersion: manifest.appVersion || 'Desconhecida',
        createdAt: manifest.createdAt,
        filePath,
        modules: manifest.modules,
        stats: manifest.stats,
      };
    } catch (err) {
      return {
        valid: false,
        error: `Não foi possível ler o arquivo de backup: ${(err as Error).message}`,
      };
    }
  }

  async restoreBackup(options: {
    filePath: string;
    modulesToRestore: BackupModule[];
  }): Promise<{ success: boolean; message: string; restoredModules: string[]; safetyBackupFile: string }> {
    const inspection = await this.inspectBackup(options.filePath);
    if (!inspection.valid) {
      throw new Error(inspection.error || 'Arquivo de backup inválido.');
    }

    // 1. Cria obrigatoriamente um backup de segurança antes de qualquer modificação
    let safety: { filename: string; path: string };
    try {
      safety = await this.createSafetyBackup();
      logger.info({ safety }, 'restore_safety_backup_created_successfully');
    } catch (safetyErr) {
      throw new Error(`Falha ao criar o backup de emergência: ${(safetyErr as Error).message}. Restauração abortada.`);
    }

    // 2. Restauração de banco legado SQLite (.db)
    if (inspection.isLegacy) {
      try {
        await rawClient.execute('PRAGMA wal_checkpoint(TRUNCATE);');
        await fs.copyFile(options.filePath, DB_PATH);
        for (const suffix of ['-wal', '-shm', '-journal']) {
          const aux = DB_PATH + suffix;
          if (existsSync(aux)) {
            try {
              await fs.unlink(aux);
            } catch {}
          }
        }
        reconfigureDatabase(DB_PATH);
        const check = await rawClient.execute('PRAGMA integrity_check;');
        const checkRes = check.rows?.[0]?.[0] ?? (check.rows?.[0] as any)?.integrity_check;
        if (checkRes !== 'ok') {
          throw new Error('Integridade do banco SQLite restaurado inválida.');
        }
        return {
          success: true,
          message: 'Banco de dados legado restaurado com sucesso.',
          restoredModules: ['FULL_DATABASE'],
          safetyBackupFile: safety.filename,
        };
      } catch (legacyErr) {
        logger.error({ err: (legacyErr as Error).message }, 'restore_legacy_failed_reverting');
        // Reverte com o arquivo raw de segurança se existir
        reconfigureDatabase(DB_PATH);
        throw new Error(`Erro na restauração do arquivo legado: ${(legacyErr as Error).message}`);
      }
    }

    // 3. Restauração de arquivo estruturado (.wfb)
    const zip = new AdmZip(options.filePath);
    const availableModules = (inspection.modules as any[]) || [];
    const modules = options.modulesToRestore.filter((m) => availableModules.includes(m));

    if (modules.length === 0) {
      throw new Error('Nenhum módulo válido foi selecionado para restauração.');
    }

    try {
      // Inicia transação atômica no SQLite
      await rawClient.execute('BEGIN IMMEDIATE TRANSACTION;');

      // RESTAURAÇÃO: DEPRECIAÇÃO
      if (modules.includes('DEPRECIATION')) {
        const depEntry = zip.getEntry('data/depreciation.json');
        if (!depEntry) throw new Error('Dados de Depreciação não encontrados no arquivo de backup.');
        const depData = JSON.parse(depEntry.getData().toString('utf-8'));

        // Limpa dados de depreciação na ordem reversa das foreign keys
        await rawClient.execute('DELETE FROM "depreciation_entries";');
        await rawClient.execute('DELETE FROM "depreciation_exports";');
        await rawClient.execute('DELETE FROM "assets";');
        await rawClient.execute('DELETE FROM "categories";');
        await rawClient.execute('DELETE FROM "companies";');

        // Insere empresas
        if (Array.isArray(depData.companies)) {
          for (const c of depData.companies) {
            await db.insert(companies).values({
              id: c.id,
              name: c.name,
              tradeName: c.tradeName || null,
              document: c.document || null,
              cnpj: c.cnpj || null,
              state: c.state || null,
              city: c.city || null,
              depreciationRule: c.depreciationRule || 'PROPORTIONAL',
              createdAt: new Date(c.createdAt || Date.now()),
              updatedAt: new Date(c.updatedAt || Date.now()),
            });
          }
        }

        // Insere categorias
        if (Array.isArray(depData.categories)) {
          for (const cat of depData.categories) {
            await db.insert(categories).values({
              id: cat.id,
              companyId: cat.companyId || null,
              name: cat.name,
              defaultRate: Number(cat.defaultRate),
              createdAt: new Date(cat.createdAt || Date.now()),
            });
          }
        }

        // Insere bens / ativos
        if (Array.isArray(depData.assets)) {
          for (const a of depData.assets) {
            await db.insert(assets).values({
              id: a.id,
              companyId: a.companyId,
              supplier: a.supplier,
              acquisitionDate: new Date(a.acquisitionDate),
              documentNumber: a.documentNumber,
              description: a.description,
              acquisitionValue: Number(a.acquisitionValue),
              ncm: a.ncm || null,
              categoryId: a.categoryId || null,
              categoryName: a.categoryName || null,
              annualRate: Number(a.annualRate),
              status: a.status || 'ACTIVE',
              disposedAt: a.disposedAt ? new Date(a.disposedAt) : null,
              disposedReason: a.disposedReason || null,
              createdAt: new Date(a.createdAt || Date.now()),
              updatedAt: new Date(a.updatedAt || Date.now()),
            });
          }
        }

        // Insere exportações registradas
        if (Array.isArray(depData.depreciationExports)) {
          for (const exp of depData.depreciationExports) {
            await db.insert(depreciationExports).values({
              id: exp.id,
              companyId: exp.companyId,
              competence: exp.competence,
              filename: exp.filename,
              generatedAt: new Date(exp.generatedAt || Date.now()),
              totalValue: Number(exp.totalValue),
              status: exp.status || 'EXPORTED',
              createdAt: new Date(exp.createdAt || Date.now()),
            });
          }
        }

        // Insere lançamentos mensais
        if (Array.isArray(depData.depreciationEntries)) {
          for (const en of depData.depreciationEntries) {
            await db.insert(depreciationEntries).values({
              id: en.id,
              assetId: en.assetId,
              competence: en.competence,
              depreciationValue: Number(en.depreciationValue),
              accumulatedValue: Number(en.accumulatedValue),
              currentValue: Number(en.currentValue),
              exported: Boolean(en.exported),
              exportedAt: en.exportedAt ? new Date(en.exportedAt) : null,
              createdAt: new Date(en.createdAt || Date.now()),
            });
          }
        }
      }

      // RESTAURAÇÃO: NF VIEW (com restauração dos XMLs físicos no storage local)
      if (modules.includes('NF_VIEW')) {
        const nfEntry = zip.getEntry('data/nf_view.json');
        if (!nfEntry) throw new Error('Dados de NF View não encontrados no arquivo de backup.');
        const nfData = JSON.parse(nfEntry.getData().toString('utf-8'));

        // 1. Extrai os arquivos XML físicos contidos no pacote para o diretório de storage da máquina atual
        const zipEntries = zip.getEntries();
        for (const entry of zipEntries) {
          if (!entry.isDirectory && entry.entryName.startsWith('storage/documents/')) {
            const fileName = path.basename(entry.entryName);
            const content = entry.getData();
            await storageService.saveXml(fileName, content);
          }
        }

        // 2. Limpa dados de notas fiscais na ordem reversa das foreign keys
        await rawClient.execute('DELETE FROM "document_events";');
        await rawClient.execute('DELETE FROM "document_taxes";');
        await rawClient.execute('DELETE FROM "document_items";');
        await rawClient.execute('DELETE FROM "documents";');
        await rawClient.execute('DELETE FROM "batches";');
        await rawClient.execute('DELETE FROM "folders";');
        await rawClient.execute('DELETE FROM "import_jobs";');

        // 3. Insere pastas mantendo hierarquia (pais antes de filhos)
        if (Array.isArray(nfData.folders)) {
          const rootFolders = nfData.folders.filter((f: any) => !f.parentId);
          const subFolders = nfData.folders.filter((f: any) => !!f.parentId);
          for (const f of [...rootFolders, ...subFolders]) {
            await db.insert(folders).values({
              id: f.id,
              name: f.name,
              parentId: f.parentId || null,
              createdAt: new Date(f.createdAt || Date.now()),
              updatedAt: new Date(f.updatedAt || Date.now()),
            });
          }
        }

        // Insere lotes
        if (Array.isArray(nfData.batches)) {
          for (const b of nfData.batches) {
            await db.insert(batches).values({
              id: b.id,
              name: b.name,
              folderId: b.folderId || null,
              createdAt: new Date(b.createdAt || Date.now()),
              updatedAt: new Date(b.updatedAt || Date.now()),
            });
          }
        }

        // Insere import jobs
        if (Array.isArray(nfData.importJobs)) {
          for (const ij of nfData.importJobs) {
            await db.insert(importJobs).values({
              id: ij.id,
              status: ij.status || 'COMPLETED',
              totalFiles: Number(ij.totalFiles || 0),
              processedFiles: Number(ij.processedFiles || 0),
              createdAt: new Date(ij.createdAt || Date.now()),
              updatedAt: new Date(ij.updatedAt || Date.now()),
            });
          }
        }

        // Insere documentos reconstruindo rawXmlPath apontando para a máquina local
        if (Array.isArray(nfData.documents)) {
          for (const doc of nfData.documents) {
            const xmlBase = doc.xmlFileName || path.basename(doc.rawXmlPath || '');
            const localRawXmlPath = xmlBase ? storageService.getDocumentPath('xml', xmlBase) : doc.rawXmlPath;

            await db.insert(documents).values({
              id: doc.id,
              type: doc.type,
              accessKey: doc.accessKey || null,
              number: doc.number || null,
              series: doc.series || null,
              issueDate: doc.issueDate ? new Date(doc.issueDate) : null,
              status: doc.status || 'VALID',
              issuerName: doc.issuerName || null,
              issuerDocument: doc.issuerDocument || null,
              recipientName: doc.recipientName || null,
              recipientDocument: doc.recipientDocument || null,
              totalAmount: doc.totalAmount !== undefined && doc.totalAmount !== null ? Number(doc.totalAmount) : null,
              billing: doc.billing || null,
              rawXmlPath: localRawXmlPath,
              batchId: doc.batchId || null,
              importJobId: doc.importJobId || null,
              createdAt: new Date(doc.createdAt || Date.now()),
              updatedAt: new Date(doc.updatedAt || Date.now()),
            });
          }
        }

        // Insere itens
        if (Array.isArray(nfData.documentItems)) {
          for (const it of nfData.documentItems) {
            await db.insert(documentItems).values({
              id: it.id,
              documentId: it.documentId,
              code: it.code || null,
              description: it.description,
              quantity: Number(it.quantity),
              unitPrice: Number(it.unitPrice),
              totalPrice: Number(it.totalPrice),
              cfop: it.cfop || null,
              ncm: it.ncm || null,
              unit: it.unit || null,
            });
          }
        }

        // Insere impostos
        if (Array.isArray(nfData.documentTaxes)) {
          for (const tx of nfData.documentTaxes) {
            await db.insert(documentTaxes).values({
              id: tx.id,
              documentId: tx.documentId,
              taxType: tx.taxType,
              amount: Number(tx.amount),
              base: tx.base !== null && tx.base !== undefined ? Number(tx.base) : null,
              rate: tx.rate !== null && tx.rate !== undefined ? Number(tx.rate) : null,
            });
          }
        }

        // Insere eventos reconstruindo rawXmlPath
        if (Array.isArray(nfData.documentEvents)) {
          for (const ev of nfData.documentEvents) {
            const xmlBase = ev.xmlFileName || path.basename(ev.rawXmlPath || '');
            const localRawXmlPath = xmlBase ? storageService.getDocumentPath('xml', xmlBase) : ev.rawXmlPath;

            await db.insert(documentEvents).values({
              id: ev.id,
              documentId: ev.documentId,
              eventType: ev.eventType,
              sequence: Number(ev.sequence || 1),
              eventDate: ev.eventDate ? new Date(ev.eventDate) : null,
              protocol: ev.protocol || null,
              rawXmlPath: localRawXmlPath,
              correctionText: ev.correctionText || null,
              createdAt: new Date(ev.createdAt || Date.now()),
            });
          }
        }
      }

      // RESTAURAÇÃO: CONFIGURAÇÕES
      if (modules.includes('SETTINGS')) {
        const setEntry = zip.getEntry('data/settings.json');
        if (setEntry) {
          const setData = JSON.parse(setEntry.getData().toString('utf-8'));
          if (Array.isArray(setData.applicationSettings)) {
            for (const s of setData.applicationSettings) {
              const existing = await db.query.applicationSettings.findFirst({
                where: eq(applicationSettings.key, s.key),
              });
              if (existing) {
                await db
                  .update(applicationSettings)
                  .set({ value: s.value, updatedAt: new Date() })
                  .where(eq(applicationSettings.key, s.key));
              } else {
                await db.insert(applicationSettings).values({
                  key: s.key,
                  value: s.value,
                  updatedAt: new Date(),
                });
              }
            }
          }
        }
      }

      // 4. Verificação de integridade referencial antes do commit
      const fkCheck = await rawClient.execute('PRAGMA foreign_key_check;');
      if (fkCheck.rows && fkCheck.rows.length > 0) {
        throw new Error(`Inconsistência de chave estrangeira após restauração: ${JSON.stringify(fkCheck.rows)}`);
      }

      await rawClient.execute('COMMIT;');
      logger.info({ modules, safetyBackup: safety.filename }, 'restore_completed_successfully');

      return {
        success: true,
        message: 'Módulos restaurados com sucesso com integridade verificada.',
        restoredModules: modules,
        safetyBackupFile: safety.filename,
      };
    } catch (restoreErr) {
      await rawClient.execute('ROLLBACK;').catch(() => {});
      logger.error({ err: (restoreErr as Error).message }, 'restore_transaction_failed_rolled_back');
      throw new Error(`Falha na restauração: ${(restoreErr as Error).message}. Nenhuma alteração foi gravada.`);
    }
  }

  // Mantido para compatibilidade legado com chamada rápida
  async runBackup(): Promise<{ filename: string; path: string; sizeBytes: number }> {
    return this.createBackup({
      modules: ['NF_VIEW', 'DEPRECIATION', 'SETTINGS'],
    });
  }

  private async applyRetention(destination?: string): Promise<void> {
    const dest = destination || this.settings.destination || getDefaultDestination();
    try {
      const files = readdirSync(dest)
        .filter((f) => (f.endsWith('.wfb') || f.endsWith('.db')) && !f.endsWith('.bak'))
        .map((f) => ({
          name: f,
          full: path.join(dest, f),
          mtime: statSync(path.join(dest, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime);

      const toDelete = files.slice(this.settings.retentionCount);
      for (const f of toDelete) {
        unlinkSync(f.full);
        logger.info({ deleted: f.name }, 'backup_retention_pruned');
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'backup_retention_failed');
    }
  }

  async maybeRunIfDue(): Promise<{ ran: boolean; reason: string }> {
    await this.loadSettingsFromDb();
    if (!this.settings.enabled) {
      return { ran: false, reason: 'disabled' };
    }
    const destination = this.settings.destination || getDefaultDestination();
    if (this.lastRunAt) {
      const elapsedDays = (Date.now() - this.lastRunAt) / (1000 * 60 * 60 * 24);
      if (elapsedDays < this.settings.intervalDays) {
        return { ran: false, reason: `within_interval_${this.settings.intervalDays}d` };
      }
    } else {
      try {
        const files = readdirSync(destination)
          .filter((f) => (f.endsWith('.wfb') || f.endsWith('.db')) && !f.endsWith('.bak'))
          .map((f) => ({
            name: f,
            mtime: statSync(path.join(destination, f)).mtime.getTime(),
          }))
          .sort((a, b) => b.mtime - a.mtime);
        if (files.length > 0) {
          this.lastRunAt = files[0].mtime;
          const elapsedDays = (Date.now() - this.lastRunAt) / (1000 * 60 * 60 * 24);
          if (elapsedDays < this.settings.intervalDays) {
            return { ran: false, reason: 'recent_backup_exists' };
          }
        }
      } catch {}
    }
    await this.createBackup({ modules: ['NF_VIEW', 'DEPRECIATION', 'SETTINGS'] });
    return { ran: true, reason: 'scheduled' };
  }

  startScheduler(intervalHours = 6): void {
    if (this.timer) return;
    const ms = intervalHours * 60 * 60 * 1000;
    this.timer = setInterval(() => {
      this.maybeRunIfDue().catch((err) =>
        logger.error({ err: err.message }, 'backup_scheduler_error')
      );
    }, ms);
    if ((this.timer as any)?.unref) (this.timer as any).unref();
    logger.info({ intervalHours }, 'backup_scheduler_started');
  }

  stopScheduler(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async listBackups(): Promise<Array<{ filename: string; sizeBytes: number; createdAt: string; isWfb: boolean }>> {
    const destination = this.settings.destination || getDefaultDestination();
    try {
      await fs.mkdir(destination, { recursive: true });
      const files = readdirSync(destination)
        .filter((f) => (f.endsWith('.wfb') || f.endsWith('.db')) && !f.endsWith('.bak'));
      return files
        .map((f) => {
          const full = path.join(destination, f);
          const st = statSync(full);
          return {
            filename: f,
            sizeBytes: st.size,
            createdAt: st.mtime.toISOString(),
            isWfb: f.endsWith('.wfb'),
          };
        })
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    } catch {
      return [];
    }
  }
}

export const backupService = new BackupService();