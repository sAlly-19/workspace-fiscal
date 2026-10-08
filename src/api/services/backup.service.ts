import path from 'path';
import { db } from '../../db';
import { applicationSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import {
  BackupModule,
  BackupSettings,
  BackupManifest,
  BackupInspectionResult,
  DatabaseStats,
  DEFAULT_SETTINGS,
  getDefaultDestination,
  getDatabaseStats,
  inspectBackup,
  createBackup,
  createSafetyBackup,
  restoreBackup,
  applyRetention,
  maybeRunIfDue,
  listBackups,
  type CreateBackupOptions,
  type CreateBackupResult,
  type RestoreBackupOptions,
  type RestoreBackupResult,
  type BackupListItem,
} from './backup';

export type {
  BackupModule,
  BackupSettings,
  BackupManifest,
  BackupInspectionResult,
  DatabaseStats,
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

  async getDatabaseStats(): Promise<DatabaseStats> {
    return getDatabaseStats();
  }

  async createBackup(options: CreateBackupOptions): Promise<CreateBackupResult> {
    const res = await createBackup(options, this.settings, async (finalDir) => {
      if (path.resolve(finalDir) === path.resolve(this.settings.destination || getDefaultDestination())) {
        await this.applyRetention(finalDir);
      }
    });
    this.lastRunAt = Date.now();
    return res;
  }

  async createSafetyBackup(): Promise<{ filename: string; path: string; sizeBytes: number }> {
    return createSafetyBackup(this.settings);
  }

  async inspectBackup(filePath: string): Promise<BackupInspectionResult> {
    return inspectBackup(filePath);
  }

  async restoreBackup(options: RestoreBackupOptions): Promise<RestoreBackupResult> {
    return restoreBackup(
      options,
      () => this.createSafetyBackup(),
      (fp) => this.inspectBackup(fp)
    );
  }

  async runBackup(): Promise<{ filename: string; path: string; sizeBytes: number }> {
    return this.createBackup({
      modules: ['NF_VIEW', 'DEPRECIATION', 'SETTINGS'],
    });
  }

  private async applyRetention(destination?: string): Promise<void> {
    return applyRetention(this.settings, destination);
  }

  async maybeRunIfDue(): Promise<{ ran: boolean; reason: string }> {
    return maybeRunIfDue(
      this.settings,
      this.lastRunAt,
      () => this.createBackup({ modules: ['NF_VIEW', 'DEPRECIATION', 'SETTINGS'] }),
      () => this.loadSettingsFromDb(),
      (ts) => {
        this.lastRunAt = ts;
      }
    );
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

  async listBackups(): Promise<BackupListItem[]> {
    return listBackups(this.settings);
  }
}

export const backupService = new BackupService();