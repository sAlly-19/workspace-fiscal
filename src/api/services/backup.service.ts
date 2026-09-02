import { promises as fs, existsSync, statSync, readdirSync, unlinkSync } from 'fs';
import path from 'path';
import { DB_PATH, rawClient, db } from '../../db';
import { applicationSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

export interface BackupSettings {
  enabled: boolean;
  intervalDays: number;
  retentionCount: number;
  destination: string; // absolute path
}

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

const DEFAULT_SETTINGS: BackupSettings = {
  enabled: true,
  intervalDays: 7,
  retentionCount: 30,
  destination: getDefaultDestination(),
};

export class BackupService {
  private settings: BackupSettings = { ...DEFAULT_SETTINGS };
  private lastRunAt: number | null = null;
  private timer: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    await this.loadSettingsFromDb();
  }

  async loadSettingsFromDb(): Promise<BackupSettings> {
    try {
      if (!this.settings.destination) {
        this.settings.destination = getDefaultDestination();
      }
      const row = await db.query.applicationSettings.findFirst({
        where: eq(applicationSettings.key, 'backup_settings'),
      });
      if (row?.value) {
        const parsed = JSON.parse(row.value);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'backup_settings_load_db_note');
    }
    return this.settings;
  }

  private async saveSettingsToDb(): Promise<void> {
    try {
      const value = JSON.stringify(this.settings);
      const existing = await db.query.applicationSettings.findFirst({
        where: eq(applicationSettings.key, 'backup_settings'),
      });
      if (existing) {
        await db
          .update(applicationSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(applicationSettings.key, 'backup_settings'));
      } else {
        await db.insert(applicationSettings).values({
          key: 'backup_settings',
          value,
          updatedAt: new Date(),
        });
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'backup_settings_save_db_failed');
    }
  }

  getSettings(): BackupSettings {
    if (!this.settings.destination) {
      this.settings.destination = getDefaultDestination();
    }
    return { ...this.settings };
  }

  updateSettings(partial: Partial<BackupSettings>): BackupSettings {
    this.settings = { ...this.settings, ...partial };
    if (!this.settings.destination) {
      this.settings.destination = getDefaultDestination();
    }
    this.saveSettingsToDb().catch(() => {});
    logger.info({ settings: this.settings }, 'backup_settings_updated');
    return this.getSettings();
  }

  async runBackup(): Promise<{ filename: string; path: string; sizeBytes: number }> {
    if (!existsSync(DB_PATH)) {
      throw new Error(`Database file not found: ${DB_PATH}`);
    }

    const destination = this.settings.destination || getDefaultDestination();
    await fs.mkdir(destination, { recursive: true });

    const ts = new Date();
    const stamp = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}_${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}${String(ts.getSeconds()).padStart(2, '0')}`;
    const baseName = path.basename(DB_PATH, path.extname(DB_PATH));
    const filename = `${baseName}-${stamp}.db`;
    const destPath = path.join(destination, filename);

    // 1. Força flush atômico do WAL para o arquivo principal antes de copiar
    try {
      if (rawClient) {
        await rawClient.execute('PRAGMA wal_checkpoint(TRUNCATE);');
      }
    } catch (chkErr) {
      logger.warn({ err: (chkErr as Error).message }, 'backup_wal_checkpoint_note');
    }

    // 2. Copia arquivo + auxiliares WAL/SHM/JOURNAL para garantir consistência
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

    // 3. Aplica retenção
    await this.applyRetention(destination);

    logger.info({ filename, sizeBytes: stat.size, destPath }, 'backup_completed');
    return { filename, path: destPath, sizeBytes: stat.size };
  }

  private async applyRetention(destination?: string): Promise<void> {
    const dest = destination || this.settings.destination || getDefaultDestination();
    try {
      const files = readdirSync(dest)
        .filter((f) => f.endsWith('.db') && !f.endsWith('.bak'))
        .map((f) => ({
          name: f,
          full: path.join(dest, f),
          mtime: statSync(path.join(dest, f)).mtime.getTime(),
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
    await this.loadSettingsFromDb();
    if (!this.settings.enabled) {
      return { ran: false, reason: 'disabled' };
    }
    const destination = this.settings.destination || getDefaultDestination();
    if (this.lastRunAt) {
      const elapsedDays = (Date.now() - this.lastRunAt) / (1000 * 60 * 60 * 24);
      if (elapsedDays < this.settings.intervalDays) {
        return { ran: false, reason: `within_interval_${this.settings.intervalDays}d` };
      }
    } else {
      // Primeira execução: tenta descobrir o último backup pelo timestamp no nome
      try {
        const files = readdirSync(destination)
          .filter((f) => f.endsWith('.db') && !f.endsWith('.bak'))
          .map((f) => ({
            name: f,
            mtime: statSync(path.join(destination, f)).mtime.getTime(),
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
    const destination = this.settings.destination || getDefaultDestination();
    try {
      await fs.mkdir(destination, { recursive: true });
      const files = readdirSync(destination)
        .filter((f) => f.endsWith('.db') && !f.endsWith('.bak'));
      return files
        .map((f) => {
          const full = path.join(destination, f);
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

export const backupService = new BackupService();