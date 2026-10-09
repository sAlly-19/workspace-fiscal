import fs from 'fs';
import path from 'path';
import { logger } from '../api/utils/logger';

export function resolveDbPath(): string {
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

export function getRenamedUserDataDbPath(userData: string): string {
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

export function getStorageBasePath(): string {
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

/**
 * Move arquivos do DB para `.corrupt.<ts>.bak` mas **NÃO** deleta.
 * O Electron app (no próximo startup) deve ser capaz de recuperar do backup.
 * Esta função NÃO toca nos backups — apenas os cria. O caller decide se apaga.
 */
export function backupCorruptedDbFiles(dbPath: string): string[] {
  const filesToBackup = [
    dbPath,
    `${dbPath}-wal`,
    `${dbPath}-shm`,
    `${dbPath}-journal`,
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

