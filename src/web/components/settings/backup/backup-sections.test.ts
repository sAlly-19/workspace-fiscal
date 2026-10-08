import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import {
  BackupCreateSection,
  BackupRestoreSection,
  BackupAutoScheduleSection,
} from './index';
import type { DatabaseStats, BackupInspectionResult } from '../../../../api/services/backup.service';

describe('Backup Settings Sub-components Contracts', () => {
  const mockStats: DatabaseStats = {
    nfView: {
      documents: 150,
      items: 300,
      taxes: 150,
      events: 10,
      folders: 5,
      batches: 2,
      storageXmlFiles: 148,
    },
    depreciation: {
      companies: 2,
      categories: 4,
      assets: 25,
      depreciationEntries: 100,
      depreciationExports: 1,
    },
    settings: {
      count: 12,
    },
  };

  describe('BackupCreateSection', () => {
    it('creates component with modules and database stats', () => {
      const toggleCreateModule = vi.fn();
      const onCreateBackup = vi.fn();

      const element = React.createElement(BackupCreateSection, {
        isLight: false,
        selectedModules: ['NF_VIEW', 'DEPRECIATION'],
        toggleCreateModule,
        stats: mockStats,
        creatingBackup: false,
        onCreateBackup,
      });

      expect(element).toBeDefined();
      expect(element.props.selectedModules).toHaveLength(2);
      expect(element.props.stats?.nfView.documents).toBe(150);
      expect(element.props.creatingBackup).toBe(false);
    });

    it('handles creating backup loading state', () => {
      const element = React.createElement(BackupCreateSection, {
        isLight: true,
        selectedModules: ['SETTINGS'],
        toggleCreateModule: vi.fn(),
        stats: null,
        creatingBackup: true,
        onCreateBackup: vi.fn(),
      });

      expect(element).toBeDefined();
      expect(element.props.creatingBackup).toBe(true);
      expect(element.props.stats).toBeNull();
    });
  });

  describe('BackupRestoreSection', () => {
    const mockInspection: BackupInspectionResult = {
      valid: true,
      appVersion: '3.5.0',
      createdAt: '2026-10-08T10:00:00Z',
      modules: ['NF_VIEW', 'DEPRECIATION', 'SETTINGS'],
      isLegacy: false,
    };

    it('renders with inspection result and restore callbacks', () => {
      const onSelectRestoreFile = vi.fn();
      const onRequestRestoreConfirm = vi.fn();
      const setModulesToRestore = vi.fn();

      const element = React.createElement(BackupRestoreSection, {
        isLight: false,
        inspecting: false,
        restoring: false,
        restoreStatus: '',
        selectedRestorePath: '/backups/backup-2026.wfb',
        inspection: mockInspection,
        modulesToRestore: ['NF_VIEW', 'DEPRECIATION'],
        setModulesToRestore,
        onSelectRestoreFile,
        onRequestRestoreConfirm,
      });

      expect(element).toBeDefined();
      expect(element.props.inspection?.valid).toBe(true);
      expect(element.props.inspection?.appVersion).toBe('3.5.0');
      expect(element.props.modulesToRestore).toEqual(['NF_VIEW', 'DEPRECIATION']);
    });

    it('handles legacy backup mode', () => {
      const legacyInspection: BackupInspectionResult = {
        valid: true,
        appVersion: '2.0.0',
        createdAt: '2026-01-01T00:00:00Z',
        modules: ['FULL_DATABASE'],
        isLegacy: true,
      };

      const element = React.createElement(BackupRestoreSection, {
        isLight: true,
        inspecting: false,
        restoring: true,
        restoreStatus: 'Restaurando banco...',
        selectedRestorePath: '/backups/legacy.db',
        inspection: legacyInspection,
        modulesToRestore: ['NF_VIEW', 'DEPRECIATION', 'SETTINGS'],
        setModulesToRestore: vi.fn(),
        onSelectRestoreFile: vi.fn(),
        onRequestRestoreConfirm: vi.fn(),
      });

      expect(element).toBeDefined();
      expect(element.props.inspection?.isLegacy).toBe(true);
      expect(element.props.restoring).toBe(true);
      expect(element.props.restoreStatus).toBe('Restaurando banco...');
    });
  });

  describe('BackupAutoScheduleSection', () => {
    it('renders backup config settings and backup list count', () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);
      const setBackupConfig = vi.fn();

      const element = React.createElement(BackupAutoScheduleSection, {
        isLight: false,
        backupConfig: {
          enabled: true,
          intervalDays: 7,
          retentionCount: 30,
          destination: 'C:/backups',
        },
        backupList: [
          {
            filename: 'backup-1.wfb',
            sizeBytes: 1024 * 1024 * 5,
            createdAt: '2026-10-07T12:00:00Z',
            isWfb: true,
          },
        ],
        setBackupConfig,
        saveConfig,
      });

      expect(element).toBeDefined();
      expect(element.props.backupConfig?.enabled).toBe(true);
      expect(element.props.backupConfig?.intervalDays).toBe(7);
      expect(element.props.backupList).toHaveLength(1);
    });
  });
});

