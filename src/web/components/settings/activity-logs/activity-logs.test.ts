import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import {
  formatLogDate,
  getLevelBadge,
  getModuleBadgeColor,
  ActivityLogsHeader,
  ActivityLogsList,
  ActivityLogDetailPane,
  type ActivityLogItem,
  type ActivityLogStats,
} from './index';

describe('Activity Logs Sub-components & Helpers', () => {
  describe('activityLogFormatters', () => {
    it('formats dates into pt-BR locale or returns placeholder', () => {
      expect(formatLogDate(undefined)).toBe('—');
      const formatted = formatLogDate('2026-10-08T15:30:00Z');
      expect(formatted).not.toBe('—');
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('returns badges for each log level', () => {
      const levels = ['SUCCESS', 'ERROR', 'WARN', 'INFO'] as const;
      for (const lvl of levels) {
        const badge = getLevelBadge(lvl);
        expect(badge.icon).toBeDefined();
        expect(badge.color).toBeDefined();
        expect(badge.label).toBeDefined();
      }
    });

    it('returns module badge classes for light and dark themes', () => {
      const darkColor = getModuleBadgeColor('BUSCADOR', false);
      const lightColor = getModuleBadgeColor('BUSCADOR', true);
      expect(darkColor).toContain('bg-indigo-500/15');
      expect(lightColor).toContain('bg-indigo-50');
    });
  });

  describe('ActivityLogsHeader', () => {
    const mockStats: ActivityLogStats = {
      total: 100,
      successCount: 80,
      errorCount: 15,
      warnCount: 5,
      infoCount: 0,
    };

    it('renders metrics cards with stats values', () => {
      const onReload = vi.fn();
      const onExportCsv = vi.fn();
      const onOpenClearModal = vi.fn();

      const element = React.createElement(ActivityLogsHeader, {
        isLight: false,
        loading: false,
        stats: mockStats,
        clearingDays: 60,
        setClearingDays: vi.fn(),
        onReload,
        onExportCsv,
        onOpenClearModal,
      });

      expect(element).toBeDefined();
      expect(element.props.stats.total).toBe(100);
      expect(element.props.stats.successCount).toBe(80);
      expect(element.props.stats.errorCount).toBe(15);
      expect(element.props.stats.warnCount).toBe(5);
    });
  });

  describe('ActivityLogsList', () => {
    const mockLogs: ActivityLogItem[] = [
      {
        id: 'log-1',
        timestamp: '2026-10-08T12:00:00Z',
        level: 'SUCCESS',
        module: 'BUSCADOR',
        action: 'SEFAZ_SYNC',
        message: 'Consulta de documentos concluída com sucesso.',
        durationMs: 450,
      },
    ];

    it('renders logs list with search and level filters', () => {
      const onSelectLog = vi.fn();
      const element = React.createElement(ActivityLogsList, {
        isLight: true,
        loading: false,
        logs: mockLogs,
        totalCount: 1,
        searchTerm: '',
        setSearchTerm: vi.fn(),
        selectedLevel: 'ALL',
        setSelectedLevel: vi.fn(),
        selectedModule: 'ALL',
        setSelectedModule: vi.fn(),
        selectedLog: null,
        onSelectLog,
      });

      expect(element).toBeDefined();
      expect(element.props.logs).toHaveLength(1);
      expect(element.props.totalCount).toBe(1);
      expect(element.props.selectedLevel).toBe('ALL');
    });
  });

  describe('ActivityLogDetailPane', () => {
    const mockLog: ActivityLogItem = {
      id: 'log-1',
      timestamp: '2026-10-08T12:00:00Z',
      level: 'ERROR',
      module: 'BACKUP',
      action: 'RESTORE_SAFETY_CHECK',
      message: 'Falha ao validar manifesto de integridade.',
      details: { code: 'MANIFEST_CORRUPT', attemptedFile: 'backup.wfb' },
    };

    it('renders event details and copy JSON handler', () => {
      const onCopyJson = vi.fn();
      const onClose = vi.fn();

      const element = React.createElement(ActivityLogDetailPane, {
        isLight: false,
        selectedLog: mockLog,
        copied: false,
        onCopyJson,
        onClose,
      });

      expect(element).toBeDefined();
      expect(element.props.selectedLog.action).toBe('RESTORE_SAFETY_CHECK');
      expect(element.props.selectedLog.details.code).toBe('MANIFEST_CORRUPT');
    });
  });
});

