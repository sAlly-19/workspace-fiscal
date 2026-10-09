import { describe, it, expect } from 'vitest';
import {
  getDisposedCompetence,
  isDisposedBefore,
  colLetterToIndex,
  formatDepreciationRowsToCsv,
  DepreciationCsvRow,
} from './index';
import { depreciationService, DepreciationService } from '../depreciation.service';

describe('Depreciation Service Submodules and Calculations', () => {
  describe('Disposal Utils', () => {
    it('returns null for non-disposed assets or assets without disposal date', () => {
      expect(getDisposedCompetence(null)).toBeNull();
      expect(getDisposedCompetence({ status: 'ACTIVE' })).toBeNull();
      expect(getDisposedCompetence({ status: 'DISPOSED', disposedAt: null })).toBeNull();
    });

    it('extracts competence YYYY-MM correctly when asset is disposed', () => {
      const asset = { status: 'DISPOSED', disposedAt: '2026-05-18T10:00:00Z' };
      const comp = getDisposedCompetence(asset);
      expect(comp).toBe('2026-05');
    });

    it('identifies correctly if competence is after asset disposal', () => {
      const asset = { status: 'DISPOSED', disposedAt: '2026-05-18T10:00:00Z' };
      expect(isDisposedBefore(asset, '2026-04')).toBe(false);
      expect(isDisposedBefore(asset, '2026-05')).toBe(false);
      expect(isDisposedBefore(asset, '2026-06')).toBe(true);
    });
  });

  describe('CSV Formatter Utils', () => {
    it('converts excel column letters to zero-based index', () => {
      expect(colLetterToIndex('A')).toBe(0);
      expect(colLetterToIndex('B')).toBe(1);
      expect(colLetterToIndex('Z')).toBe(25);
      expect(colLetterToIndex('AA')).toBe(26);
    });

    it('formats depreciation rows into standard CSV with semicolon separator', () => {
      const mockRows: DepreciationCsvRow[] = [
        {
          competence: '2026-10',
          documentNumber: '1001',
          description: 'SERVIDOR DELL POWEREDGE',
          assetDescription: 'SERVIDOR DELL POWEREDGE',
          supplier: 'DELL COMPUTADORES DO BRASIL LTDA',
          acquisitionDate: new Date('2026-01-15T00:00:00Z'),
          acquisitionValue: 12000,
          annualRate: 20,
          depreciationValue: 200,
          accumulatedValue: 2000,
          currentValue: 10000,
        },
      ];

      const csv = formatDepreciationRowsToCsv(mockRows);
      expect(csv).toContain('10/2026');
      expect(csv).toContain('NF 1001');
      expect(csv).toContain('2,00');
    });
  });

  describe('DepreciationService Façade and Singletons', () => {
    it('provides competence helper methods', () => {
      expect(depreciationService).toBeInstanceOf(DepreciationService);
      const current = depreciationService.getCurrentCompetence();
      expect(current).toMatch(/^\d{4}-\d{2}$/);

      const lastClosed = depreciationService.getLastClosedCompetence();
      expect(lastClosed).toMatch(/^\d{4}-\d{2}$/);
    });

    it('exposes all required API methods on the instance', () => {
      expect(typeof depreciationService.getMonthlyDepreciation).toBe('function');
      expect(typeof depreciationService.getAssetHistory).toBe('function');
      expect(typeof depreciationService.generateCsv).toBe('function');
      expect(typeof depreciationService.generateRetroactiveForAsset).toBe('function');
      expect(typeof depreciationService.recalculateAsset).toBe('function');
      expect(typeof depreciationService.generateRetroactiveBatch).toBe('function');
      expect(typeof depreciationService.getDashboard).toBe('function');
    });
  });
});
