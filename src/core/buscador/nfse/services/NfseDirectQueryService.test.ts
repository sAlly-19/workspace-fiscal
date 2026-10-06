import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase, DatabaseManager } from '../../database/connection';
import { CompanyRepository } from '../../database/repositories/CompanyRepository';
import { CertificateRepository } from '../../database/repositories/CertificateRepository';
import { DistributionStateRepository } from '../../database/repositories/DistributionStateRepository';
import { DocumentRepository } from '../../database/repositories/DocumentRepository';
import { SettingsRepository } from '../../database/repositories/SettingsRepository';
import { NfseEventRepository } from '../../database/repositories/NfseEventRepository';
import { StorageService } from '../../storage/StorageService';
import { NfsePersistenceService } from './NfsePersistenceService';
import { NfseDirectQueryService } from './NfseDirectQueryService';
import type { NfseGateway } from '../clients/NfseGateway';
import type { Company } from '../../domain/types';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('NfseDirectQueryService', () => {
  let db: DatabaseManager;
  let companyRepo: CompanyRepository;
  let certRepo: CertificateRepository;
  let distStateRepo: DistributionStateRepository;
  let docRepo: DocumentRepository;
  let settingsRepo: SettingsRepository;
  let eventRepo: NfseEventRepository;
  let storage: StorageService;
  let persistence: NfsePersistenceService;
  let directQuery: NfseDirectQueryService;
  let tempDir: string;
  let company: Company;

  const validKey = '35260112345678000190550010000000011000000012345678';
  const sampleXml = `<NFSe><infNFSe Id="NFS${validKey}"><numero>1</numero><serie>1</serie><dEmi>2026-03-15T10:00:00</dEmi><valores><vLiq>100.00</vLiq></valores><emit><CNPJ>12345678000190</CNPJ><xNome>Prestador Demo</xNome></emit><toma><CNPJ>98765432000198</CNPJ><xNome>Tomador Demo</xNome></toma></infNFSe></NFSe>`;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wsf-nfse-direct-test-'));
    const dbPath = path.join(tempDir, 'test.db');
    db = await getDatabase(dbPath);
    companyRepo = new CompanyRepository(db);
    certRepo = new CertificateRepository(db);
    distStateRepo = new DistributionStateRepository(db);
    docRepo = new DocumentRepository(db);
    settingsRepo = new SettingsRepository(db);
    eventRepo = new NfseEventRepository(db);
    storage = new StorageService(path.join(tempDir, 'docs'));
    persistence = new NfsePersistenceService(db, docRepo, eventRepo, distStateRepo, storage);

    company = companyRepo.create({
      name: 'Empresa Teste',
      cnpj: '12345678000190',
      uf: 'SP',
    });

    certRepo.associate(company.id, {
      subject: 'Empresa Teste',
      issuer: 'Autoridade Certificadora Demo',
      serial_number: '123456',
      thumbprint: 'AABBCCDDEEFF',
      valid_from: new Date(Date.now() - 100000).toISOString(),
      valid_to: new Date(Date.now() + 10000000).toISOString(),
      provider: 'windows_store',
      has_private_key: true,
      is_expired: false,
    });
  });

  it('consulta chave de 50 digitos e persiste com origem NFSE_SEFIN_DIRECT sem alterar NSU', async () => {
    const initialState = distStateRepo.updateNSU(company.id, 'NFSE', '42', '100', 'IDLE', undefined, 'homologation');

    const fakeGateway: NfseGateway = {
      async distribute() { throw new Error('Not implemented'); },
      async consultByKey(input) {
        return {
          kind: 'NFSE',
          schemaType: 'DPS',
          xml: sampleXml,
          accessKey: input.accessKey,
        };
      },
      async consultEvents() { return []; },
    };

    directQuery = new NfseDirectQueryService(
      companyRepo,
      certRepo,
      docRepo,
      settingsRepo,
      persistence,
      fakeGateway
    );

    const result = await directQuery.queryByKey({
      companyId: company.id,
      accessKey: validKey,
      environment: 'homologation',
    });

    expect(result.success).toBe(true);
    expect(result.document).toBeDefined();
    expect(result.document?.access_key).toBe(validKey);
    expect(result.document?.origin).toBe('NFSE_SEFIN_DIRECT');

    const state = distStateRepo.getOrCreate(company.id, 'NFSE', 'homologation');
    expect(state.last_nsu).toBe('42');
    expect(state.max_nsu).toBe('100');
  });

  it('rejeita chave com tamanho invalido', async () => {
    const fakeGateway: NfseGateway = {
      async distribute() { throw new Error('Not implemented'); },
      async consultByKey() { throw new Error('Not implemented'); },
      async consultEvents() { return []; },
    };

    directQuery = new NfseDirectQueryService(
      companyRepo,
      certRepo,
      docRepo,
      settingsRepo,
      persistence,
      fakeGateway
    );

    await expect(
      directQuery.queryByKey({
        companyId: company.id,
        accessKey: '1234567890',
        environment: 'homologation',
      })
    ).rejects.toThrow('50 dígitos');
  });
});
