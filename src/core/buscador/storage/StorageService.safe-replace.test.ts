import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { StorageService, safeReplaceFileSync } from './StorageService';
import type { Company } from '../domain/types';

describe('StorageService Windows-resilient safe replacement', () => {
  let tmpDir: string;
  const company: Company = {
    id: 1,
    name: 'SUPREME',
    cnpj: '45500200000141',
    is_active: true,
    created_at: '2026-10-09T00:00:00Z',
    updated_at: '2026-10-09T00:00:00Z',
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('safeReplaceFileSync moves a new file to target path', () => {
    const src = path.join(tmpDir, 'source.tmp');
    const dest = path.join(tmpDir, 'dest.xml');
    fs.writeFileSync(src, '<xml>data</xml>');

    safeReplaceFileSync(src, dest);

    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, 'utf8')).toBe('<xml>data</xml>');
    expect(fs.existsSync(src)).toBe(false);
  });

  it('safeReplaceFileSync overwrites an existing destination file', () => {
    const src = path.join(tmpDir, 'source2.tmp');
    const dest = path.join(tmpDir, 'dest2.xml');
    fs.writeFileSync(dest, '<xml>old</xml>');
    fs.writeFileSync(src, '<xml>new</xml>');

    safeReplaceFileSync(src, dest);

    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, 'utf8')).toBe('<xml>new</xml>');
    expect(fs.existsSync(src)).toBe(false);
  });

  it('safeReplaceFileSync falls back to copy+unlink if renameSync throws EPERM', () => {
    const src = path.join(tmpDir, 'source-eperm.tmp');
    const dest = path.join(tmpDir, 'dest-eperm.xml');
    fs.writeFileSync(src, '<xml>eperm-test</xml>');

    const originalRename = fs.renameSync;
    let renameCalls = 0;
    // Simula falha EPERM típica do Windows Defender
    vi.spyOn(fs, 'renameSync').mockImplementation((oldPath, newPath) => {
      renameCalls++;
      const err: any = new Error('operation not permitted, rename');
      err.code = 'EPERM';
      throw err;
    });

    try {
      safeReplaceFileSync(src, dest);

      expect(fs.existsSync(dest)).toBe(true);
      expect(fs.readFileSync(dest, 'utf8')).toBe('<xml>eperm-test</xml>');
      expect(renameCalls).toBeGreaterThan(1); // verificou que tentou retry
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('StorageService successfully executes rapid batch writes without EPERM', () => {
    const storage = new StorageService(tmpDir);
    const keyBase = '522609180709500001585500100000032411544277'; // 42 dígitos

    // Salva 50 arquivos sequencialmente em ritmo acelerado
    for (let i = 0; i < 50; i++) {
      const accessKey = `${keyBase}${String(i).padStart(2, '0')}`;
      const xml = `<NFe><nsu>${i}</nsu></NFe>`;
      const savedPath = storage.saveXml(
        company,
        'NFE',
        'production',
        accessKey,
        xml,
        '2026-09-15'
      );
      expect(fs.existsSync(savedPath)).toBe(true);
      expect(fs.readFileSync(savedPath, 'utf8')).toBe(xml);
    }
  });
});

