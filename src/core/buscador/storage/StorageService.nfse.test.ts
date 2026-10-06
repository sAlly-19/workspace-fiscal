import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseManager } from '../database/connection';
import type { Company } from '../domain/types';
import { ReconciliationService } from './ReconciliationService';
import { StorageService } from './StorageService';

const temporaryDirectories: string[] = [];
const company: Company = {
  id: 1,
  name: 'Empresa Teste',
  cnpj: '12345678000190',
  is_active: true,
  created_at: '2026-10-06T10:00:00.000Z',
  updated_at: '2026-10-06T10:00:00.000Z',
};

function temporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-fiscal-storage-nfse-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('StorageService for NFS-e', () => {
  it('stores the original XML under type and environment and returns its SHA-256', () => {
    const root = temporaryDirectory();
    const storage = new StorageService(root);
    const key = '1'.repeat(50);
    const xml = '<NFSe>conteúdo original</NFSe>\r\n';

    const pending = storage.saveXmlTransactional(
      company,
      'NFSE',
      'homologation',
      key,
      xml,
      '2026-10-06T10:00:00-03:00',
      'NFSe_v1.01'
    );

    expect(pending.filePath).toBe(path.join(
      root,
      `${company.cnpj}_${company.name}`,
      'NFSE',
      'homologation',
      '2026',
      '10',
      `${key}.xml`
    ));
    expect(fs.readFileSync(pending.filePath, 'utf8')).toBe(xml);
    expect(pending.contentHash).toBe(createHash('sha256').update(Buffer.from(xml, 'utf8')).digest('hex'));

    pending.commit();
    pending.rollback();
    expect(fs.existsSync(pending.filePath)).toBe(true);
  });

  it('rolls back a pending NFS-e write without leaving a file', () => {
    const storage = new StorageService(temporaryDirectory());
    const pending = storage.saveXmlTransactional(
      company,
      'NFSE',
      'production',
      '2'.repeat(50),
      Buffer.from([0x3c, 0x78, 0x2f, 0x3e]),
      '2026-01-02'
    );

    pending.rollback();

    expect(fs.existsSync(pending.filePath)).toBe(false);
  });

  it('keeps 44-digit and 50-digit key rules isolated by document type', () => {
    const storage = new StorageService(temporaryDirectory());

    expect(() => storage.saveXmlTransactional(
      company, 'NFE', 'production', '3'.repeat(44), '<NFe/>', '2026-01-02'
    )).not.toThrow();
    expect(() => storage.saveXmlTransactional(
      company, 'CTE', 'homologation', '4'.repeat(44), '<CTe/>', '2026-01-02'
    )).not.toThrow();
    expect(() => storage.saveXmlTransactional(
      company, 'NFSE', 'production', '5'.repeat(44), '<NFSe/>', '2026-01-02'
    )).toThrow('50 dígitos');
    expect(() => storage.saveXmlTransactional(
      company, 'NFE', 'production', '6'.repeat(50), '<NFe/>', '2026-01-02'
    )).toThrow('44 dígitos');
  });

  it('rejects traversal text instead of converting it into an access key', () => {
    const storage = new StorageService(temporaryDirectory());

    expect(() => storage.saveXmlTransactional(
      company,
      'NFSE',
      'production',
      `../${'7'.repeat(50)}`,
      '<NFSe/>',
      '2026-01-02'
    )).toThrow();
  });
});

describe('ReconciliationService for NFS-e', () => {
  it('reconciles XML without treating PDF as an NFS-e artifact', async () => {
    const root = temporaryDirectory();
    const xmlPath = path.join(root, 'missing.xml');
    const db = await DatabaseManager.create(':memory:');
    db.execute("INSERT INTO companies (id, name, cnpj, is_active) VALUES (1, 'Empresa', '12345678000190', 1);");
    db.execute(
      `INSERT INTO documents (
        company_id, document_type, environment, origin, nsu, schema_type, access_key, content_hash,
        xml_path, pdf_path, xml_status, pdf_status, situacao_fiscal
      ) VALUES (1, 'NFSE', 'production', 'NFSE_SEFIN_DIRECT', '0', 'NFSe_v1.01', ?, 'hash',
        ?, 'C:/danfse/nao-deve-ser-consultado.pdf', 'XML_DISPONIVEL', 'PDF_DISPONIVEL', 'AUTORIZADA');`,
      ['8'.repeat(50), xmlPath]
    );

    const report = new ReconciliationService(db).reconcileCompanyStorage(1);

    expect(report).toMatchObject({
      checkedCount: 1,
      missingXmlCount: 1,
      missingPdfCount: 0,
      repairedCount: 1,
    });
    expect(db.queryOne<{ xml_status: string; pdf_status: string }>(
      'SELECT xml_status, pdf_status FROM documents WHERE company_id = 1;'
    )).toEqual({ xml_status: 'XML_INDISPONIVEL', pdf_status: 'PDF_INDISPONIVEL' });
  });
});
