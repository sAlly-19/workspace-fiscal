import path from 'path';
import fs from 'fs';
import { resolveDbPath } from '../../src/db/db-paths';
import { migrateLegacyBuscadorDatabase } from '../../src/db/legacy-buscador-migration';
import { getDatabase } from '../../src/core/buscador/database/connection';
import { CompanyRepository } from '../../src/core/buscador/database/repositories/CompanyRepository';
import { CertificateRepository } from '../../src/core/buscador/database/repositories/CertificateRepository';
import { DistributionStateRepository } from '../../src/core/buscador/database/repositories/DistributionStateRepository';
import { DocumentRepository } from '../../src/core/buscador/database/repositories/DocumentRepository';
import { SettingsRepository } from '../../src/core/buscador/database/repositories/SettingsRepository';
import { CompanyService } from '../../src/core/buscador/domain/services/CompanyService';
import { StorageService } from '../../src/core/buscador/storage/StorageService';
import { ReconciliationService } from '../../src/core/buscador/storage/ReconciliationService';
import { WindowsStoreCertificateProvider } from '../../src/core/buscador/certificates/WindowsStoreCertificateProvider';
import { MockCertificateProvider } from '../../src/core/buscador/certificates/MockCertificateProvider';
import { ICertificateProvider } from '../../src/core/buscador/certificates/ICertificateProvider';
import { SefazDistributionProvider } from '../../src/core/buscador/fiscal/providers/SefazDistributionProvider';
import { IFiscalDistributionProvider } from '../../src/core/buscador/fiscal/providers/IFiscalDistributionProvider';
import { DistributionEngine } from '../../src/core/buscador/fiscal/services/DistributionEngine';
import { ZipService } from '../../src/core/buscador/downloads/ZipService';
import { NfseEventRepository } from '../../src/core/buscador/database/repositories/NfseEventRepository';
import { NfseWireContract } from '../../src/core/buscador/nfse/clients/NfseWireContract';
import { OfficialNfseWireContract } from '../../src/core/buscador/nfse/clients/OfficialNfseWireContract';
import { NfseAdnClient } from '../../src/core/buscador/nfse/clients/NfseAdnClient';
import { NfseSefinClient } from '../../src/core/buscador/nfse/clients/NfseSefinClient';
import { NfseGateway } from '../../src/core/buscador/nfse/clients/NfseGateway';
import { NfsePersistenceService } from '../../src/core/buscador/nfse/services/NfsePersistenceService';
import { NfseSynchronizer } from '../../src/core/buscador/nfse/services/NfseSynchronizer';
import { NfseDirectQueryService } from '../../src/core/buscador/nfse/services/NfseDirectQueryService';

export interface ApplicationContext {
  db: Awaited<ReturnType<typeof getDatabase>>;
  companyService: CompanyService;
  certRepo: CertificateRepository;
  distStateRepo: DistributionStateRepository;
  docRepo: DocumentRepository;
  settingsRepo: SettingsRepository;
  storageService: StorageService;
  reconciliationService: ReconciliationService;
  certProvider: ICertificateProvider;
  fiscalProvider: IFiscalDistributionProvider;
  distributionEngine: DistributionEngine;
  zipService: ZipService;
  nfseEventRepo: NfseEventRepository;
  nfseWireContract: NfseWireContract;
  nfseAdnClient: NfseAdnClient;
  nfseSefinClient: NfseSefinClient;
  nfseGateway: NfseGateway;
  nfsePersistence: NfsePersistenceService;
  nfseSynchronizer: NfseSynchronizer;
  nfseDirectQuery: NfseDirectQueryService;
}

export async function initializeServices(userDataPath: string): Promise<ApplicationContext> {
  const legacyDbPath = path.join(userDataPath, 'fiscal_storage.db');
  const dbPath = resolveDbPath();
  const storageDir = path.join(userDataPath, 'documents');

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  try {
    await migrateLegacyBuscadorDatabase(legacyDbPath, dbPath);
  } catch (migErr) {
    console.error('Falha na migração do banco legado do Buscador:', migErr);
    try {
      if (fs.existsSync(legacyDbPath)) {
        fs.renameSync(legacyDbPath, `${legacyDbPath}.failed-${Date.now()}.bak`);
      }
    } catch {}
  }

  let db: Awaited<ReturnType<typeof getDatabase>>;
  try {
    db = await getDatabase(dbPath);
  } catch (dbErr) {
    console.error('Falha crítica ao abrir banco do Buscador:', dbErr);
    throw dbErr;
  }
  const companyRepo = new CompanyRepository(db);
  const certRepo = new CertificateRepository(db);
  const distStateRepo = new DistributionStateRepository(db);
  const docRepo = new DocumentRepository(db);
  const settingsRepo = new SettingsRepository(db);
  const storageService = new StorageService(storageDir);
  const reconciliationService = new ReconciliationService(db);
  const zipService = new ZipService();
  const companyService = new CompanyService(companyRepo);

  // Seleciona provedor de certificados (Windows Store padrão, com fallback para Mock se não for Windows)
  const certProvider: ICertificateProvider = process.platform === 'win32'
    ? new WindowsStoreCertificateProvider()
    : new MockCertificateProvider();

  // Provedor fiscal SEFAZ oficial
  const fiscalProvider: IFiscalDistributionProvider = new SefazDistributionProvider(certProvider);

  const distributionEngine = new DistributionEngine(
    db,
    companyRepo,
    certRepo,
    distStateRepo,
    docRepo,
    settingsRepo,
    storageService,
    fiscalProvider
  );

  const nfseEventRepo = new NfseEventRepository(db);
  const nfseWireContract = new OfficialNfseWireContract();
  const nfseAdnClient = new NfseAdnClient(certProvider, nfseWireContract);
  const nfseSefinClient = new NfseSefinClient(certProvider, nfseWireContract);
  const nfseGateway: NfseGateway = {
    distribute: (input) => nfseAdnClient.distribute(input),
    consultByKey: (input) => nfseSefinClient.consultByKey(input),
    consultEvents: (input) => nfseAdnClient.consultEvents(input),
  };
  const nfsePersistence = new NfsePersistenceService(
    db,
    docRepo,
    nfseEventRepo,
    distStateRepo,
    storageService
  );
  const nfseSynchronizer = new NfseSynchronizer(
    companyRepo,
    certRepo,
    distStateRepo,
    settingsRepo,
    nfsePersistence,
    nfseGateway
  );
  const nfseDirectQuery = new NfseDirectQueryService(
    companyRepo,
    certRepo,
    docRepo,
    settingsRepo,
    nfsePersistence,
    nfseGateway
  );

  return {
    db,
    companyService,
    certRepo,
    distStateRepo,
    docRepo,
    settingsRepo,
    storageService,
    reconciliationService,
    certProvider,
    fiscalProvider,
    distributionEngine,
    zipService,
    nfseEventRepo,
    nfseWireContract,
    nfseAdnClient,
    nfseSefinClient,
    nfseGateway,
    nfsePersistence,
    nfseSynchronizer,
    nfseDirectQuery,
  };
}
