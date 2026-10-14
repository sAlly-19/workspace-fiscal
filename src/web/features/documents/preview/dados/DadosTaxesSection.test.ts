import { describe, it, expect } from 'vitest';
import React from 'react';
import { DadosTaxesSection } from './DadosTaxesSection';

describe('DadosTaxesSection - RTC 2026 and Legacy Tests', () => {
  it('renders standard ICMS and PIS/COFINS without RTC cards when RTC taxes are absent', () => {
    const legacyDoc = {
      totals: {
        totalTaxes: 100,
        icmsBase: 1000,
        taxes: {
          icms: 180,
          pis: 16.5,
          cofins: 76,
        },
      },
    };

    const tree = DadosTaxesSection({ doc: legacyDoc, isLight: true });
    expect(tree).not.toBeNull();
    const textContents = JSON.stringify(tree);
    expect(textContents).not.toContain('IBS');
    expect(textContents).not.toContain('CBS');
    expect(textContents).not.toContain('Imposto Seletivo');
  });

  it('renders IBS, CBS and IS cards when present in totals.taxes', () => {
    const rtcDoc = {
      totals: {
        totalTaxes: 250,
        taxes: {
          icms: 100,
          ibs: 10.5,
          ibsBase: 1000,
          ibsAliq: 1.05,
          cbs: 58.2,
          cbsBase: 1000,
          cbsAliq: 5.82,
          is: 15.0,
          isBase: 1000,
          isAliq: 1.5,
        },
      },
    };

    const tree = DadosTaxesSection({ doc: rtcDoc, isLight: false });
    expect(tree).not.toBeNull();
    const textContents = JSON.stringify(tree);
    expect(textContents).toContain('IBS');
    expect(textContents).toContain('CBS');
    expect(textContents).toContain('Imposto Seletivo');
    expect(textContents).toContain('10.50');
    expect(textContents).toContain('58.20');
    expect(textContents).toContain('15.00');
  });
});

