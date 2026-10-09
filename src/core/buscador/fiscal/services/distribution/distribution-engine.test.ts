import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  throwIfAborted,
  delayWithAbort,
} from './index';

describe('Distribution Engine Modules', () => {
  it('formatDate formats ISO dates to pt-BR or fallback', () => {
    const formatted = formatDate('2026-10-15T00:00:00Z');
    expect(formatted).toMatch(/14\/10\/2026|15\/10\/2026/); // Dependente de timezone local
    expect(formatDate('invalid-date')).toBe('invalid-date');
  });

  it('formatDateTime formats ISO date-times', () => {
    const formatted = formatDateTime('2026-10-15T12:00:00Z');
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(5);
  });

  it('throwIfAborted throws only when signal is aborted', () => {
    const controller = new AbortController();
    expect(() => throwIfAborted(controller.signal)).not.toThrow();

    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow('Consulta cancelada pelo usuário.');
  });

  it('delayWithAbort aborts early when signal is aborted', async () => {
    const controller = new AbortController();
    const promise = delayWithAbort(5000, controller.signal);
    controller.abort();
    await expect(promise).rejects.toThrow('Consulta cancelada pelo usuário.');
  });
});

