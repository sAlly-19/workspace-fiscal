import { describe, it, expect } from 'vitest';
import { parseFiscalNumber } from './xml-number.utils';

describe('parseFiscalNumber', () => {
  it('converts international XML standard numbers with dot and no comma correctly', () => {
    expect(parseFiscalNumber('1234.56')).toBe(1234.56);
    expect(parseFiscalNumber('100.00')).toBe(100);
    expect(parseFiscalNumber('0.4567')).toBe(0.4567);
    expect(parseFiscalNumber('9999999.99')).toBe(9999999.99);
  });

  it('converts Brazilian format with thousands dots and decimal comma correctly', () => {
    expect(parseFiscalNumber('1.234,56')).toBe(1234.56);
    expect(parseFiscalNumber('1.000.000,50')).toBe(1000000.5);
    expect(parseFiscalNumber('12.345.678,90')).toBe(12345678.9);
  });

  it('converts Brazilian format with comma and no thousands dots correctly', () => {
    expect(parseFiscalNumber('1234,56')).toBe(1234.56);
    expect(parseFiscalNumber('0,99')).toBe(0.99);
    expect(parseFiscalNumber('50,00')).toBe(50);
  });

  it('handles native numbers without modification', () => {
    expect(parseFiscalNumber(1234.56)).toBe(1234.56);
    expect(parseFiscalNumber(0)).toBe(0);
    expect(parseFiscalNumber(-42.5)).toBe(-42.5);
  });

  it('handles empty, null, undefined and invalid strings safely', () => {
    expect(parseFiscalNumber(null)).toBe(0);
    expect(parseFiscalNumber(undefined)).toBe(0);
    expect(parseFiscalNumber('')).toBe(0);
    expect(parseFiscalNumber('   ')).toBe(0);
    expect(parseFiscalNumber('not-a-number')).toBe(0);
    expect(parseFiscalNumber(NaN)).toBe(0);
  });
});
