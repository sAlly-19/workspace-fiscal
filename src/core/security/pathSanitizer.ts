import path from 'path';

export class PathTraversalError extends Error {
  constructor(message = 'Acesso fora do diretório autorizado negado.') {
    super(message);
    this.name = 'PathTraversalError';
  }
}

const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Sanitiza um nome de arquivo ou diretório removendo directory traversal,
 * caracteres ilegais para o Windows e neutralizando nomes reservados de sistema.
 */
export function sanitizeFileName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  // Remove qualquer prefixo de directory traversal e extrai basename
  const base = path.basename(trimmed);
  let sanitized = base
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .trim()
    .substring(0, 255);

  if (!sanitized) return 'unnamed_file';

  const baseNoExt = sanitized.split('.')[0] || '';
  if (WINDOWS_RESERVED_NAMES.test(baseNoExt.toLowerCase())) {
    sanitized = `_${sanitized}`;
  }

  return sanitized;
}

/**
 * Valida se targetPath reside estritamente dentro do baseDir
 */
export function isPathSafe(baseDir: string, targetPath: string): boolean {
  if (!baseDir || !targetPath) return false;
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedBase, resolvedTarget);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Garante que targetPath reside dentro de baseDir, retornando o caminho resolvido
 * ou lançando PathTraversalError.
 */
export function assertInsideDirectory(baseDir: string, targetPath: string): string {
  if (!isPathSafe(baseDir, targetPath)) {
    throw new PathTraversalError(`Tentativa de violação de diretório detectada: ${targetPath}`);
  }
  return path.resolve(targetPath);
}
