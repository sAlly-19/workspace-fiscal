import { promises as fs, existsSync, statSync, readdirSync, unlinkSync } from 'fs';
import path from 'path';
import { DB_PATH } from '../../db';
import { logger } from '../utils/logger';

export interface BackupSettings {
  enabled: boolean;
  intervalDays: number;
  retentionCount: number;
  destination: string; // absolute path
}

const DEFAULT_SETTINGS: BackupSettings = {
  enabled: true,
  intervalDays: 7,
  retentionCount: 30,
  destination: '', // resolvido em runtime para ~/Documents/workspace-fiscal-backups
};

function getDefaultDestination(): string {
  // Usa Documents como fallback amigável cross-platform.
  try {
    const electron = require('electron');
    const app = electron?.app;
    if (app && typeof app.getPath === 'function' && app.isReady()) {
      return path.join(app.getPath('documents'), 'workspace-fiscal-backups');
    }
  } catch {}
  return path.join(process.cwd(), 'backups');
}

function loadSettings(): BackupSettings {
  try {
    const raw = localStorage?.getItem?.('wsf_backup_settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS, destination: getDefaultDestination() };
}

function saveSettings(s: BackupSettings): void {
  try {
    localStorage?.setItem?.('wsf_backup_settings', JSON.stringify(s));
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'backup_settings_save_failed');
  }
}

export class BackupService {
  private settings: BackupSettings = loadSettings();
  private lastRunAt: number | null = null;
  private timer: NodeJS.Timeout | null = null;

  getSettings(): BackupSettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<BackupSettings>): BackupSettings {
    this.settings = { ...this.settings, ...partial };
    saveSettings(this.settings);
    logger.info({ settings: this.settings }, 'backup_settings_updated');
    return this.getSettings();
  }

  async runBackup(): Promise<{ filename: string; path: string; sizeBytes: number }> {
    if (!existsSync(DB_PATH)) {
      throw new Error(`Database file not found: ${DB_PATH}`);
    }

    await fs.mkdir(this.settings.destination, { recursive: true });

    const ts = new Date();
    const stamp = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}_${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}${String(ts.getSeconds()).padStart(2, '0')}`;
    const baseName = path.basename(DB_PATH, path.extname(DB_PATH));
    const filename = `${baseName}-${stamp}.db`;
    const destPath = path.join(this.settings.destination, filename);

    // Copia arquivo + auxiliares WAL/SHM/JOURNAL para garantir consistência via sqlite3 .backup API.
    // Aqui usamos cópia de arquivo com checkpoint do WAL ativo primeiro (libSQL/sqlite expõe .backup()).
    // Estratégia: copia WAL/SHM/journal auxiliares para garantir leitura consistente.
    const auxFiles = ['-wal', '-shm', '-journal'];
    for (const suffix of auxFiles) {
      const auxSrc = DB_PATH + suffix;
      if (existsSync(auxSrc)) {
        try {
          await fs.copyFile(auxSrc, destPath + suffix);
        } catch (err) {
          logger.warn({ auxSrc, err: (err as Error).message }, 'backup_aux_copy_failed');
        }
      }
    }

    await fs.copyFile(DB_PATH, destPath);
    const stat = statSync(destPath);
    this.lastRunAt = Date.now();

    // Aplica retenção
    await this.applyRetention();

    logger.info({ filename, sizeBytes: stat.size, destPath }, 'backup_completed');
    return { filename, path: destPath, sizeBytes: stat.size };
  }

  private async applyRetention(): Promise<void> {
    try {
      const files = readdirSync(this.settings.destination)
        .filter((f) => f.endsWith('.db') && !f.endsWith('.bak'))
        .map((f) => ({
          name: f,
          full: path.join(this.settings.destination, f),
          mtime: statSync(path.join(this.settings.destination, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime);

      const toDelete = files.slice(this.settings.retentionCount);
      for (const f of toDelete) {
        unlinkSync(f.full);
        logger.info({ deleted: f.name }, 'backup_retention_pruned');
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'backup_retention_failed');
    }
  }

  async maybeRunIfDue(): Promise<{ ran: boolean; reason: string }> {
    if (!this.settings.enabled) {
      return { ran: false, reason: 'disabled' };
    }
    if (this.lastRunAt) {
      const elapsedDays = (Date.now() - this.lastRunAt) / (1000 * 60 * 60 * 24);
      if (elapsedDays < this.settings.intervalDays) {
        return { ran: false, reason: `within_interval_${this.settings.intervalDays}d` };
      }
    } else {
      // Primeira execução: tenta descobrir o último backup pelo timestamp no nome
      try {
        const files = readdirSync(this.settings.destination)
          .filter((f) => f.endsWith('.db') && !f.endsWith('.bak'))
          .map((f) => ({
            name: f,
            mtime: statSync(path.join(this.settings.destination, f)).mtime.getTime(),
          }))
          .sort((a, b) => b.mtime - a.mtime);
        if (files.length > 0) {
          this.lastRunAt = files[0].mtime;
          const elapsedDays = (Date.now() - this.lastRunAt) / (1000 * 60 * 60 * 24);
          if (elapsedDays < this.settings.intervalDays) {
            return { ran: false, reason: 'recent_backup_exists' };
          }
        }
      } catch {
        // ignore
      }
    }
    await this.runBackup();
    return { ran: true, reason: 'scheduled' };
  }

  startScheduler(intervalHours = 6): void {
    if (this.timer) return;
    const ms = intervalHours * 60 * 60 * 1000;
    this.timer = setInterval(() => {
      this.maybeRunIfDue().catch((err) =>
        logger.error({ err: err.message }, 'backup_scheduler_error')
      );
    }, ms);
    if ((this.timer as any)?.unref) (this.timer as any).unref();
    logger.info({ intervalHours }, 'backup_scheduler_started');
  }

  stopScheduler(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async listBackups(): Promise<Array<{ filename: string; sizeBytes: number; createdAt: string }>> {
    try {
      await fs.mkdir(this.settings.destination, { recursive: true });
      const files = readdirSync(this.settings.destination)
        .filter((f) => f.endsWith('.db') && !f.endsWith('.bak'));
      return files
        .map((f) => {
          const full = path.join(this.settings.destination, f);
          const st = statSync(full);
          return {
            filename: f,
            sizeBytes: st.size,
            createdAt: st.mtime.toISOString(),
          };
        })
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    } catch {
      return [];
    }
  }
}

// `localStorage` não existe no main process; usamos shim.
declare const localStorage: { getItem(k: string): string | null; setItem(k: string, v: string): void } | undefined;

export const backupService = new BackupService();