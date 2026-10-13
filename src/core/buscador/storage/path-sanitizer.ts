import path from 'path';
import type { DocumentType, SefazEnvironment } from '../domain/types';
import {
  sanitizeFileName as baseSanitizeFileName,
  isPathSafe as baseIsPathSafe,
  assertInsideDirectory,
  PathTraversalError,
} from '../../security/pathSanitizer';

export { assertInsideDirectory, PathTraversalError };

/**
 * Sanitiza um nome de arquivo ou pasta utilizando o módulo central pathSanitizer
 */
export function sanitizeFilename(filename: string): string {
  return baseSanitizeFileName(filename);
}

/**
 * Valida se o caminho final de destino reside estritamente dentro do diretório base permitido,
 * prevenindo qualquer ataque de Path Traversal (Directory Traversal)
 */
export function isSafeSubpath(baseDir: string, targetPath: string): boolean {
  return baseIsPathSafe(baseDir, targetPath);
}

/**
 * Monta e valida um caminho seguro para armazenamento de documentos fiscais
 * Estrutura: <baseDir>/<companyFolder>/<docType>/<year>/<month>/<accessKey>.<extension>
 */
export function buildSafeDocumentPath(
  baseDir: string,
  companyFolder: string,
  docType: DocumentType,
  environment: SefazEnvironment,
  year: string,
  month: string,
  filename: string
): string {
  const safeCompany = sanitizeFilename(companyFolder);
  const safeDocType = docType === 'NFE' ? 'NFe' : docType === 'CTE' ? 'CTe' : 'NFSE';
  const safeEnvironment = environment === 'production' ? 'production' : 'homologation';
  const safeYear = sanitizeFilename(year);
  const safeMonth = sanitizeFilename(month);
  const safeFilename = sanitizeFilename(filename);

  const fullPath = path.join(baseDir, safeCompany, safeDocType, safeEnvironment, safeYear, safeMonth, safeFilename);

  if (!isSafeSubpath(baseDir, fullPath)) {
    throw new Error(`Tentativa de violação de diretório seguro detectada: ${fullPath}`);
  }

  return fullPath;
}
