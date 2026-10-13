import { Client } from '@libsql/client';
import { logger } from '../api/utils/logger';

export async function initSchemaAndMigrations(rawClient: Client): Promise<void> {
  // 1. Auto-create tables if they don't exist
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
    if (!compCols.includes('numeric_id')) await rawClient.execute('ALTER TABLE "companies" ADD COLUMN "numeric_id" INTEGER;');
    if (!compCols.includes('uf')) await rawClient.execute(`ALTER TABLE "companies" ADD COLUMN "uf" TEXT DEFAULT '35';`);
    if (!compCols.includes('state')) await rawClient.execute('ALTER TABLE "companies" ADD COLUMN "state" TEXT;');
    if (!compCols.includes('city')) await rawClient.execute('ALTER TABLE "companies" ADD COLUMN "city" TEXT;');
    if (!compCols.includes('folder_path')) await rawClient.execute('ALTER TABLE "companies" ADD COLUMN "folder_path" TEXT;');
    if (!compCols.includes('is_active')) await rawClient.execute('ALTER TABLE "companies" ADD COLUMN "is_active" INTEGER DEFAULT 0;');
    if (!compCols.includes('depreciation_rule')) await rawClient.execute(`ALTER TABLE "companies" ADD COLUMN "depreciation_rule" TEXT DEFAULT 'PROPORTIONAL';`);

    // Backfill numeric_id for existing companies
    const nullNumeric = await rawClient.execute('SELECT id FROM "companies" WHERE "numeric_id" IS NULL ORDER BY "created_at" ASC;');
    for (let i = 0; i < nullNumeric.rows.length; i++) {
      const rowId = (nullNumeric.rows[i] as any)?.id || (nullNumeric.rows[i] as any)?.[0];
      await rawClient.execute({
        sql: 'UPDATE "companies" SET "numeric_id" = (SELECT COALESCE(MAX("numeric_id"), 0) + 1 FROM "companies") WHERE "id" = ?;',
        args: [rowId],
      });
    }

    await rawClient.execute('CREATE UNIQUE INDEX IF NOT EXISTS "idx_companies_numeric_id" ON "companies"("numeric_id");');
    await rawClient.execute('CREATE UNIQUE INDEX IF NOT EXISTS "idx_companies_cnpj" ON "companies"("cnpj") WHERE "cnpj" IS NOT NULL AND "cnpj" != \'\';');
    await rawClient.execute(`
      CREATE TRIGGER IF NOT EXISTS "trg_companies_numeric_id"
      AFTER INSERT ON "companies"
      FOR EACH ROW
      WHEN NEW.numeric_id IS NULL
      BEGIN
        UPDATE "companies"
        SET numeric_id = (SELECT COALESCE(MAX(numeric_id), 0) + 1 FROM "companies")
        WHERE id = NEW.id;
      END;
    `);
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

  // Dynamic Column Migrations for documents
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

  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS "activity_logs" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "timestamp" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
      "level" TEXT NOT NULL,
      "module" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "details" TEXT,
      "duration_ms" INTEGER,
      "created_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
    );
  `);

  // 2. Create indexes
  await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_activity_logs_timestamp" ON "activity_logs"("timestamp");');
  await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_activity_logs_module" ON "activity_logs"("module");');
  await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_activity_logs_level" ON "activity_logs"("level");');
  await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_activity_logs_action" ON "activity_logs"("action");');
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

  // --- Buscador SEFAZ & NFS-e Tables ---
  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS "certificates" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "company_id" INTEGER NOT NULL UNIQUE,
      "subject" TEXT NOT NULL,
      "issuer" TEXT NOT NULL,
      "serial_number" TEXT,
      "thumbprint" TEXT NOT NULL,
      "valid_from" TEXT NOT NULL,
      "valid_to" TEXT NOT NULL,
      "provider" TEXT NOT NULL DEFAULT 'windows_store',
      "has_private_key" INTEGER NOT NULL DEFAULT 1,
      "extracted_cnpj" TEXT,
      "extracted_cpf" TEXT,
      "created_at" TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      "updated_at" TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY ("company_id") REFERENCES "companies"("numeric_id") ON DELETE CASCADE
    );
  `);

  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS "distribution_state" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "company_id" INTEGER NOT NULL,
      "document_type" TEXT NOT NULL CHECK(document_type IN ('NFE', 'CTE', 'NFSE')),
      "environment" TEXT NOT NULL DEFAULT 'homologation' CHECK(environment IN ('homologation', 'production')),
      "last_nsu" TEXT NOT NULL DEFAULT '000000000000000',
      "max_nsu" TEXT NOT NULL DEFAULT '000000000000000',
      "last_query_at" TEXT,
      "status" TEXT NOT NULL DEFAULT 'IDLE' CHECK(status IN ('IDLE', 'RUNNING', 'RATE_LIMITED', 'ERROR')),
      "last_error" TEXT,
      "last_cstat" INTEGER,
      "next_query_at" TEXT,
      "created_at" TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      "updated_at" TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE("company_id", "document_type", "environment"),
      FOREIGN KEY ("company_id") REFERENCES "companies"("numeric_id") ON DELETE CASCADE
    );
  `);

  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS "buscador_documents" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "company_id" INTEGER NOT NULL,
      "document_type" TEXT NOT NULL CHECK(document_type IN ('NFE', 'CTE', 'NFSE')),
      "environment" TEXT NOT NULL DEFAULT 'homologation' CHECK(environment IN ('homologation', 'production')),
      "origin" TEXT NOT NULL DEFAULT 'SEFAZ_DISTRIBUTION' CHECK(origin IN ('SEFAZ_DISTRIBUTION', 'NFSE_ADN_DISTRIBUTION', 'NFSE_SEFIN_DIRECT')),
      "nsu" TEXT NOT NULL,
      "schema_type" TEXT NOT NULL,
      "access_key" TEXT NOT NULL,
      "content_hash" TEXT,
      "document_number" TEXT,
      "series" TEXT,
      "issue_date" TEXT,
      "received_at" TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      "issuer_cnpj" TEXT,
      "issuer_name" TEXT,
      "recipient_cnpj" TEXT,
      "recipient_name" TEXT,
      "total_value" REAL DEFAULT 0,
      "xml_path" TEXT,
      "pdf_path" TEXT,
      "xml_status" TEXT NOT NULL DEFAULT 'XML_DISPONIVEL' CHECK(xml_status IN ('XML_DISPONIVEL', 'XML_INDISPONIVEL')),
      "pdf_status" TEXT NOT NULL DEFAULT 'PDF_INDISPONIVEL' CHECK(pdf_status IN ('PDF_DISPONIVEL', 'PDF_INDISPONIVEL')),
      "situacao_fiscal" TEXT DEFAULT 'AUTORIZADA' CHECK(situacao_fiscal IN ('AUTORIZADA', 'CANCELADA', 'DENEGADA')),
      "created_at" TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      "updated_at" TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE("company_id", "document_type", "environment", "access_key"),
      FOREIGN KEY ("company_id") REFERENCES "companies"("numeric_id") ON DELETE CASCADE
    );
  `);
  await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_bdocs_company" ON "buscador_documents"("company_id");');
  await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_bdocs_key" ON "buscador_documents"("access_key");');
  await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_bdocs_type" ON "buscador_documents"("document_type");');
  await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_bdocs_nsu" ON "buscador_documents"("nsu");');

  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS "nfse_events" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "company_id" INTEGER NOT NULL,
      "document_id" INTEGER,
      "environment" TEXT NOT NULL CHECK(environment IN ('homologation', 'production')),
      "access_key" TEXT NOT NULL,
      "nsu" TEXT,
      "event_identifier" TEXT,
      "event_type" TEXT NOT NULL,
      "event_sequence" INTEGER,
      "event_date" TEXT,
      "schema_type" TEXT NOT NULL,
      "xml_path" TEXT NOT NULL,
      "content_hash" TEXT NOT NULL,
      "created_at" TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      "updated_at" TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY ("company_id") REFERENCES "companies"("numeric_id") ON DELETE CASCADE,
      FOREIGN KEY ("document_id") REFERENCES "buscador_documents"("id") ON DELETE SET NULL
    );
  `);
  await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_nfse_events_doc" ON "nfse_events"("document_id");');
  await rawClient.execute('CREATE INDEX IF NOT EXISTS "idx_nfse_events_access" ON "nfse_events"("company_id", "environment", "access_key");');

  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS "query_history" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "company_id" INTEGER NOT NULL,
      "document_type" TEXT NOT NULL,
      "started_at" TEXT NOT NULL,
      "finished_at" TEXT NOT NULL,
      "last_nsu_before" TEXT NOT NULL,
      "last_nsu_after" TEXT NOT NULL,
      "documents_received" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL,
      "error_message" TEXT,
      "environment" TEXT NOT NULL DEFAULT 'homologation',
      FOREIGN KEY ("company_id") REFERENCES "companies"("numeric_id") ON DELETE CASCADE
    );
  `);

  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS "download_history" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "document_id" INTEGER,
      "download_type" TEXT NOT NULL CHECK(download_type IN ('XML', 'PDF', 'ZIP')),
      "destination_path" TEXT NOT NULL,
      "downloaded_at" TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      "success" INTEGER NOT NULL DEFAULT 1,
      "error_message" TEXT,
      FOREIGN KEY ("document_id") REFERENCES "buscador_documents"("id") ON DELETE SET NULL
    );
  `);

  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS "app_settings" (
      "key" TEXT PRIMARY KEY NOT NULL,
      "value" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  await rawClient.execute(`
    INSERT OR IGNORE INTO "app_settings" ("key", "value") VALUES 
    ('default_storage_path', ''),
    ('sefaz_environment', 'homologation'),
    ('nfse_environment', 'homologation'),
    ('items_per_page', '50'),
    ('log_level', 'info');
  `);
}

