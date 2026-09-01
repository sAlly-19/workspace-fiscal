import { describe, it, expect } from 'vitest';
import {
  monthlyFullCents,
  proportionalFirstMonthCents,
  generateSchedule,
  parseBRLToCents,
  formatCentsToBRL,
  getNextCompetence,
  getCurrentCompetence,
  compareCompetence,
  getCompetencesBetween,
} from './calculate';

describe('monthlyFullCents', () => {
  it('computes monthly full cents with simple rounding', () => {
    expect(monthlyFullCents(100_000, 10)).toBe(833); // R$ 1000 a 10% aa -> R$ 8,33/mês
  });

  it('handles 1 centavo asset at 100% (1 year useful life)', () => {
    expect(monthlyFullCents(100, 100)).toBe(8);
  });

  it('rounds correctly for R$ 1.000.000 at 10%', () => {
    // 1.000.000,00 * 10% / 12 = 8333.33 -> arredonda para 8333 cents (R$ 83,33)
    expect(monthlyFullCents(100_000_000, 10)).toBe(833_333);
  });

  it('handles high precision rate (0.5%)', () => {
    // 1000 cents * 0.5 / 1200 = 0.4166... -> round 0
    expect(monthlyFullCents(1_000, 0.5)).toBe(0);
    // 100000 cents * 0.5 / 1200 = 41.666... -> round 42
    expect(monthlyFullCents(100_000, 0.5)).toBe(42);
  });
});

describe('proportionalFirstMonthCents', () => {
  it('computes full month when acquisition is on day 1', () => {
    const date = new Date(2026, 0, 1); // 1/jan
    const value = proportionalFirstMonthCents(120_000, 10, date); // R$ 1200 a 10% aa
    // mensal cheio = 120000 * 10 / 1200 = 1000 cents
    // 31 dias, day=1 => daysRemaining = 31 => 1000 cents
    expect(value).toBe(1000);
  });

  it('computes half month approximately when acquisition on day 15 of 30-day month', () => {
    // Abril/2026: 30 dias, aquisição dia 15 => daysRemaining = 16
    const date = new Date(2026, 3, 15);
    const value = proportionalFirstMonthCents(120_000, 10, date);
    // mensal cheio = 1000 cents. 1000 * 16 / 30 = 533.33 -> round 533
    expect(value).toBe(533);
  });

  it('returns ~half for mid-month in 31-day month', () => {
    // 1/março/2026: 31 dias, aquisição dia 16 => daysRemaining = 16
    const date = new Date(2026, 2, 16);
    const value = proportionalFirstMonthCents(120_000, 10, date);
    // 1000 * 16 / 31 = 516.12 -> round 516
    expect(value).toBe(516);
  });
});

describe('generateSchedule', () => {
  it('produces full amortization for 1-year asset (100% rate)', () => {
    // R$ 1200 a 100% aa => mensal = 100 cents (R$ 1,00). 12 meses * 100 = 1200 cents
    const schedule = generateSchedule({
      acquisitionValue: 120_000,
      annualRate: 100,
      acquisitionDate: new Date(2026, 0, 1),
      depreciationRule: 'MONTH_OF_ACQUISITION',
    });
    expect(schedule.length).toBe(12);
    expect(schedule[schedule.length - 1].accumulatedValue).toBe(120_000);
    expect(schedule[schedule.length - 1].currentValue).toBe(0);
    // Quando depreciação mensal é exata, último mês não absorve — não é residual.
    expect(schedule[schedule.length - 1].isLastResidual).toBe(false);
  });

  it('PROPORTIONAL: residual month closes the gap exactly', () => {
    // R$ 1000 a 10% aa = R$ 8,33/mês. Adquirido em 15/jan/2026.
    // Mês 1 (proporcional, 17 dias restantes de 31): 833 * 17/31 = 456.77 -> 457
    // Meses 2-11: 833 cada -> 10 * 833 = 8330
    // Mês 12 (janeiro/2027) residual: 100000 - 457 - 8330 = 9213
    const schedule = generateSchedule({
      acquisitionValue: 100_000,
      annualRate: 10,
      acquisitionDate: new Date(2026, 0, 15),
      depreciationRule: 'PROPORTIONAL',
    });
    const total = schedule.reduce((sum, m) => sum + m.depreciationValue, 0);
    expect(total).toBe(100_000); // deve fechar exatamente
    expect(schedule[0].isFirstProportional).toBe(true);
    expect(schedule[schedule.length - 1].isLastResidual).toBe(true);
  });

  it('NEXT_MONTH: defers first month by one', () => {
    const schedule = generateSchedule({
      acquisitionValue: 120_000,
      annualRate: 100,
      acquisitionDate: new Date(2026, 0, 15),
      depreciationRule: 'NEXT_MONTH',
    });
    expect(schedule[0].competence).toBe('2026-02'); // começa em fevereiro
    expect(schedule.length).toBe(12);
  });

  it('throws on invalid inputs', () => {
    expect(() =>
      generateSchedule({
        acquisitionValue: 0,
        annualRate: 10,
        acquisitionDate: new Date(),
        depreciationRule: 'MONTH_OF_ACQUISITION',
      })
    ).toThrow();
    expect(() =>
      generateSchedule({
        acquisitionValue: 1000,
        annualRate: 0,
        acquisitionDate: new Date(),
        depreciationRule: 'MONTH_OF_ACQUISITION',
      })
    ).toThrow();
    expect(() =>
      generateSchedule({
        acquisitionValue: 1000,
        annualRate: 200,
        acquisitionDate: new Date(),
        depreciationRule: 'MONTH_OF_ACQUISITION',
      })
    ).toThrow();
  });

  it('handles high value (R$ 10M at 10%) without drift', () => {
    const schedule = generateSchedule({
      acquisitionValue: 1_000_000_000, // R$ 10.000.000,00
      annualRate: 10,
      acquisitionDate: new Date(2026, 0, 1),
      depreciationRule: 'PROPORTIONAL',
    });
    const total = schedule.reduce((sum, m) => sum + m.depreciationValue, 0);
    expect(total).toBe(1_000_000_000);
  });

  it('handles low value (R$ 1.00) without infinite loop', () => {
    const schedule = generateSchedule({
      acquisitionValue: 100,
      annualRate: 100,
      acquisitionDate: new Date(2026, 0, 1),
      depreciationRule: 'MONTH_OF_ACQUISITION',
    });
    const total = schedule.reduce((sum, m) => sum + m.depreciationValue, 0);
    expect(total).toBe(100);
    expect(schedule.length).toBeLessThanOrEqual(600);
  });
});

describe('parseBRLToCents / formatCentsToBRL', () => {
  it('parses pt-BR format', () => {
    expect(parseBRLToCents('1.234,56')).toBe(123_456);
    expect(parseBRLToCents('1234,56')).toBe(123_456);
    expect(parseBRLToCents('1234.56')).toBe(123_456);
    expect(parseBRLToCents('0,99')).toBe(99);
    expect(parseBRLToCents(1234.56)).toBe(123_456);
  });

  it('formats back to BRL', () => {
    expect(formatCentsToBRL(123_456)).toContain('1.234,56');
  });
});

describe('competence helpers', () => {
  it('next competence across year boundary', () => {
    expect(getNextCompetence('2026-12')).toBe('2027-01');
  });

  it('compareCompetence orders correctly', () => {
    expect(compareCompetence('2026-01', '2026-02')).toBe(-1);
    expect(compareCompetence('2026-02', '2026-01')).toBe(1);
    expect(compareCompetence('2026-05', '2026-05')).toBe(0);
  });

  it('getCompetencesBetween includes boundaries', () => {
    const comps = getCompetencesBetween('2026-01', '2026-03');
    expect(comps).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('getCurrentCompetence returns YYYY-MM', () => {
    const comp = getCurrentCompetence();
    expect(comp).toMatch(/^\d{4}-\d{2}$/);
  });
});