import path from 'path';
import fs from 'fs';
import { INITIAL_SCHEMA_SQL } from './schema';
import initSqlJs, { SqlJsStatic } from 'sql.js';

let sqlModulePromise: Promise<SqlJsStatic> | null = null;
let sqlModule: SqlJsStatic | null = null;

export async function getSqlModule(): Promise<SqlJsStatic> {
  if (sqlModule) return sqlModule;
  if (!sqlModulePromise) sqlModulePromise = initSqlJs();
  sqlModule = await sqlModulePromise;
  return sqlModule;
}

function getDatabaseConstructor(): any {
  try {
    const mod = require('libsql');
    return typeof mod === 'function' ? mod : mod.default || mod.Database;
  } catch {
    const mod = require('@libsql/client');
    return mod.Database;
  }
}

export class DatabaseManager {
  private db: any;
  private readonly dbPath: string;

  private constructor(dbPath: string = ':memory:') {
    this.dbPath = dbPath;
    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    const Database = getDatabaseConstructor();
    this.db = new Database(dbPath);
    this.configurePragmas();
    this.initSchema();
  }

  public static async create(dbPath: string = ':memory:'): Promise<DatabaseManager> {
    return new DatabaseManager(dbPath);
  }

  private configurePragmas(): void {
    if (this.dbPath !== ':memory:') {
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('busy_timeout = 5000');
    }
    this.db.pragma('foreign_keys = ON');
  }

  public hasTable(table: string): boolean {
    return this.queryOne<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?;",
      [table]
    ) !== null;
  }

  private hasColumn(table: string, column: string): boolean {
    return this.queryAll<{ name: string }>(`PRAGMA table_info(${table});`).some((row) => row.name === column);
  }

  private getTableCount(table: string): number {
    try {
      const res = this.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM ${table};`);
      return res ? Number(res.count) : 0;
    } catch {
      return 0;
    }
  }

  private cleanupOrRecoverMigrationTables(): void {
    const handlePair = (targetTable: string, tempTable: string) => {
      const hasTarget = this.hasTable(targetTable);
      const hasTemp = this.hasTable(tempTable);
      if (!hasTemp) return;

      if (!hasTarget) {
        this.db.exec(`ALTER TABLE ${tempTable} RENAME TO ${targetTable};`);
      } else {
        const targetCount = this.getTableCount(targetTable);
        const tempCount = this.getTableCount(tempTable);
        if (targetCount === 0 && tempCount > 0) {
          this.db.exec(`DROP TABLE ${targetTable};`);
          this.db.exec(`ALTER TABLE ${tempTable} RENAME TO ${targetTable};`);
        } else {
          this.db.exec(`DROP TABLE IF EXISTS ${tempTable};`);
        }
      }
    };

    handlePair('documents', 'documents_v3');
    handlePair('documents', 'documents_v2');
    handlePair('distribution_state', 'distribution_state_v3');
    handlePair('distribution_state', 'distribution_state_v2');
  }

  private initSchema(): void {
    this.cleanupOrRecoverMigrationTables();
    this.db.exec(INITIAL_SCHEMA_SQL);
    this.runMigrations();
    try {
      this.execute(`UPDATE documents
        SET document_number = CAST(CAST(substr(access_key, 26, 9) AS INTEGER) AS TEXT),
            series = CAST(CAST(substr(access_key, 23, 3) AS INTEGER) AS TEXT)
        WHERE (document_number IS NULL OR document_number = '') AND LENGTH(access_key) = 44;`);
    } catch {}
  }

  private runMigrations(): void {
    this.cleanupOrRecoverMigrationTables();
    this.db.pragma('foreign_keys = OFF');
    try {
      if (!this.hasColumn('companies', 'uf')) {
        this.execute("ALTER TABLE companies ADD COLUMN uf TEXT DEFAULT '35';");
      }
      if (!this.hasColumn('companies', 'numeric_id')) {
        this.execute('ALTER TABLE companies ADD COLUMN numeric_id INTEGER;');
        try {
          this.execute('UPDATE companies SET numeric_id = CAST(id AS INTEGER) WHERE numeric_id IS NULL AND typeof(id) = "integer";');
          this.execute('UPDATE companies SET numeric_id = CAST(rowid AS INTEGER) WHERE numeric_id IS NULL;');
        } catch {}
        this.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_numeric_id ON companies(numeric_id);');
      }
      if (!this.hasColumn('companies', 'state')) {
        this.execute('ALTER TABLE companies ADD COLUMN state TEXT;');
      }
      if (!this.hasColumn('companies', 'trade_name')) {
        this.execute('ALTER TABLE companies ADD COLUMN trade_name TEXT;');
      }
      if (!this.hasColumn('companies', 'city')) {
        this.execute('ALTER TABLE companies ADD COLUMN city TEXT;');
      }
      this.execute(`
        CREATE TRIGGER IF NOT EXISTS trg_companies_numeric_id
        AFTER INSERT ON companies
        FOR EACH ROW
        WHEN NEW.numeric_id IS NULL
        BEGIN
          UPDATE companies
          SET numeric_id = CASE
            WHEN typeof(NEW.id) = 'integer' THEN NEW.id
            WHEN CAST(NEW.id AS INTEGER) > 0 AND CAST(NEW.id AS TEXT) = NEW.id THEN CAST(NEW.id AS INTEGER)
            ELSE (SELECT COALESCE(MAX(numeric_id), 0) + 1 FROM companies)
          END
          WHERE rowid = NEW.rowid;
        END;
      `);
      if (!this.hasColumn('certificates', 'has_private_key')) {
        this.execute('ALTER TABLE certificates ADD COLUMN has_private_key INTEGER NOT NULL DEFAULT 1;');
      }
      if (!this.hasColumn('certificates', 'extracted_cnpj')) {
        this.execute('ALTER TABLE certificates ADD COLUMN extracted_cnpj TEXT;');
      }
      if (!this.hasColumn('certificates', 'extracted_cpf')) {
        this.execute('ALTER TABLE certificates ADD COLUMN extracted_cpf TEXT;');
      }
      if (!this.hasColumn('distribution_state', 'environment')) this.migrateDistributionState();

      const documentSql = this.queryOne<{ sql: string }>(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'documents';"
      )?.sql || '';
      if (/access_key\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i.test(documentSql)) this.migrateDocuments();

      if (!this.hasColumn('query_history', 'environment')) {
        this.execute("ALTER TABLE query_history ADD COLUMN environment TEXT NOT NULL DEFAULT 'homologation';");
      }
      const distributionSql = this.queryOne<{ sql: string }>(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'distribution_state';"
      )?.sql || '';
      if (!/['\"]NFSE['\"]/.test(distributionSql)) this.migrateDistributionStateV3();

      const needsDocumentsV3 = !this.hasColumn('documents', 'environment')
        || !this.hasColumn('documents', 'origin')
        || !this.hasColumn('documents', 'content_hash');
      if (needsDocumentsV3) this.migrateDocumentsV3();

      this.createNfseEventsTable();
      this.execute("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('nfse_environment', 'homologation');");
      this.createDocumentIndexes();
      this.db.pragma('user_version = 3');
    } catch (error) {
      throw new Error(`Falha ao migrar o banco de dados: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.configurePragmas();
    }
  }

  private migrateDistributionState(): void {
    this.db.exec('DROP TABLE IF EXISTS distribution_state_v2;');
    this.db.exec(`CREATE TABLE distribution_state_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL,
      document_type TEXT NOT NULL CHECK(document_type IN ('NFE', 'CTE')),
      environment TEXT NOT NULL CHECK(environment IN ('homologation', 'production')),
      last_nsu TEXT NOT NULL DEFAULT '000000000000000', max_nsu TEXT NOT NULL DEFAULT '000000000000000',
      last_query_at TEXT, status TEXT NOT NULL DEFAULT 'IDLE' CHECK(status IN ('IDLE', 'RUNNING', 'RATE_LIMITED', 'ERROR')),
      last_error TEXT, last_cstat INTEGER, next_query_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(company_id, document_type, environment),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );`);
    this.db.exec(`INSERT INTO distribution_state_v2 (
      id, company_id, document_type, environment, last_nsu, max_nsu, last_query_at, status, last_error, created_at, updated_at
    ) SELECT id, company_id, document_type,
      COALESCE((SELECT value FROM app_settings WHERE key = 'sefaz_environment'), 'homologation'),
      last_nsu, max_nsu, last_query_at, status, last_error, created_at, updated_at FROM distribution_state;`);
    this.db.exec('DROP TABLE distribution_state;');
    this.db.exec('ALTER TABLE distribution_state_v2 RENAME TO distribution_state;');
  }

  private migrateDocuments(): void {
    this.db.exec('DROP TABLE IF EXISTS documents_v2;');
    this.db.exec(`CREATE TABLE documents_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL,
      document_type TEXT NOT NULL CHECK(document_type IN ('NFE', 'CTE')), nsu TEXT NOT NULL,
      schema_type TEXT NOT NULL, access_key TEXT NOT NULL, document_number TEXT, series TEXT, issue_date TEXT,
      received_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')), issuer_cnpj TEXT, issuer_name TEXT,
      recipient_cnpj TEXT, recipient_name TEXT, total_value REAL DEFAULT 0, xml_path TEXT, pdf_path TEXT,
      xml_status TEXT NOT NULL DEFAULT 'XML_DISPONIVEL' CHECK(xml_status IN ('XML_DISPONIVEL', 'XML_INDISPONIVEL')),
      pdf_status TEXT NOT NULL DEFAULT 'PDF_INDISPONIVEL' CHECK(pdf_status IN ('PDF_DISPONIVEL', 'PDF_INDISPONIVEL')),
      situacao_fiscal TEXT DEFAULT 'AUTORIZADA' CHECK(situacao_fiscal IN ('AUTORIZADA', 'CANCELADA', 'DENEGADA')),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(company_id, access_key), FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );`);
    this.db.exec('INSERT INTO documents_v2 SELECT * FROM documents;');
    this.db.exec('DROP TABLE documents;');
    this.db.exec('ALTER TABLE documents_v2 RENAME TO documents;');
  }

  private migrateDistributionStateV3(): void {
    this.db.exec('DROP TABLE IF EXISTS distribution_state_v3;');
    this.db.exec(`CREATE TABLE distribution_state_v3 (
      id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL,
      document_type TEXT NOT NULL CHECK(document_type IN ('NFE', 'CTE', 'NFSE')),
      environment TEXT NOT NULL CHECK(environment IN ('homologation', 'production')),
      last_nsu TEXT NOT NULL DEFAULT '000000000000000', max_nsu TEXT NOT NULL DEFAULT '000000000000000',
      last_query_at TEXT, status TEXT NOT NULL DEFAULT 'IDLE' CHECK(status IN ('IDLE', 'RUNNING', 'RATE_LIMITED', 'ERROR')),
      last_error TEXT, last_cstat INTEGER, next_query_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(company_id, document_type, environment),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );`);
    this.db.exec(`INSERT INTO distribution_state_v3 (
      id, company_id, document_type, environment, last_nsu, max_nsu, last_query_at,
      status, last_error, last_cstat, next_query_at, created_at, updated_at
    ) SELECT id, company_id, document_type, environment, last_nsu, max_nsu, last_query_at,
      status, last_error, last_cstat, next_query_at, created_at, updated_at FROM distribution_state;`);
    this.db.exec('DROP TABLE distribution_state;');
    this.db.exec('ALTER TABLE distribution_state_v3 RENAME TO distribution_state;');
  }

  private migrateDocumentsV3(): void {
    const legacyEnvironment = this.queryOne<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = 'sefaz_environment';"
    )?.value === 'production' ? 'production' : 'homologation';

    this.db.exec('DROP TABLE IF EXISTS documents_v3;');
    this.db.exec(`CREATE TABLE documents_v3 (
      id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL,
      document_type TEXT NOT NULL CHECK(document_type IN ('NFE', 'CTE', 'NFSE')),
      environment TEXT NOT NULL CHECK(environment IN ('homologation', 'production')),
      origin TEXT NOT NULL CHECK(origin IN ('SEFAZ_DISTRIBUTION', 'NFSE_ADN_DISTRIBUTION', 'NFSE_SEFIN_DIRECT')),
      nsu TEXT NOT NULL, schema_type TEXT NOT NULL, access_key TEXT NOT NULL, content_hash TEXT,
      document_number TEXT, series TEXT, issue_date TEXT,
      received_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')), issuer_cnpj TEXT, issuer_name TEXT,
      recipient_cnpj TEXT, recipient_name TEXT, total_value REAL DEFAULT 0, xml_path TEXT, pdf_path TEXT,
      xml_status TEXT NOT NULL DEFAULT 'XML_DISPONIVEL' CHECK(xml_status IN ('XML_DISPONIVEL', 'XML_INDISPONIVEL')),
      pdf_status TEXT NOT NULL DEFAULT 'PDF_INDISPONIVEL' CHECK(pdf_status IN ('PDF_DISPONIVEL', 'PDF_INDISPONIVEL')),
      situacao_fiscal TEXT DEFAULT 'AUTORIZADA' CHECK(situacao_fiscal IN ('AUTORIZADA', 'CANCELADA', 'DENEGADA')),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(company_id, document_type, environment, access_key),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );`);
    this.execute(`INSERT INTO documents_v3 (
      id, company_id, document_type, environment, origin, nsu, schema_type, access_key, content_hash,
      document_number, series, issue_date, received_at, issuer_cnpj, issuer_name,
      recipient_cnpj, recipient_name, total_value, xml_path, pdf_path, xml_status, pdf_status,
      situacao_fiscal, created_at, updated_at
    ) SELECT id, company_id, document_type, ?, 'SEFAZ_DISTRIBUTION', nsu, schema_type, access_key, NULL,
      document_number, series, issue_date, received_at, issuer_cnpj, issuer_name,
      recipient_cnpj, recipient_name, total_value, xml_path, pdf_path, xml_status, pdf_status,
      situacao_fiscal, created_at, updated_at FROM documents;`, [legacyEnvironment]);
    this.db.exec('DROP TABLE documents;');
    this.db.exec('ALTER TABLE documents_v3 RENAME TO documents;');
  }

  private createNfseEventsTable(): void {
    this.db.exec(`CREATE TABLE IF NOT EXISTS nfse_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      document_id INTEGER,
      environment TEXT NOT NULL CHECK(environment IN ('homologation', 'production')),
      access_key TEXT NOT NULL,
      nsu TEXT,
      event_identifier TEXT,
      event_type TEXT NOT NULL,
      event_sequence INTEGER,
      event_date TEXT,
      schema_type TEXT NOT NULL,
      xml_path TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
    );`);
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_nfse_events_document ON nfse_events(document_id);');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_nfse_events_key ON nfse_events(company_id, environment, access_key);');
    this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_nfse_events_hash
      ON nfse_events(company_id, environment, content_hash);`);
    this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_nfse_events_identifier
      ON nfse_events(company_id, environment, event_identifier) WHERE event_identifier IS NOT NULL;`);
  }

  private createDocumentIndexes(): void {
    const statements = [
      'DROP INDEX IF EXISTS idx_docs_company_access_key;',
      'CREATE INDEX IF NOT EXISTS idx_docs_company_id ON documents(company_id);',
      'CREATE INDEX IF NOT EXISTS idx_docs_access_key ON documents(access_key);',
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_docs_identity
        ON documents(company_id, document_type, environment, access_key);`,
      'CREATE INDEX IF NOT EXISTS idx_docs_nsu ON documents(nsu);',
      'CREATE INDEX IF NOT EXISTS idx_docs_issue_date ON documents(issue_date);',
      'CREATE INDEX IF NOT EXISTS idx_docs_issuer_cnpj ON documents(issuer_cnpj);',
      'CREATE INDEX IF NOT EXISTS idx_docs_recipient_cnpj ON documents(recipient_cnpj);',
      'CREATE INDEX IF NOT EXISTS idx_docs_document_type ON documents(document_type);',
    ];
    for (const statement of statements) this.db.exec(statement);
  }

  public queryAll<T = unknown>(sql: string, params: unknown[] = []): T[] {
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && typeof rows[i] === 'object' && '_metadata' in rows[i]) {
        delete rows[i]._metadata;
      }
    }
    return rows as T[];
  }

  public queryOne<T = unknown>(sql: string, params: unknown[] = []): T | null {
    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params) as any;
    if (!result) return null;
    if (typeof result === 'object' && '_metadata' in result) {
      delete result._metadata;
    }
    return result as T;
  }

  public execute(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    };
  }

  public transaction<T>(callback: () => T): T {
    const tx = this.db.transaction(() => callback());
    return tx();
  }

  public close(): void {
    try {
      this.db.close();
    } catch {}
  }
}

let defaultInstance: DatabaseManager | null = null;

export async function getDatabase(customPath?: string): Promise<DatabaseManager> {
  if (!defaultInstance || customPath) {
    const instance = await DatabaseManager.create(customPath || path.resolve(process.cwd(), 'data', 'fiscal_storage.db'));
    if (!customPath) defaultInstance = instance;
    return instance;
  }
  return defaultInstance;
}
