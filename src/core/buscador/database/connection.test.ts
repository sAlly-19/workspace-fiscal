import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseManager } from './connection';

describe('DatabaseManager native libsql', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wsf-db-test-'));
    dbPath = path.join(tempDir, 'test.db');
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('initializes with WAL mode, foreign keys ON and busy_timeout on file database', async () => {
    const db = await DatabaseManager.create(dbPath);

    const fk = db.queryOne<{ foreign_keys: number }>('PRAGMA foreign_keys;');
    expect(fk?.foreign_keys).toBe(1);

    const jm = db.queryOne<{ journal_mode: string }>('PRAGMA journal_mode;');
    expect(jm?.journal_mode.toLowerCase()).toBe('wal');

    const timeout = db.queryOne<{ timeout: number }>('PRAGMA busy_timeout;');
    expect(timeout?.timeout).toBe(5000);

    db.close();
  });

  it('executes queries synchronously with correct changes and lastInsertRowid', async () => {
    const db = await DatabaseManager.create(':memory:');

    db.execute('CREATE TABLE sample (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);');
    const res1 = db.execute('INSERT INTO sample (name) VALUES (?);', ['Item 1']);
    expect(res1.changes).toBe(1);
    expect(res1.lastInsertRowid).toBe(1);

    const res2 = db.execute('INSERT INTO sample (name) VALUES (?);', ['Item 2']);
    expect(res2.changes).toBe(1);
    expect(res2.lastInsertRowid).toBe(2);

    const row = db.queryOne<{ id: number; name: string }>('SELECT * FROM sample WHERE id = ?;', [1]);
    expect(row).toEqual({ id: 1, name: 'Item 1' });

    const all = db.queryAll<{ id: number; name: string }>('SELECT * FROM sample ORDER BY id ASC;');
    expect(all).toHaveLength(2);

    db.close();
  });

  it('commits transactions on success and rolls back on failure', async () => {
    const db = await DatabaseManager.create(':memory:');
    db.execute('CREATE TABLE tx_test (id INTEGER PRIMARY KEY, val TEXT);');

    db.transaction(() => {
      db.execute('INSERT INTO tx_test VALUES (1, ?);', ['A']);
      db.execute('INSERT INTO tx_test VALUES (2, ?);', ['B']);
    });

    expect(db.queryAll('SELECT * FROM tx_test;')).toHaveLength(2);

    expect(() => {
      db.transaction(() => {
        db.execute('INSERT INTO tx_test VALUES (3, ?);', ['C']);
        throw new Error('Forced rollback');
      });
    }).toThrow('Forced rollback');

    expect(db.queryOne('SELECT * FROM tx_test WHERE id = 3;')).toBeNull();

    db.close();
  });
});

