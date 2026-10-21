import { describe, it, expect } from 'vitest';
import { formatDateBR, competenceFromDate, formatCentsBRL, competenceLabel } from './formatters';

describe('formatters', () => {
  describe('formatDateBR', () => {
    it('formats YYYY-MM-DD date string without timezone shift', () => {
      expect(formatDateBR('2026-09-09')).toBe('09/09/2026');
    });

    it('formats UTC ISO midnight string without timezone shift', () => {
      expect(formatDateBR('2026-09-09T00:00:00.000Z')).toBe('09/09/2026');
    });

    it('formats Date instance with UTC midnight without timezone shift', () => {
      const utcDate = new Date('2026-09-09T00:00:00.000Z');
      expect(formatDateBR(utcDate)).toBe('09/09/2026');
    });

    it('formats local Date instance correctly', () => {
      const localDate = new Date(2026, 8, 9);
      expect(formatDateBR(localDate)).toBe('09/09/2026');
    });

    it('returns fallback for invalid or empty dates', () => {
      expect(formatDateBR('')).toBe('-');
      expect(formatDateBR('invalid-date')).toBe('-');
    });
  });

  describe('competenceFromDate', () => {
    it('returns YYYY-MM from YYYY-MM-DD string', () => {
      expect(competenceFromDate('2026-09-09')).toBe('2026-09');
    });

    it('returns YYYY-MM from UTC ISO string even on the 1st of month', () => {
      expect(competenceFromDate('2026-10-01T00:00:00.000Z')).toBe('2026-10');
    });

    it('returns YYYY-MM from Date instance even on the 1st of month', () => {
      const d = new Date('2026-10-01T00:00:00.000Z');
      expect(competenceFromDate(d)).toBe('2026-10');
    });
  });

  describe('formatCentsBRL and competenceLabel', () => {
    it('formats cents to BRL string', () => {
      expect(formatCentsBRL(600000)).toBe('R$ 6.000,00');
      expect(formatCentsBRL(3667)).toBe('R$ 36,67');
    });

    it('formats competence label in Portuguese', () => {
      expect(competenceLabel('2026-09')).toBe('Setembro 2026');
    });
  });
});
