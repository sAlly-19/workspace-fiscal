import zlib from 'zlib';

export const DEFAULT_MAX_DECOMPRESSED_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Descompacta o conteúdo de uma tag docZip da SEFAZ
 * O conteúdo original da SEFAZ é comprimido em GZIP e codificado em Base64.
 * Protegido contra Gzip Bombs limitando a saída a 15 MB por padrão.
 */
export function decompressDocZip(
  base64Content: string,
  maxOutputLength: number = DEFAULT_MAX_DECOMPRESSED_BYTES
): string {
  if (!base64Content || !base64Content.trim()) return '';
  const buffer = Buffer.from(base64Content.trim(), 'base64');
  try {
    const decompressed = zlib.gunzipSync(buffer, { maxOutputLength });
    return decompressed.toString('utf-8');
  } catch (err: any) {
    if (err?.code === 'ERR_BUFFER_TOO_LARGE' || err?.message?.includes('maxOutputLength')) {
      throw new Error(`Falha na descompressão: conteúdo excede o limite máximo permitido de ${Math.round(maxOutputLength / (1024 * 1024))}MB.`);
    }
    throw err;
  }
}

/**
 * Compacta um XML em GZIP e codifica em Base64 (utilizado para Mocks e testes)
 */
export function compressToDocZip(xmlContent: string): string {
  const buffer = Buffer.from(xmlContent, 'utf-8');
  const compressed = zlib.gzipSync(buffer);
  return compressed.toString('base64');
}
