import { describe, it, expect } from 'vitest';
import { calculateRemainingSeconds, formatRemainingTime } from './cooldown';

describe('cooldown utils', () => {
  describe('calculateRemainingSeconds', () => {
    it('returns 0 for null or undefined target', () => {
      expect(calculateRemainingSeconds(null)).toBe(0);
      expect(calculateRemainingSeconds(undefined)).toBe(0);
      expect(calculateRemainingSeconds('')).toBe(0);
    });

    it('returns 0 if target is in the past or invalid', () => {
      const now = Date.parse('2020-01-01T00:00:00Z') + 10000;
      expect(calculateRemainingSeconds('2020-01-01T00:00:00Z', now)).toBe(0);
      expect(calculateRemainingSeconds('invalid-date', now)).toBe(0);
    });

    it('returns ceiling of seconds remaining if in future', () => {
      const now = 1000000;
      const future = new Date(now + 65400).toISOString(); // 65.4 seconds in future
      expect(calculateRemainingSeconds(future, now)).toBe(66);
    });
  });

  describe('formatRemainingTime', () => {
    it('returns empty string for 0 or negative seconds', () => {
      expect(formatRemainingTime(0)).toBe('');
      expect(formatRemainingTime(-10)).toBe('');
    });

    it('formats mm:ss when under 1 hour', () => {
      expect(formatRemainingTime(45)).toBe('00:45');
      expect(formatRemainingTime(60)).toBe('01:00');
      expect(formatRemainingTime(3599)).toBe('59:59');
    });

    it('formats hh:mm:ss when 1 hour or more', () => {
      expect(formatRemainingTime(3600)).toBe('01:00:00');
      expect(formatRemainingTime(3665)).toBe('01:01:05');
      expect(formatRemainingTime(7200)).toBe('02:00:00');
    });
  });
});
