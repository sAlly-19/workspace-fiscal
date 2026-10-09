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

  it('can create in-memory db client and execute basic pragma', async () => {
    const client = createDbClient(':memory:');
    const res = await client.execute('SELECT 1 as val;');
    expect(res.rows.length).toBe(1);
    expect((res.rows[0] as any).val ?? (res.rows[0] as any)[0]).toBe(1);
  });
});

