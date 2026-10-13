import { describe, it, expect } from 'vitest';
import path from 'path';
import {
  sanitizeFileName,
  isPathSafe,
  assertInsideDirectory,
  PathTraversalError,
} from './pathSanitizer';

describe('pathSanitizer', () => {
  it('remove separadores de diretorio e traversal em nomes de arquivos', () => {
    expect(sanitizeFileName('../../test.xml')).toBe('test.xml');
    expect(sanitizeFileName('..\\..\\malicious.zip')).toBe('malicious.zip');
    expect(sanitizeFileName('foo/bar/baz.xml')).toBe('baz.xml');
  });

  it('neutraliza nomes reservados do Windows com prefixo seguro', () => {
    expect(sanitizeFileName('CON.xml')).toBe('_CON.xml');
    expect(sanitizeFileName('aux')).toBe('_aux');
    expect(sanitizeFileName('NUL.txt')).toBe('_NUL.txt');
    expect(sanitizeFileName('com1.pdf')).toBe('_com1.pdf');
    expect(sanitizeFileName('lpt9.xml')).toBe('_lpt9.xml');
  });

  it('remove caracteres perigosos e de controle no Windows', () => {
    expect(sanitizeFileName('bad:file*name?.xml')).toBe('bad_file_name_.xml');
    expect(sanitizeFileName('evil\x00file.xml')).toBe('evil_file.xml');
    expect(sanitizeFileName('pipe|redirect>file<name.xml')).toBe('pipe_redirect_file_name.xml');
  });

  it('retorna fallback valido para nomes vazios ou puramente ilegais', () => {
    expect(sanitizeFileName('')).toBe('');
    expect(sanitizeFileName('   ')).toBe('');
    expect(sanitizeFileName('...')).toBe('unnamed_file');
  });

  it('detecta se caminho alvo permanece dentro do diretorio base', () => {
    const base = path.resolve('storage');
    expect(isPathSafe(base, path.join(base, 'file.xml'))).toBe(true);
    expect(isPathSafe(base, path.join(base, 'sub', 'file.xml'))).toBe(true);
    expect(isPathSafe(base, path.join(base, '..', 'evil.xml'))).toBe(false);
    expect(isPathSafe(base, path.resolve('/outside/file.xml'))).toBe(false);
  });

  it('assertInsideDirectory retorna caminho resolvido valido', () => {
    const base = path.resolve('storage');
    const target = path.join(base, 'documents', '123.xml');
    const result = assertInsideDirectory(base, target);
    expect(result).toBe(path.resolve(target));
  });

  it('assertInsideDirectory lanca PathTraversalError quando fora do diretorio base', () => {
    const base = path.resolve('storage');
    expect(() => assertInsideDirectory(base, path.join(base, '..', 'root.xml'))).toThrow(PathTraversalError);
    expect(() => assertInsideDirectory(base, path.resolve('/etc/passwd'))).toThrow(PathTraversalError);
  });
});

