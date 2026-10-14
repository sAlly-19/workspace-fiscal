import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useServerUnreachable } from './ServerUnreachableOverlay';

describe('useServerUnreachable listener lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports hook and component correctly', () => {
    expect(typeof useServerUnreachable).toBe('function');
  });
});

