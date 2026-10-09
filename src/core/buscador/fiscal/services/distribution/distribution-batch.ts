import { DatabaseManager } from '../../../database/connection';
import { CompanyRepository } from '../../../database/repositories/CompanyRepository';
import { DistributionStateRepository } from '../../../database/repositories/DistributionStateRepository';
import { DocumentRepository } from '../../../database/repositories/DocumentRepository';
import { PendingFileWrite, StorageService } from '../../../storage/StorageService';
import { DocumentType, SefazEnvironment } from '../../../domain/types';
import { ParsedFiscalDocumentInfo } from '../../types';

export function persistBatchDocuments(
  db: DatabaseManager,
  storageService: StorageService,
  docRepo: DocumentRepository,
  distStateRepo: DistributionStateRepository,
  companyId: number,
  docType: DocumentType,
  environment: SefazEnvironment,
  company: NonNullable<ReturnType<CompanyRepository['findById']>>,
  documents: ParsedFiscalDocumentInfo[],
  lastNSU: string,
  maxNSU: string,
  configuredBasePath: string
): void {
  const pendingWrites: PendingFileWrite[] = [];
  try {
    db.transaction(() => {
      for (const doc of documents) {
        const pending = storageService.saveXmlTransactional(
          company,
          docType,
          environment,
          doc.access_key,
          doc.rawXml,
          doc.issue_date,
          doc.schema_type,
          configuredBasePath
        );
        pendingWrites.push(pending);
        docRepo.upsert({
          company_id: companyId,
          document_type: doc.document_type,
          environment,
          origin: 'SEFAZ_DISTRIBUTION',
          nsu: doc.nsu,
          schema_type: doc.schema_type,
          access_key: doc.access_key,
          document_number: doc.document_number,
          series: doc.series,
          issue_date: doc.issue_date,
          received_at: new Date().toISOString(),
          issuer_cnpj: doc.issuer_cnpj,
          issuer_name: doc.issuer_name,
          recipient_cnpj: doc.recipient_cnpj,
          recipient_name: doc.recipient_name,
          total_value: doc.total_value,
          xml_path: pending.filePath,
          xml_status: 'XML_DISPONIVEL',
          pdf_status: 'PDF_INDISPONIVEL',
          situacao_fiscal: doc.situacao_fiscal,
        });
      }
      distStateRepo.updateNSU(
        companyId,
        docType,
        lastNSU,
        maxNSU,
        'IDLE',
        undefined,
        environment,
        138
      );
    });
    pendingWrites.forEach((write) => write.commit());
  } catch (error) {
    for (const write of pendingWrites.reverse()) {
      try {
        write.rollback();
      } catch {
        /* preserva o erro original */
      }
    }
    throw error;
  }
}

export function recordQueryHistory(
  db: DatabaseManager,
  companyId: number,
  docType: DocumentType,
  environment: SefazEnvironment,
  startedAt: string,
  beforeNSU: string,
  afterNSU: string,
  count: number,
  status: string,
  error?: string
): void {
  db.execute(
    `INSERT INTO query_history (
      company_id, document_type, environment, started_at, finished_at,
      last_nsu_before, last_nsu_after, documents_received, status, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      companyId,
      docType,
      environment,
      startedAt,
      new Date().toISOString(),
      beforeNSU,
      afterNSU,
      count,
      status,
      error || null,
    ]
  );
}

