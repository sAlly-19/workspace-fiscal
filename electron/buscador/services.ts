import path from 'path';
import fs from 'fs';
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
}

export async function initializeServices(userDataPath: string): Promise<ApplicationContext> {
  const dbPath = path.join(userDataPath, 'fiscal_storage.db');
  const storageDir = path.join(userDataPath, 'documents');

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const db = await getDatabase(dbPath);
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
  };
}
