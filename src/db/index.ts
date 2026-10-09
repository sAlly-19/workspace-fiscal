import type { Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { logger } from '../api/utils/logger';
import * as schema from './schema';
import {
  resolveDbPath,
  getStorageBasePath,
  backupCorruptedDbFiles,
} from './db-paths';
import {
  createDbClient,
  applyPragmas,
  verifyIntegrityOrRecover,
} from './db-client';
import { initSchemaAndMigrations } from './db-schema-init';

export * from './db-paths';
export * from './db-schema-init';
export * from './db-client';

export let DB_PATH: string = resolveDbPath();

export function getStoragePath(): string {
  return getStorageBasePath();
}

export let rawClient: Client;

try {
  rawClient = createDbClient(DB_PATH);
} catch (err) {
  logger.error({ err: (err as Error).message }, 'database_open_failed_attempting_reset');
  backupCorruptedDbFiles(DB_PATH);
  rawClient = createDbClient(DB_PATH);
}

export let db = drizzle(rawClient, { schema });

export function reconfigureDatabase(customPath?: string): void {
  const newPath = customPath || resolveDbPath();
  DB_PATH = newPath;
  try {
    rawClient = createDbClient(DB_PATH);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'database_reconfigure_open_failed');
    backupCorruptedDbFiles(DB_PATH);
    rawClient = createDbClient(DB_PATH);
  }
  db = drizzle(rawClient, { schema });
}

export async function initDatabase(customPath?: string): Promise<void> {
  try {
    reconfigureDatabase(customPath);

    // 1. Check database integrity. Se falhar, faz backup e cria novo — mas
    //    PRESERVA os arquivos originais (`.corrupt.<ts>.bak`) para recuperação.
    const check = await verifyIntegrityOrRecover(rawClient, DB_PATH);
    if (check.recovered) {
      rawClient = check.client;
      db = drizzle(rawClient, { schema });
    }

    // 2. Configure performance & durability pragmas.
    await applyPragmas(rawClient);

    // 3. Auto-create tables & dynamic column migrations
    await initSchemaAndMigrations(rawClient);

    logger.info({ path: DB_PATH }, 'database_initialized');
  } catch (error) {
    logger.error({ err: (error as Error).message }, 'database_init_critical_error');
  }
}
