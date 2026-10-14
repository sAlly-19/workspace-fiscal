import { describe, it, expect } from 'vitest';
import React from 'react';
import { DanfeTaxTotals } from './DanfeTaxTotals';

describe('DanfeTaxTotals - RTC 2026 Box', () => {
  const baseProps = {
    baseIcms: 1000,
    valorIcms: 180,
    baseIcmsSt: 0,
    valorIcmsSt: 0,
    impImportacao: 0,
    icmsUfRemet: 0,
    fcpUfDest: 0,
    pis: 16.5,
    valorProdutos: 1000,
    valorFrete: 0,
    valorSeguro: 0,
    valorDesconto: 0,
    outrasDespesas: 0,
    valorIpi: 0,
    icmsUfDest: 0,
    totalTrib: 250,
    cofins: 76,
    valorTotalNota: 1000,
  };

  it('does NOT render RTC box when RTC taxes are absent', () => {
    const tree = DanfeTaxTotals(baseProps);
    const serialized = JSON.stringify(tree);
    expect(serialized).not.toContain('REFORMA TRIBUTÁRIA (RTC 2026)');
  });

  it('renders RTC box with IBS, CBS, IS when values are provided', () => {
    const tree = DanfeTaxTotals({
      ...baseProps,
      valorIbs: 10.5,
      baseIbs: 1000,
      valorCbs: 58.2,
      baseCbs: 1000,
      valorIs: 15.0,
      baseIs: 1000,
    });
    const serialized = JSON.stringify(tree);
    expect(serialized).toContain('REFORMA TRIBUTÁRIA (RTC 2026)');
    expect(serialized).toContain('VALOR DO IBS');
    expect(serialized).toContain('10.50');
    expect(serialized).toContain('VALOR DA CBS');
    expect(serialized).toContain('58.20');
    expect(serialized).toContain('IMPOSTO SELETIVO');
    expect(serialized).toContain('15.00');
  });
});

