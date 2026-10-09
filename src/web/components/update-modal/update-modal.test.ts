import { describe, it, expect } from 'vitest';
import { formatBytes } from './index';

describe('Update Modal Modules', () => {
  it('formatBytes converts bytes into human-readable BRL strings', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-100)).toBe('0 B');
    expect(formatBytes(undefined)).toBe('0 B');
    expect(formatBytes(500)).toBe('500,0 B');
    expect(formatBytes(1024)).toBe('1,0 KB');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(1048576)).toBe('1,0 MB');
    expect(formatBytes(1073741824)).toBe('1,0 GB');
  });
});

