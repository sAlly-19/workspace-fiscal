import { describe, it, expect } from 'vitest';
import { sanitizeCNPJ, formatCNPJ, isValidCNPJ } from './cnpj';

describe('CNPJ Domain (IN RFB 2.229/2024 & Padrão Tradicional)', () => {
  describe('sanitizeCNPJ', () => {
    it('removes non-alphanumeric punctuation and converts to uppercase', () => {
      expect(sanitizeCNPJ('11.222.333/0001-81')).toBe('11222333000181');
      expect(sanitizeCNPJ('12.abc.345/01de-35')).toBe('12ABC34501DE35');
      expect(sanitizeCNPJ('')).toBe('');
    });
  });

  describe('formatCNPJ', () => {
    it('formats 14-char numeric and alphanumeric CNPJs into XX.XXX.XXX/XXXX-XX', () => {
      expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81');
      expect(formatCNPJ('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
      expect(formatCNPJ('123')).toBe('123');
    });
  });

  describe('isValidCNPJ', () => {
    it('accepts valid traditional numeric CNPJs', () => {
      expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
      expect(isValidCNPJ('00.000.000/0001-91')).toBe(true);
    });

    it('rejects invalid traditional numeric CNPJs and repeated digits', () => {
      expect(isValidCNPJ('11.222.333/0001-82')).toBe(false);
      expect(isValidCNPJ('00.000.000/0000-00')).toBe(false);
      expect(isValidCNPJ('11.111.111/1111-11')).toBe(false);
    });

    it('accepts valid alphanumeric CNPJs under IN RFB 2.229/2024 (ASCII - 48)', () => {
      // 12ABC34501DE: D1 = 3, D2 = 5
      expect(isValidCNPJ('12.ABC.345/01DE-35')).toBe(true);
      expect(isValidCNPJ('12ABC34501DE35')).toBe(true);
    });

    it('rejects alphanumeric CNPJs with wrong check digits', () => {
      expect(isValidCNPJ('12.ABC.345/01DE-34')).toBe(false);
      expect(isValidCNPJ('12.ABC.345/01DE-36')).toBe(false);
    });

    it('rejects CNPJs where check digits are alphabetic (strict /^[A-Z0-9]{12}[0-9]{2}$/)', () => {
      expect(isValidCNPJ('12ABC34501DEAB')).toBe(false);
      expect(isValidCNPJ('1122233300018A')).toBe(false);
    });

    it('rejects repeated character sequences in alphanumeric format', () => {
      expect(isValidCNPJ('AAAAAAAAAAAAAA')).toBe(false);
    });

    it('accepts synthetic CNPJs when allowSynthetic is enabled', () => {
      expect(isValidCNPJ('99.999.999/9999-99', { allowSynthetic: true })).toBe(true);
      expect(isValidCNPJ('12345678000199', { allowSynthetic: true })).toBe(true);
      expect(isValidCNPJ('invalid', { allowSynthetic: true })).toBe(false);
    });
  });
});

