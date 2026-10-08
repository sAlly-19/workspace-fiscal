import { promises as fs, statSync, readdirSync, unlinkSync } from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';
import { BackupSettings, getDefaultDestination } from './backup.types';

export interface BackupListItem {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  isWfb: boolean;
}

export async function applyRetention(
  settings: BackupSettings,
  destination?: string
): Promise<void> {
  const dest = destination || settings.destination || getDefaultDestination();
  try {
    const files = readdirSync(dest)
      .filter((f) => (f.endsWith('.wfb') || f.endsWith('.db')) && !f.endsWith('.bak'))
      .map((f) => ({
        name: f,
        full: path.join(dest, f),
        mtime: statSync(path.join(dest, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    const toDelete = files.slice(settings.retentionCount);
    for (const f of toDelete) {
      unlinkSync(f.full);
      logger.info({ deleted: f.name }, 'backup_retention_pruned');
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'backup_retention_failed');
  }
}

export async function maybeRunIfDue(
  settings: BackupSettings,
  lastRunAt: number | null,
  createBackupFn: () => Promise<any>,
  loadSettingsFromDbFn: () => Promise<BackupSettings>,
  setLastRunAtFn: (ts: number) => void
): Promise<{ ran: boolean; reason: string }> {
  await loadSettingsFromDbFn();
  if (!settings.enabled) {
    return { ran: false, reason: 'disabled' };
  }
  const destination = settings.destination || getDefaultDestination();
  if (lastRunAt) {
    const elapsedDays = (Date.now() - lastRunAt) / (1000 * 60 * 60 * 24);
    if (elapsedDays < settings.intervalDays) {
      return { ran: false, reason: `within_interval_${settings.intervalDays}d` };
    }
  } else {
    try {
      const files = readdirSync(destination)
        .filter((f) => (f.endsWith('.wfb') || f.endsWith('.db')) && !f.endsWith('.bak'))
        .map((f) => ({
          name: f,
          mtime: statSync(path.join(destination, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime);
      if (files.length > 0) {
        setLastRunAtFn(files[0].mtime);
        const elapsedDays = (Date.now() - files[0].mtime) / (1000 * 60 * 60 * 24);
        if (elapsedDays < settings.intervalDays) {
          return { ran: false, reason: 'recent_backup_exists' };
        }
      }
    } catch {}
  }
  await createBackupFn();
  return { ran: true, reason: 'scheduled' };
}

export async function listBackups(
  settings: BackupSettings
): Promise<BackupListItem[]> {
  const destination = settings.destination || getDefaultDestination();
  try {
    await fs.mkdir(destination, { recursive: true });
    const files = readdirSync(destination)
      .filter((f) => (f.endsWith('.wfb') || f.endsWith('.db')) && !f.endsWith('.bak'));
    return files
      .map((f) => {
        const full = path.join(destination, f);
        const st = statSync(full);
        return {
          filename: f,
          sizeBytes: st.size,
          createdAt: st.mtime.toISOString(),
          isWfb: f.endsWith('.wfb'),
        };
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

