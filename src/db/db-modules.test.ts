import { describe, it, expect } from 'vitest';
import { resolveDbPath, getStoragePath, backupCorruptedDbFiles } from './db-paths';
import { createDbClient } from './db-client';
import path from 'path';

describe('Database Modules', () => {
  it('resolves database path with valid sqlite file', () => {
    const dbPath = resolveDbPath();
    expect(typeof dbPath).toBe('string');
    expect(dbPath.length).toBeGreaterThan(0);
    expect(path.isAbsolute(dbPath)).toBe(true);
  });

  it('resolves storage base path', () => {
    const storagePath = getStoragePath();
    expect(typeof storagePath).toBe('string');
    expect(storagePath.endsWith('storage')).toBe(true);
    expect(path.isAbsolute(storagePath)).toBe(true);
  });

  it('backupCorruptedDbFiles safely handles non-existing files', () => {
    const nonExistentPath = path.resolve(process.cwd(), 'temp_non_existent_file_test.db');
    const backups = backupCorruptedDbFiles(nonExistentPath);
    expect(Array.isArray(backups)).toBe(true);
    expect(backups.length).toBe(0);
  });

  it('creates composite indexes on documents for recursive folder queries (IMP-T04)', async () => {
    const { initSchemaAndMigrations } = await import('./db-schema-init');
    const client = createDbClient(':memory:');
    await initSchemaAndMigrations(client);

    const res = await client.execute("PRAGMA index_list('documents');");
    const indexNames = res.rows.map((row: any) => row.name || row[1]);

    expect(indexNames).toContain('idx_documents_batch_type');
    expect(indexNames).toContain('idx_documents_batch_issue_date');
  });
});

