import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { logger } from '../api/utils/logger';
import * as schema from './schema';
import { backupCorruptedDbFiles } from './db-paths';

export function createDbClient(dbPath: string): Client {
  return createClient({
    url: `file:${dbPath}`,
  });
}

export function createDrizzleInstance(client: Client) {
  return drizzle(client, { schema });
}

export async function applyPragmas(client: Client): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  await client.execute('PRAGMA journal_mode = WAL;');
  await client.execute(`PRAGMA synchronous = ${isProd ? 'FULL' : 'NORMAL'};`);
  await client.execute('PRAGMA busy_timeout = 5000;');
  await client.execute('PRAGMA foreign_keys = ON;');
}

export async function verifyIntegrityOrRecover(
  client: Client,
  dbPath: string
): Promise<{ client: Client; recovered: boolean }> {
  try {
    const integrity = await client.execute('PRAGMA integrity_check;');
    const integrityResult = integrity.rows?.[0]?.[0] ?? (integrity.rows?.[0] as any)?.integrity_check;
    if (integrityResult !== 'ok') {
      throw new Error(`Integrity check failed: ${JSON.stringify(integrity.rows)}`);
    }
    return { client, recovered: false };
  } catch (integrityErr: any) {
    logger.error(
      { err: integrityErr?.message || String(integrityErr) },
      'database_corruption_detected_recovering'
    );
    const backups = backupCorruptedDbFiles(dbPath);
    if (backups.length > 0) {
      logger.warn(
        { backups },
        'database_corruption_backups_available_for_manual_recovery'
      );
    }
    const newClient = createDbClient(dbPath);
    return { client: newClient, recovered: true };
  }
}

