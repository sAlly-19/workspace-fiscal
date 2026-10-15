import { describe, it, expect } from 'vitest';
import zlib from 'zlib';
import { decompressDocZip, compressToDocZip } from './compression';

describe('compression utils - decompressDocZip & compressToDocZip (IMP-T01)', () => {
  it('correctly compresses and decompresses standard XML content', () => {
    const xml = '<nfeProc><NFe><infNFe Id="NFe123"><total><vNF>100.00</vNF></total></infNFe></NFe></nfeProc>';
    const compressedB64 = compressToDocZip(xml);
    expect(typeof compressedB64).toBe('string');
    expect(compressedB64.length).toBeGreaterThan(0);

    const decompressed = decompressDocZip(compressedB64);
    expect(decompressed).toBe(xml);
  });

  it('returns empty string when given empty or whitespace base64 input', () => {
    expect(decompressDocZip('')).toBe('');
    expect(decompressDocZip('   ')).toBe('');
  });

  it('rejects payloads that exceed maxOutputLength (15 MB protection against Gzip bombs)', () => {
    // Cria um payload comprimido com 16 MB de dados repetitivos (que comprime para poucos KB)
    const largeXml = '<doc>' + 'A'.repeat(16 * 1024 * 1024) + '</doc>';
    const compressedLarge = compressToDocZip(largeXml);

    // Deve lançar erro por exceder 15MB
    expect(() => decompressDocZip(compressedLarge)).toThrow(/(maxOutputLength|ERR_BUFFER_TOO_LARGE|limite máximo|demasiado grande)/i);
  });
});
