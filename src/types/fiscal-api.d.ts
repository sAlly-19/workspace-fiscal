import type {
  Company,
  CreateCompanyDTO,
  UpdateCompanyDTO,
  CertificateInfo,
  FiscalDocument,
  DocumentDownloadRequest,
  DocumentReference,
  DocumentSearchFilters,
  DocumentStoragePathRequest,
  PaginatedResult,
  AppSettings,
  CombinedSefazQueryResult,
  DownloadBatchOptions,
  DownloadBatchResult
} from '../core/buscador/domain/types';
import type { NfseEnvironment, NfseEvent } from '../core/buscador/nfse/domain/types';
import type { NfseSyncResult, NfseSyncStatus } from '../core/buscador/nfse/services/NfseSynchronizer';
import type { NfseDirectQueryResult } from '../core/buscador/nfse/services/NfseDirectQueryService';

export interface FiscalDesktopAPI {
  companies: {
    list: () => Promise<Company[]>;
    create: (dto: CreateCompanyDTO) => Promise<Company>;
    update: (dto: UpdateCompanyDTO) => Promise<Company>;
    delete: (id: number) => Promise<boolean>;
    selectActive: (id: number) => Promise<Company | null>;
    getActive: () => Promise<Company | null>;
  };
  certificates: {
    listAvailable: () => Promise<CertificateInfo[]>;
    getForCompany: (companyId: number) => Promise<CertificateInfo | null>;
    associateToCompany: (companyId: number, thumbprint: string) => Promise<boolean>;
  };
  documents: {
    search: (filters: DocumentSearchFilters) => Promise<PaginatedResult<FiscalDocument>>;
    getById: (request: DocumentReference) => Promise<FiscalDocument | null>;
    downloadXml: (request: DocumentDownloadRequest) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    downloadPdf: (request: DocumentDownloadRequest) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    downloadBatch: (options: DownloadBatchOptions) => Promise<DownloadBatchResult>;
    openFileFolder: (request: DocumentStoragePathRequest) => Promise<boolean>;
  };
  sefaz: {
    consultDocuments: (companyId: number, docType?: 'NFE' | 'CTE') => Promise<CombinedSefazQueryResult>;
    getStatus: (companyId: number) => Promise<{ nfeLastNSU: string; cteLastNSU: string; isRunning: boolean }>;
    cancelQuery: (companyId: number, docType?: 'NFE' | 'CTE') => Promise<boolean>;
    resetNSU: (companyId: number, docType: 'NFE' | 'CTE') => Promise<boolean>;
    onProgress: (callback: (data: { companyId: number; documentType: 'NFE' | 'CTE'; message: string; currentNSU?: string; count?: number }) => void) => () => void;
  };
  nfse: {
    sync: (companyId: number, environment?: NfseEnvironment) => Promise<NfseSyncResult>;
    getStatus: (companyId: number, environment?: NfseEnvironment) => Promise<NfseSyncStatus>;
    cancelSync: (companyId: number, environment?: NfseEnvironment) => Promise<boolean>;
    resetNSU: (companyId: number, environment?: NfseEnvironment) => Promise<boolean>;
    consultByKey: (companyId: number, accessKey: string, environment?: NfseEnvironment) => Promise<NfseDirectQueryResult>;
    getEvents: (companyId: number, accessKey: string, environment?: NfseEnvironment) => Promise<NfseEvent[]>;
    onProgress: (callback: (data: { companyId: number; message: string; currentNsu?: string; maxNsu?: string; documentsCount?: number; eventsCount?: number }) => void) => () => void;
  };
  settings: {
    get: () => Promise<AppSettings>;
    update: (settings: Partial<AppSettings>) => Promise<AppSettings>;
    selectFolder: (title?: string) => Promise<string | null>;
  };
}

declare global {
  interface Window {
    fiscalApi: FiscalDesktopAPI;
  }
}

