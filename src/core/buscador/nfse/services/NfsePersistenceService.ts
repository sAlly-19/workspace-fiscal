import type { DatabaseManager } from '../../database/connection';
import type { DistributionStateRepository } from '../../database/repositories/DistributionStateRepository';
import type { DocumentRepository } from '../../database/repositories/DocumentRepository';
import type { NewNfseEvent, NfseEventRepository } from '../../database/repositories/NfseEventRepository';
import type { Company } from '../../domain/types';
import type { PendingFileWrite, StorageService } from '../../storage/StorageService';
import type { AdaptedNfseDocument } from '../parsers/NfseDocumentAdapter';
import { NfseDocumentAdapter } from '../parsers/NfseDocumentAdapter';
import type { ParsedNfseEvent } from '../parsers/NfseEventParser';
import { NfseEventParser } from '../parsers/NfseEventParser';
import type { DocumentOrigin, NfseDistributedPayload, NfseEnvironment } from '../domain/types';

export interface PersistNfseBatchInput {
  company: Company;
  environment: NfseEnvironment;
  origin: DocumentOrigin;
  payloads: NfseDistributedPayload[];
  cursor?: { lastNsu: string; maxNsu: string };
  configuredBasePath?: string;
}

export interface PersistNfseBatchResult {
  documents: number;
  events: number;
}

type ParsedPayload =
  | { kind: 'NFSE'; source: NfseDistributedPayload; value: AdaptedNfseDocument }
  | { kind: 'EVENT'; source: NfseDistributedPayload; value: ParsedNfseEvent };

type PreparedPayload = ParsedPayload & { pending: PendingFileWrite };

export class NfsePersistenceService {
  constructor(
    private readonly db: DatabaseManager,
    private readonly documents: DocumentRepository,
    private readonly events: NfseEventRepository,
    private readonly states: DistributionStateRepository,
    private readonly storage: StorageService,
    private readonly documentAdapter = new NfseDocumentAdapter(),
    private readonly eventParser = new NfseEventParser()
  ) {}

  public persistBatch(input: PersistNfseBatchInput): PersistNfseBatchResult {
    const parsed = input.payloads.map((payload): ParsedPayload => {
      if (payload.kind === 'NFSE') {
        return { kind: 'NFSE', source: payload, value: this.documentAdapter.adapt(payload) };
      }
      return {
        kind: 'EVENT',
        source: payload,
        value: this.eventParser.parse(
          payload.xml,
          payload.schemaType,
          payload.nsu,
          payload.accessKey
        ),
      };
    });

    const prepared: PreparedPayload[] = [];
    try {
      for (const item of parsed) {
        if (item.kind === 'EVENT') {
          const value = item.value;
          const schemaForStorage = `${value.schema_type}-evento-${value.event_identifier || value.event_type}`;
          const pending = this.storage.saveXmlTransactional(
            input.company,
            'NFSE',
            input.environment,
            value.access_key,
            item.source.xml,
            value.event_date,
            schemaForStorage,
            input.configuredBasePath
          );
          prepared.push({ ...item, pending });
        } else {
          const value = item.value;
          const schemaForStorage = value.schema_type;
          const pending = this.storage.saveXmlTransactional(
            input.company,
            'NFSE',
            input.environment,
            value.access_key,
            item.source.xml,
            value.issue_date,
            schemaForStorage,
            input.configuredBasePath
          );
          prepared.push({ ...item, pending });
        }
      }

      const result = this.db.transaction(() => {
        let documentCount = 0;
        let eventCount = 0;
        for (const item of prepared) {
          if (item.kind === 'NFSE') {
            const value = item.value;
            this.documents.upsert({
              company_id: input.company.id,
              document_type: 'NFSE',
              environment: input.environment,
              origin: input.origin,
              nsu: value.nsu,
              schema_type: value.schema_type,
              access_key: value.access_key,
              content_hash: item.pending.contentHash,
              document_number: value.document_number,
              series: value.series,
              issue_date: value.issue_date,
              received_at: new Date().toISOString(),
              issuer_cnpj: value.issuer_cnpj,
              issuer_name: value.issuer_name,
              recipient_cnpj: value.recipient_cnpj,
              recipient_name: value.recipient_name,
              total_value: value.total_value,
              xml_path: item.pending.filePath,
              xml_status: 'XML_DISPONIVEL',
              pdf_status: 'PDF_INDISPONIVEL',
              situacao_fiscal: value.situacao_fiscal,
            });
            documentCount += 1;
          } else {
            const value = item.value;
            const event: NewNfseEvent = {
              company_id: input.company.id,
              environment: input.environment,
              access_key: value.access_key,
              nsu: value.nsu,
              event_identifier: value.event_identifier,
              event_type: value.event_type,
              event_sequence: value.event_sequence,
              event_date: value.event_date,
              schema_type: value.schema_type,
              xml_path: item.pending.filePath,
              content_hash: item.pending.contentHash,
            };
            this.events.upsert(event);
            eventCount += 1;
          }
        }
        if (input.cursor) {
          this.states.updateNSU(
            input.company.id,
            'NFSE',
            input.cursor.lastNsu,
            input.cursor.maxNsu,
            'IDLE',
            undefined,
            input.environment
          );
        }
        return { documents: documentCount, events: eventCount };
      });

      prepared.forEach((item) => item.pending.commit());
      return result;
    } catch (error) {
      for (const item of prepared.reverse()) {
        try { item.pending.rollback(); } catch { /* preserve the original failure */ }
      }
      throw error;
    }
  }
}
