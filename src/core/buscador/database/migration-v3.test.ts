import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseManager, getSqlModule } from './connection';

const temporaryDirectories: string[] = [];

function temporaryDatabasePath(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-fiscal-migration-v3-'));
  temporaryDirectories.push(directory);
  return path.join(directory, 'fiscal_storage.db');
}

async function createVersion2Database(dbPath: string): Promise<void> {
  const SQL = await getSqlModule();
  const db = new SQL.Database();
  db.run(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cnpj TEXT NOT NULL UNIQUE,
      uf TEXT DEFAULT '35',
      folder_path TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE TABLE distribution_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      document_type TEXT NOT NULL CHECK(document_type IN ('NFE', 'CTE')),
      environment TEXT NOT NULL DEFAULT 'homologation' CHECK(environment IN ('homologation', 'production')),
      last_nsu TEXT NOT NULL DEFAULT '000000000000000',
      max_nsu TEXT NOT NULL DEFAULT '000000000000000',
      last_query_at TEXT,
      status TEXT NOT NULL DEFAULT 'IDLE' CHECK(status IN ('IDLE', 'RUNNING', 'RATE_LIMITED', 'ERROR')),
      last_error TEXT,
      last_cstat INTEGER,
      next_query_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(company_id, document_type, environment)
    );
    CREATE TABLE documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      document_type TEXT NOT NULL CHECK(document_type IN ('NFE', 'CTE')),
      nsu TEXT NOT NULL,
      schema_type TEXT NOT NULL,
      access_key TEXT NOT NULL,
      document_number TEXT,
      series TEXT,
      issue_date TEXT,
      received_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      issuer_cnpj TEXT,
      issuer_name TEXT,
      recipient_cnpj TEXT,
      recipient_name TEXT,
      total_value REAL DEFAULT 0,
      xml_path TEXT,
      pdf_path TEXT,
      xml_status TEXT NOT NULL DEFAULT 'XML_DISPONIVEL',
      pdf_status TEXT NOT NULL DEFAULT 'PDF_INDISPONIVEL',
      situacao_fiscal TEXT DEFAULT 'AUTORIZADA',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE UNIQUE INDEX idx_docs_company_access_key ON documents(company_id, access_key);
    CREATE TABLE app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    INSERT INTO app_settings (key, value) VALUES ('sefaz_environment', 'production');
    INSERT INTO companies (id, name, cnpj, is_active) VALUES (1, 'Empresa Legada', '12345678000190', 1);
    INSERT INTO distribution_state (
      company_id, document_type, environment, last_nsu, max_nsu, status
    ) VALUES
      (1, 'NFE', 'production', '000000000000123', '000000000000456', 'IDLE'),
      (1, 'CTE', 'homologation', '000000000000007', '000000000000009', 'ERROR');
    INSERT INTO documents (
      company_id, document_type, nsu, schema_type, access_key, document_number,
      xml_path, xml_status, pdf_status, situacao_fiscal
    ) VALUES
      (1, 'NFE', '000000000000123', 'procNFe_v4.00', '${'1'.repeat(44)}', '101', 'C:/xml/nfe.xml', 'XML_DISPONIVEL', 'PDF_INDISPONIVEL', 'AUTORIZADA'),
      (1, 'CTE', '000000000000007', 'procCTe_v4.00', '${'2'.repeat(44)}', '202', 'C:/xml/cte.xml', 'XML_DISPONIVEL', 'PDF_INDISPONIVEL', 'CANCELADA');
    PRAGMA user_version = 2;
  `);
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  db.close();
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('database migration v2 to v3', () => {
  it('preserves legacy documents and distribution cursors while adding NFSE schema', async () => {
    const dbPath = temporaryDatabasePath();
    await createVersion2Database(dbPath);

    const db = await DatabaseManager.create(dbPath);

    expect(db.queryOne<{ user_version: number }>('PRAGMA user_version;')?.user_version).toBe(3);
    expect(db.queryAll<{ document_type: string; access_key: string; environment: string; origin: string }>(
      'SELECT document_type, access_key, environment, origin FROM documents ORDER BY id;'
    )).toEqual([
      {
        document_type: 'NFE',
        access_key: '1'.repeat(44),
        environment: 'production',
        origin: 'SEFAZ_DISTRIBUTION',
      },
      {
        document_type: 'CTE',
        access_key: '2'.repeat(44),
        environment: 'production',
        origin: 'SEFAZ_DISTRIBUTION',
      },
    ]);
    expect(db.queryAll<{ document_type: string; environment: string; last_nsu: string }>(
      'SELECT document_type, environment, last_nsu FROM distribution_state ORDER BY document_type DESC;'
    )).toEqual([
      { document_type: 'NFE', environment: 'production', last_nsu: '000000000000123' },
      { document_type: 'CTE', environment: 'homologation', last_nsu: '000000000000007' },
    ]);

    const documentColumns = db.queryAll<{ name: string }>('PRAGMA table_info(documents);').map((row) => row.name);
    expect(documentColumns).toEqual(expect.arrayContaining(['environment', 'origin', 'content_hash']));
    expect(db.queryOne<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'nfse_events';"
    )?.name).toBe('nfse_events');
    expect(db.queryOne<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = 'nfse_environment';"
    )?.value).toBe('homologation');

    expect(() => db.execute(
      `INSERT INTO distribution_state (company_id, document_type, environment, last_nsu, max_nsu, status)
       VALUES (1, 'NFSE', 'homologation', '0', '0', 'IDLE');`
    )).not.toThrow();
    expect(() => db.execute(
      `INSERT INTO documents (
        company_id, document_type, environment, origin, nsu, schema_type, access_key,
        content_hash, xml_status, pdf_status, situacao_fiscal
      ) VALUES (1, 'NFSE', 'homologation', 'NFSE_ADN_DISTRIBUTION', '1', 'NFSe_v1.01', ?, ?,
        'XML_DISPONIVEL', 'PDF_INDISPONIVEL', 'AUTORIZADA');`,
      ['3'.repeat(50), 'hash-nfse']
    )).not.toThrow();

    db.close();
  });

  it('enforces uniqueness by company, type, environment and access key', async () => {
    const dbPath = temporaryDatabasePath();
    await createVersion2Database(dbPath);
    const db = await DatabaseManager.create(dbPath);
    const key = '4'.repeat(50);
    const insert = (environment: 'homologation' | 'production') => db.execute(
      `INSERT INTO documents (
        company_id, document_type, environment, origin, nsu, schema_type, access_key,
        content_hash, xml_status, pdf_status, situacao_fiscal
      ) VALUES (1, 'NFSE', ?, 'NFSE_ADN_DISTRIBUTION', '1', 'NFSe_v1.01', ?, ?,
        'XML_DISPONIVEL', 'PDF_INDISPONIVEL', 'AUTORIZADA');`,
      [environment, key, `hash-${environment}`]
    );

    expect(() => insert('homologation')).not.toThrow();
    expect(() => insert('production')).not.toThrow();
    expect(() => insert('homologation')).toThrow();

    db.close();
  });
});
