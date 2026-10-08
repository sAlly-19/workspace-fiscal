import { describe, it, expect } from 'vitest';
import {
  getDefaultDestination,
  DEFAULT_SETTINGS,
  inspectBackup,
  getDatabaseStats,
} from './index';

describe('Backup Submodules Isolated Tests', () => {
  describe('backup.types & destination', () => {
    it('returns default destination path and valid default settings', () => {
      const dest = getDefaultDestination();
      expect(dest).toBeDefined();
      expect(typeof dest).toBe('string');
      expect(dest.length).toBeGreaterThan(0);

      expect(DEFAULT_SETTINGS.enabled).toBe(true);
      expect(DEFAULT_SETTINGS.intervalDays).toBe(7);
      expect(DEFAULT_SETTINGS.retentionCount).toBe(30);
      expect(DEFAULT_SETTINGS.destination).toBeDefined();
    });
  });

  describe('backup-inspector', () => {
    it('returns invalid for non-existent file path', async () => {
      const res = await inspectBackup('C:/non-existent-path/file.wfb');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('não encontrado');
    });

    it('returns invalid for a directory path', async () => {
      const res = await inspectBackup(process.cwd());
      expect(res.valid).toBe(false);
      expect(res.error).toContain('diretório');
    });
  });

  describe('backup-stats', () => {
    it('returns valid DatabaseStats structure with numeric metrics', async () => {
      const stats = await getDatabaseStats();
      expect(stats).toBeDefined();
      expect(stats.nfView).toBeDefined();
      expect(typeof stats.nfView.documents).toBe('number');
      expect(typeof stats.nfView.storageXmlFiles).toBe('number');
      expect(stats.depreciation).toBeDefined();
      expect(typeof stats.depreciation.companies).toBe('number');
      expect(stats.settings).toBeDefined();
      expect(typeof stats.settings.count).toBe('number');
    });
  });
});

