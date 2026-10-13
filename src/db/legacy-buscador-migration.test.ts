import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseManager, getSqlModule } from '../core/buscador/database/connection';
import { migrateLegacyBuscadorDatabase } from './legacy-buscador-migration';

describe('Legacy Buscador SQLite Migration (fiscal_storage.db -> workspace-fiscal.sqlite)', () => {
  let tempDir: string;
  let legacyDbPath: string;
  let targetDbPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-legacy-migration-test-'));
    legacyDbPath = path.join(tempDir, 'fiscal_storage.db');
    targetDbPath = path.join(tempDir, 'workspace-fiscal.sqlite');
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    } catch {}
  });

  async function createLegacyDatabase(dbPath: string): Promise<void> {
    const SQL = await getSqlModule();
    const db = new SQL.Database();
    db.run(`
      CREATE TABLE companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cnpj TEXT NOT NULL UNIQUE,
        uf TEXT DEFAULT '35',
        is_active INTEGER NOT NULL DEFAULT 1
      );
      INSERT INTO companies (name, cnpj, uf, is_active) VALUES ('Legada SA', '12345678000199', 'SP', 1);

      CREATE TABLE certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        issuer TEXT NOT NULL,
        serial_number TEXT,
        thumbprint TEXT NOT NULL,
        valid_from TEXT NOT NULL,
        valid_to TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'windows_store',
        has_private_key INTEGER NOT NULL DEFAULT 1,
        extracted_cnpj TEXT,
        extracted_cpf TEXT
      );
      INSERT INTO certificates (company_id, subject, issuer, thumbprint, valid_from, valid_to)
      VALUES (1, 'Cert Legado', 'AC Raiz', 'THUMB123', '2026-01-01', '2027-01-01');

      CREATE TABLE distribution_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        document_type TEXT NOT NULL,
        environment TEXT NOT NULL DEFAULT 'homologation',
        last_nsu TEXT NOT NULL DEFAULT '000000000000100',
        max_nsu TEXT NOT NULL DEFAULT '000000000000200',
        last_query_at TEXT,
        status TEXT NOT NULL DEFAULT 'IDLE',
        last_error TEXT,
        last_cstat INTEGER,
        next_query_at TEXT
      );
      INSERT INTO distribution_state (company_id, document_type, environment, last_nsu, max_nsu)
      VALUES (1, 'NFE', 'homologation', '000000000000100', '000000000000200');

      CREATE TABLE documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        document_type TEXT NOT NULL,
        environment TEXT NOT NULL DEFAULT 'homologation',
        origin TEXT NOT NULL DEFAULT 'SEFAZ_DISTRIBUTION',
        nsu TEXT NOT NULL,
        schema_type TEXT NOT NULL,
        access_key TEXT NOT NULL,
        document_number TEXT
      );
      INSERT INTO documents (company_id, document_type, environment, origin, nsu, schema_type, access_key, document_number)
      VALUES (1, 'NFE', 'homologation', 'SEFAZ_DISTRIBUTION', '000000000000100', 'procNFe', '35260112345678000199550010000000011000000011', '1');

      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      INSERT INTO app_settings (key, value) VALUES ('legacy_custom_key', 'hello_world');
    `);
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }

  it('migrates legacy buscador data into target unified database and renames legacy file to .bak', async () => {
    // 1. Criar banco legado como arquivo real exportado (sql.js)
    await createLegacyDatabase(legacyDbPath);
    expect(fs.existsSync(legacyDbPath)).toBe(true);

    // 2. Executar migração
    const migrated = await migrateLegacyBuscadorDatabase(legacyDbPath, targetDbPath);
    expect(migrated).toBe(true);

    // 3. Verificar arquivo legado renomeado para .bak
    expect(fs.existsSync(legacyDbPath)).toBe(false);
    expect(fs.existsSync(`${legacyDbPath}.bak`)).toBe(true);

    // 4. Verificar dados no banco destino
    const targetDb = await DatabaseManager.create(targetDbPath);
    const compInTarget = targetDb.queryOne<any>('SELECT * FROM companies WHERE cnpj = ?;', ['12345678000199']);
    expect(compInTarget).toBeDefined();
    expect(compInTarget.name).toBe('Legada SA');
    expect(compInTarget.numeric_id).toBeDefined();

    const certInTarget = targetDb.queryOne<any>('SELECT * FROM certificates WHERE thumbprint = ?;', ['THUMB123']);
    expect(certInTarget).toBeDefined();
    expect(certInTarget.company_id).toBe(compInTarget.numeric_id);

    const distInTarget = targetDb.queryOne<any>('SELECT * FROM distribution_state WHERE company_id = ?;', [
      compInTarget.numeric_id,
    ]);
    expect(distInTarget).toBeDefined();
    expect(distInTarget.last_nsu).toBe('000000000000100');

    // Documento deve ter sido inserido em buscador_documents ou documents
    const docTable = targetDb.hasTable('buscador_documents') ? 'buscador_documents' : 'documents';
    const docInTarget = targetDb.queryOne<any>(`SELECT * FROM ${docTable} WHERE company_id = ?;`, [
      compInTarget.numeric_id,
    ]);
    expect(docInTarget).toBeDefined();
    expect(docInTarget.access_key).toBe('35260112345678000199550010000000011000000011');

    const settingInTarget = targetDb.queryOne<any>('SELECT * FROM app_settings WHERE key = ?;', ['legacy_custom_key']);
    expect(settingInTarget?.value).toBe('hello_world');

    targetDb.close();

    // 5. Chamada subsequente é no-op idempotente
    const rerun = await migrateLegacyBuscadorDatabase(legacyDbPath, targetDbPath);
    expect(rerun).toBe(false);
  });
});
