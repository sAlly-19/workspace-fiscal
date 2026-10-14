import { describe, it, expect } from 'vitest';
import { sanitizeAccessKey, isValidAccessKey, parseAccessKey, formatAccessKey } from './access-key';

describe('Access Key Domain (Chave de Acesso DFe 44 caracteres)', () => {
  // Chave numérica válida tradicional (DV calculado)
  // cUF: 35, AAMM: 2601, CNPJ: 11222333000181, mod: 55, serie: 001, nNF: 000000001, tpEmis: 1, cNF: 12345678
  // Base 43 chars: 3526011122233300018155001000000001112345678
  // Vamos validar o cálculo
  describe('sanitizeAccessKey', () => {
    it('sanitizes and preserves alphanumeric characters in uppercase', () => {
      expect(sanitizeAccessKey('3526 0111 2223 3300 0181 5500 1000 0000 0111 2345 6789')).toBe(
        '35260111222333000181550010000000011123456789'
      );
      expect(sanitizeAccessKey('3526 0112 abc3 4501 de35 5500 1000 0000 0111 2345 6789')).toBe(
        '35260112ABC34501DE35550010000000011123456789'
      );
    });
  });

  describe('formatAccessKey', () => {
    it('formats 44-char key in blocks of 4', () => {
      const key = '35260111222333000181550010000000011123456789';
      expect(formatAccessKey(key)).toBe('3526 0111 2223 3300 0181 5500 1000 0000 0111 2345 6789');
    });
  });

  describe('isValidAccessKey', () => {
    it('validates a correct traditional numeric access key', () => {
      // Base: 3526011122233300018155001000000001112345678
      // Let's compute DV manually to verify:
      // weights from right to left:
      // index 42 ('8') * 2, index 41 ('7') * 3 ...
      // Let's test with a known valid key or let isValidAccessKey calculate
      const base = '3526011122233300018155001000000001112345678';
      let w = 2;
      let s = 0;
      for (let i = base.length - 1; i >= 0; i--) {
        s += Number(base[i]) * w;
        w = w >= 9 ? 2 : w + 1;
      }
      const rem = s % 11;
      const dv = rem === 0 || rem === 1 ? 0 : 11 - rem;
      const validKey = `${base}${dv}`;

      expect(isValidAccessKey(validKey)).toBe(true);
      expect(isValidAccessKey(`${base}${(dv + 1) % 10}`)).toBe(false);
    });

    it('validates a correct alphanumeric access key under IN RFB 2.229/2024 and RTC 2026', () => {
      // cUF: 35, AAMM: 2601, CNPJ: 12ABC34501DE35 (indices 6..19, where 6..17 has letters, 18..19 is 35),
      // mod: 55, serie: 001, nNF: 000000001, tpEmis: 1, cNF: 12345678
      const baseAlpha = '35260112ABC34501DE3555001000000001112345678';
      let w = 2;
      let s = 0;
      for (let i = baseAlpha.length - 1; i >= 0; i--) {
        s += (baseAlpha.charCodeAt(i) - 48) * w;
        w = w >= 9 ? 2 : w + 1;
      }
      const rem = s % 11;
      const dv = rem === 0 || rem === 1 ? 0 : 11 - rem;
      const validAlphaKey = `${baseAlpha}${dv}`;

      expect(isValidAccessKey(validAlphaKey)).toBe(true);
      expect(isValidAccessKey(`${baseAlpha}${(dv + 1) % 10}`)).toBe(false);
    });

    it('rejects keys where letters appear outside CNPJ positions (indices 6 to 17)', () => {
      // Let cUF have letters: 'SP2601...'
      expect(isValidAccessKey('SP260111222333000181550010000000011123456780')).toBe(false);
      // Let serie have letters:
      expect(isValidAccessKey('3526011122233300018155ABC0000000011123456780')).toBe(false);
      // Let cDV be a letter:
      expect(isValidAccessKey('3526011122233300018155001000000001112345678X')).toBe(false);
    });

    it('rejects keys with length different from 44', () => {
      expect(isValidAccessKey('123')).toBe(false);
      expect(isValidAccessKey('3526011122233300018155001000000001112345678')).toBe(false);
    });
  });

  describe('parseAccessKey', () => {
    it('decomposes alphanumeric access keys properly', () => {
      const parsed = parseAccessKey('3526 0112 ABC3 4501 DE35 5500 1000 0000 0111 2345 6789');
      expect(parsed).not.toBeNull();
      expect(parsed?.cUF).toBe('35');
      expect(parsed?.anoMes).toBe('2601');
      expect(parsed?.cnpj).toBe('12ABC34501DE35');
      expect(parsed?.modelo).toBe('55');
      expect(parsed?.serie).toBe('001');
      expect(parsed?.numero).toBe('000000001');
      expect(parsed?.tipoEmissao).toBe('1');
      expect(parsed?.codigoNumerico).toBe('12345678');
      expect(parsed?.dv).toBe('9');
    });
  });
});

