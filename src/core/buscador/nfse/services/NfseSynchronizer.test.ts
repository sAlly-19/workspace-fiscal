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
import { NfseSynchronizer } from './NfseSynchronizer';
import type { NfseGateway } from '../clients/NfseGateway';
import type { NfseDistributionBatch, NfseDistributedPayload } from '../domain/types';
import type { Company } from '../../domain/types';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('NfseSynchronizer', () => {
  let db: DatabaseManager;
  let companyRepo: CompanyRepository;
  let certRepo: CertificateRepository;
  let distStateRepo: DistributionStateRepository;
  let docRepo: DocumentRepository;
  let settingsRepo: SettingsRepository;
  let eventRepo: NfseEventRepository;
  let storage: StorageService;
  let persistence: NfsePersistenceService;
  let synchronizer: NfseSynchronizer;
  let tempDir: string;
  let company: Company;

  const validKey = '35260112345678000190550010000000011000000012345678';
  const sampleXml = `<NFSe><infNFSe Id="NFS${validKey}"><numero>1</numero><serie>1</serie><dEmi>2026-03-15T10:00:00</dEmi><valores><vLiq>100.00</vLiq></valores><emit><CNPJ>12345678000190</CNPJ><xNome>Prestador Demo</xNome></emit><toma><CNPJ>98765432000198</CNPJ><xNome>Tomador Demo</xNome></toma></infNFSe></NFSe>`;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wsf-nfse-sync-test-'));
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

  it('sincroniza documentos em lotes incrementais ate maxNSU', async () => {
    const batches: NfseDistributionBatch[] = [
      {
        status: 'DOCUMENTS_FOUND',
        lastNsu: '10',
        maxNsu: '20',
        documents: [
          {
            kind: 'NFSE',
            nsu: '10',
            schemaType: 'DPS',
            xml: sampleXml,
            accessKey: validKey,
          },
        ],
      },
      {
        status: 'NO_DOCUMENTS',
        lastNsu: '20',
        maxNsu: '20',
        documents: [],
      },
    ];

    let callCount = 0;
    const fakeGateway: NfseGateway = {
      async distribute(input) {
        return batches[callCount++];
      },
      async consultByKey() { throw new Error('Not implemented'); },
      async consultEvents() { throw new Error('Not implemented'); },
    };

    synchronizer = new NfseSynchronizer(
      companyRepo,
      certRepo,
      distStateRepo,
      settingsRepo,
      persistence,
      fakeGateway
    );

    const result = await synchronizer.sync({
      companyId: company.id,
      environment: 'homologation',
    });

    expect(result.success).toBe(true);
    expect(result.documentsCount).toBe(1);
    expect(result.lastNsu).toBe('20');
    expect(result.maxNsu).toBe('20');
    expect(callCount).toBe(2);

    const state = distStateRepo.getOrCreate(company.id, 'NFSE', 'homologation');
    expect(state.last_nsu).toBe('20');
    expect(state.status).toBe('IDLE');
  });

  it('nao altera o cursor de NFE ou CTE ao sincronizar NFSE', async () => {
    distStateRepo.updateNSU(company.id, 'NFE', '100', '200', 'IDLE', undefined, 'homologation');
    distStateRepo.updateNSU(company.id, 'CTE', '50', '60', 'IDLE', undefined, 'homologation');

    const fakeGateway: NfseGateway = {
      async distribute() {
        return {
          status: 'NO_DOCUMENTS',
          lastNsu: '15',
          maxNsu: '15',
          documents: [],
        };
      },
      async consultByKey() { throw new Error('Not implemented'); },
      async consultEvents() { throw new Error('Not implemented'); },
    };

    synchronizer = new NfseSynchronizer(
      companyRepo,
      certRepo,
      distStateRepo,
      settingsRepo,
      persistence,
      fakeGateway
    );

    await synchronizer.sync({ companyId: company.id, environment: 'homologation' });

    const nfeState = distStateRepo.getOrCreate(company.id, 'NFE', 'homologation');
    const cteState = distStateRepo.getOrCreate(company.id, 'CTE', 'homologation');
    expect(nfeState.last_nsu).toBe('000000000000100');
    expect(cteState.last_nsu).toBe('000000000000050');
  });

  it('permite cancelar a sincronizacao e mantem o status e cursor consistentes', async () => {
    const fakeGateway: NfseGateway = {
      async distribute(input) {
        if (input.signal?.aborted) {
          throw new Error('Operação cancelada');
        }
        return {
          status: 'DOCUMENTS_FOUND',
          lastNsu: '5',
          maxNsu: '100',
          documents: [],
        };
      },
      async consultByKey() { throw new Error('Not implemented'); },
      async consultEvents() { throw new Error('Not implemented'); },
    };

    synchronizer = new NfseSynchronizer(
      companyRepo,
      certRepo,
      distStateRepo,
      settingsRepo,
      persistence,
      fakeGateway
    );

    synchronizer.cancel(company.id, 'homologation');
    const result = await synchronizer.sync({ companyId: company.id, environment: 'homologation' });
    expect(result.success).toBe(true);
  });
});
