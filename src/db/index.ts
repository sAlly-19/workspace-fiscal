import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import fs from 'fs';
import path from 'path';
import { logger } from '../api/utils/logger';
import * as schema from './schema';

function resolveDbPath(): string {
  // Em Electron, usa userData para persistência correta quando empacotado.
  // IMPORTANT: Electron só está pronto para `app.getPath()` após `app.whenReady()`.
  // Aqui apenas capturamos o caminho; a inicialização do DB em si é feita por
  // `initDatabase()` (chamado após app ready em Electron, ou no startup do web).
  try {
    const electron = require('electron');
    const app = electron?.app;
    if (app && typeof app.getPath === 'function' && app.isReady()) {
      const userData = app.getPath('userData');
      if (userData) {
        return getRenamedUserDataDbPath(userData);
      }
    }
  } catch {}
  // Fallback: variável de ambiente ou cwd (dev/web)
  if (process.env.NFVIEW_DB_PATH) return path.resolve(process.env.NFVIEW_DB_PATH);
  return path.resolve(process.cwd(), 'sqlite.db');
}

function getRenamedUserDataDbPath(userData: string): string {
  const oldPath = path.join(userData, 'nfview.sqlite');
  const newPath = path.join(userData, 'workspace-fiscal.sqlite');
  try {
    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
      fs.renameSync(oldPath, newPath);
      for (const suffix of ['-wal', '-shm', '-journal']) {
        const oldAux = oldPath + suffix;
        const newAux = newPath + suffix;
        if (fs.existsSync(oldAux) && !fs.existsSync(newAux)) {
          try {
            fs.renameSync(oldAux, newAux);
          } catch {}
        }
      }
      logger.info({ from: oldPath, to: newPath }, 'database_migrated_filename');
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'database_filename_migration_failed');
  }
  return newPath;
}

export let DB_PATH: string = resolveDbPath();

function getStorageBasePath(): string {
  try {
    const electron = require('electron');
    const app = electron?.app;
    if (app && typeof app.getPath === 'function' && app.isReady()) {
      return path.join(app.getPath('userData'), 'storage');
    }
  } catch {}
  return path.join(process.cwd(), 'storage');
}

export function getStoragePath(): string {
  return getStorageBasePath();
}

function createDbClient(): Client {
  return createClient({
    url: `file:${DB_PATH}`,
  });
}

/**
 * Move arquivos do DB para `.corrupt.<ts>.bak` mas **NÃO** deleta.
 * O Electron app (no próximo startup) deve ser capaz de recuperar do backup.
 * Esta função NÃO toca nos backups — apenas os cria. O caller decide se apaga.
 */
function backupCorruptedDbFiles(): string[] {
  const filesToBackup = [
    DB_PATH,
    `${DB_PATH}-wal`,
    `${DB_PATH}-shm`,
    `${DB_PATH}-journal`,
  ];
  const backups: string[] = [];
  for (const f of filesToBackup) {
    try {
      if (fs.existsSync(f)) {
        const backup = `${f}.corrupt.${Date.now()}.bak`;
        try {
          fs.renameSync(f, backup);
          backups.push(backup);
          logger.warn({ file: f, backup }, 'database_corrupted_file_backed_up');
        } catch (err) {
          logger.error(
            { file: f, err: (err as Error).message },
            'database_corrupted_backup_failed'
          );
        }
      }
    } catch (err) {
      logger.error({ file: f, err: (err as Error).message }, 'database_corrupted_file_check_failed');
    }
  }
  return backups;
}

export let rawClient: Client;

try {
  rawClient = createDbClient();
} catch (err) {
  logger.error({ err: (err as Error).message }, 'database_open_failed_attempting_reset');
  backupCorruptedDbFiles();
  rawClient = createDbClient();
}

export let db = drizzle(rawClient, { schema });

export function reconfigureDatabase(customPath?: string): void {
  const newPath = customPath || resolveDbPath();
  DB_PATH = newPath;
  try {
    rawClient = createDbClient();
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'database_reconfigure_open_failed');
    backupCorruptedDbFiles();
    rawClient = createDbClient();
  }
  db = drizzle(rawClient, { schema });
}

export async function initDatabase(customPath?: string) {
  try {
    reconfigureDatabase(customPath);

    // 1. Check database integrity. Se falhar, faz backup e cria novo — mas
    //    PRESERVA os arquivos originais (`.corrupt.<ts>.bak`) para recuperação.
    try {
      const integrity = await rawClient.execute('PRAGMA integrity_check;');
      const integrityResult = integrity.rows?.[0]?.[0] ?? (integrity.rows?.[0] as any)?.integrity_check;
      if (integrityResult !== 'ok') {
        throw new Error(`Integrity check failed: ${JSON.stringify(integrity.rows)}`);
      }
    } catch (integrityErr: any) {
      logger.error(
        { err: integrityErr?.message || String(integrityErr) },
        'database_corruption_detected_recovering'
      );
      const backups = backupCorruptedDbFiles();
      if (backups.length > 0) {
        logger.warn(
          { backups },
          'database_corruption_backups_available_for_manual_recovery'
        );
      }
      rawClient = createDbClient();
      db = drizzle(rawClient, { schema });
    }

    // 2. Configure performance & durability pragmas.
    //    Em PRODUÇÃO, usar synchronous=FULL para sobreviver a quedas de energia
    //    (crítico para dados fiscais). Em dev, manter NORMAL para velocidade.
    const isProd = process.env.NODE_ENV === 'production';
    await rawClient.execute('PRAGMA journal_mode = WAL;');
    await rawClient.execute(`PRAGMA synchronous = ${isProd ? 'FULL' : 'NORMAL'};`);
    await rawClient.execute('PRAGMA busy_timeout = 5000;');
    await rawClient.execute('PRAGMA foreign_keys = ON;');

    // 3. Auto-create tables if they don't exist
    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS "application_settings" (
        "key" TEXT PRIMARY KEY NOT NULL,
        "value" TEXT NOT NULL,
        "updated_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
      );
    `);

    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS "companies" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "name" TEXT NOT NULL,
        "document" TEXT,
        "created_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
        "updated_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
      );
    `);

    // Migrations for companies new columns
    try {
      const compInfo = await rawClient.execute('PRAGMA table_info(companies);');
      const compCols = compInfo.rows.map((r: any) => r.name || r[1]);
      if (!compCols.includes('trade_name')) await rawClient.execute('ALTER TABLE "companies" ADD COLUMN "trade_name" TEXT;');
      if (!compCols.includes('cnpj')) await rawClient.execute('ALTER TABLE "companies" ADD COLUMN "cnpj" TEXT;');
      if (!compCols.includes('state')) await rawClient.execute('ALTER TABLE "companies" ADD COLUMN "state" TEXT;');
      if (!compCols.includes('city')) await rawClient.execute('ALTER TABLE "companies" ADD COLUMN "city" TEXT;');
      if (!compCols.includes('depreciation_rule')) await rawClient.execute(`ALTER TABLE "companies" ADD COLUMN "depreciation_rule" TEXT DEFAULT 'PROPORTIONAL';`);
    } catch (e) {
      logger.warn({ err: (e as Error).message }, 'database_companies_migration_note');
    }

    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS "folders" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "name" TEXT NOT NULL,
        "parent_id" TEXT,
        "created_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
        "updated_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
      );
    `);

    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS "batches" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "name" TEXT NOT NULL,
        "folder_id" TEXT REFERENCES "folders"("id"),
        "created_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
        "updated_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
      );
    `);

    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS "import_jobs" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "status" TEXT NOT NULL,
        "total_files" INTEGER DEFAULT 0 NOT NULL,
        "processed_files" INTEGER DEFAULT 0 NOT NULL,
        "created_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
        "updated_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
      );
    `);

    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "type" TEXT NOT NULL,
        "access_key" TEXT,
        "number" TEXT,
        "series" TEXT,
        "issue_date" INTEGER,
        "status" TEXT NOT NULL,
        "issuer_name" TEXT,
        "issuer_document" TEXT,
        "recipient_name" TEXT,
        "recipient_document" TEXT,
        "total_amount" REAL,
        "billing" TEXT,
        "raw_xml_path" TEXT NOT NULL,
        "batch_id" TEXT REFERENCES "folders"("id") ON DELETE SET NULL,
        "import_job_id" TEXT REFERENCES "import_jobs"("id") ON DELETE SET NULL,
        "created_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
        "updated_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
      );
    `);

    // Dynamic Column Migrations
    try {
      const tableInfo = await rawClient.execute('PRAGMA table_info(documents);');
      const columns = tableInfo.rows.map((row: any) => row.name || row[1]);
      if (!columns.includes('billing')) {
        await rawClient.execute('ALTER TABLE "documents" ADD COLUMN "billing" TEXT;');
        logger.info({ table: 'documents', column: 'billing' }, 'database_column_migrated');
      }
    } catch (migErr) {
      logger.warn({ err: (migErr as Error).message }, 'database_documents_migration_note');
    }

    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS "document_items" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "document_id" TEXT NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
        "code" TEXT,
        "description" TEXT NOT NULL,
        "quantity" REAL NOT NULL,
        "unit_price" REAL NOT NULL,
        "total_price" REAL NOT NULL,
        "cfop" TEXT,
        "ncm" TEXT,
        "unit" TEXT
      );
    `);

    try {
      const itemsInfo = await rawClient.execute('PRAGMA table_info(document_items);');
      const itemCols = itemsInfo.rows.map((r: any) => r.name || r[1]);
      if (!itemCols.includes('cfop')) await rawClient.execute('ALTER TABLE "document_items" ADD COLUMN "cfop" TEXT;');
      if (!itemCols.includes('ncm')) await rawClient.execute('ALTER TABLE "document_items" ADD COLUMN "ncm" TEXT;');
      if (!itemCols.includes('unit')) await rawClient.execute('ALTER TABLE "document_items" ADD COLUMN "unit" TEXT;');
    } catch (migErr) {
      logger.warn({ err: (migErr as Error).message }, 'database_items_migration_note');
    }

    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS "document_taxes" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "document_id" TEXT NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
        "tax_type" TEXT NOT NULL,
        "amount" REAL NOT NULL,
        "base" REAL,
        "rate" REAL
      );
    `);

    try {
      const taxesInfo = await rawClient.execute('PRAGMA table_info(document_taxes);');
      const taxCols = taxesInfo.rows.map((r: any) => r.name || r[1]);
      if (!taxCols.includes('rate')) await rawClient.execute('ALTER TABLE "document_taxes" ADD COLUMN "rate" REAL;');
    } catch (migErr) {
      logger.warn({ err: (migErr as Error).message }, 'database_taxes_migration_note');
    }

    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS "document_events" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "document_id" TEXT NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
        "event_type" TEXT NOT NULL,
        "sequence" INTEGER NOT NULL DEFAULT 1,
        "event_date" INTEGER,
        "protocol" TEXT,
        "raw_xml_path" TEXT,
        "correction_text" TEXT,
        "created_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
      );
    `);
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_events_document" ON "document_events"("document_id");');

    // --- Depreciação: Categorias, Bens, Lançamentos e Exportações ---
    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "company_id" TEXT REFERENCES "companies"("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "default_rate" REAL NOT NULL,
        "created_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
      );
    `);

    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS "assets" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "company_id" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
        "supplier" TEXT NOT NULL,
        "acquisition_date" INTEGER NOT NULL,
        "document_number" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "acquisition_value" INTEGER NOT NULL,
        "ncm" TEXT,
        "category_id" TEXT REFERENCES "categories"("id") ON DELETE SET NULL,
        "category_name" TEXT,
        "annual_rate" REAL NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "disposed_at" INTEGER,
        "disposed_reason" TEXT,
        "created_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
        "updated_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
      );
    `);

    // Migration for assets dar baixa columns
    try {
      const assetInfo = await rawClient.execute('PRAGMA table_info(assets);');
      const assetCols = assetInfo.rows.map((r: any) => r.name || r[1]);
      if (!assetCols.includes('status')) await rawClient.execute(`ALTER TABLE "assets" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';`);
      if (!assetCols.includes('disposed_at')) await rawClient.execute(`ALTER TABLE "assets" ADD COLUMN "disposed_at" INTEGER;`);
      if (!assetCols.includes('disposed_reason')) await rawClient.execute(`ALTER TABLE "assets" ADD COLUMN "disposed_reason" TEXT;`);
    } catch (e) {
      logger.warn({ err: (e as Error).message }, 'database_assets_migration_note');
    }

    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS "depreciation_entries" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "asset_id" TEXT NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
        "competence" TEXT NOT NULL,
        "depreciation_value" INTEGER NOT NULL,
        "accumulated_value" INTEGER NOT NULL,
        "current_value" INTEGER NOT NULL,
        "exported" INTEGER DEFAULT 0 NOT NULL,
        "exported_at" INTEGER,
        "created_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
      );
    `);

    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS "depreciation_exports" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "company_id" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
        "competence" TEXT NOT NULL,
        "filename" TEXT NOT NULL,
        "generated_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
        "total_value" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'EXPORTED',
        "created_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
      );
    `);

    // Seed de categorias padrão (globais, company_id NULL) se vazio
    try {
      const catCount = await rawClient.execute('SELECT COUNT(*) as c FROM "categories";');
      const countVal = (catCount.rows[0] as any)?.c ?? (catCount.rows[0] as any)?.[0] ?? 0;
      if (Number(countVal) === 0) {
        const defaultCats: Array<[string, number]> = [
          ['Máquinas e Equipamentos', 10],
          ['Computadores e Periféricos', 20],
          ['Móveis e Utensílios', 10],
          ['Veículos', 20],
          ['Instalações', 10],
          ['Edificações', 4],
          ['Ferramentas', 10],
          ['Outros', 10],
        ];
        for (const [name, rate] of defaultCats) {
          const id = `cat_default_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
          await rawClient.execute({
            sql: 'INSERT OR IGNORE INTO "categories" ("id", "name", "default_rate") VALUES (?, ?, ?);',
            args: [id, name, rate],
          });
        }
        logger.info({ count: defaultCats.length }, 'database_seeded_default_categories');
      }
    } catch (e) {
      logger.warn({ err: (e as Error).message }, 'database_categories_seed_note');
    }

    // 4. Create indexes
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_folders_parent" ON "folders"("parent_id");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_batches_folder" ON "batches"("folder_id");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_docs_batch" ON "documents"("batch_id");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_docs_access_key" ON "documents"("access_key");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_docs_type" ON "documents"("type");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_docs_issuer" ON "documents"("issuer_document");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_docs_number" ON "documents"("number");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_items_document" ON "document_items"("document_id");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_taxes_document" ON "document_taxes"("document_id");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_categories_company" ON "categories"("company_id");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_assets_company" ON "assets"("company_id");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_assets_category" ON "assets"("category_id");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_assets_status" ON "assets"("status");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_dep_asset" ON "depreciation_entries"("asset_id");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_dep_competence" ON "depreciation_entries"("competence");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_dep_asset_comp" ON "depreciation_entries"("asset_id", "competence");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_exports_company" ON "depreciation_exports"("company_id");');
    await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_exports_comp" ON "depreciation_exports"("competence");');

    logger.info({ path: DB_PATH }, 'database_initialized');
  } catch (error) {
    logger.error({ err: (error as Error).message }, 'database_init_critical_error');
  }
}
