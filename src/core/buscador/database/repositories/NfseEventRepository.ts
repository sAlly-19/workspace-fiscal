import type { NfseEvent } from '../../nfse/domain/types';
import { normalizeNfseAccessKey } from '../../nfse/domain/access-key';
import { normalizeNfseNsu } from '../../nfse/domain/nsu';
import { DatabaseManager } from '../connection';

export type NewNfseEvent = Omit<NfseEvent, 'id' | 'created_at' | 'updated_at' | 'document_id'> & {
  document_id?: number;
};

type NfseEventRow = Omit<NfseEvent, 'document_id' | 'nsu' | 'event_identifier' | 'event_sequence' | 'event_date'> & {
  document_id: number | null;
  nsu: string | null;
  event_identifier: string | null;
  event_sequence: number | null;
  event_date: string | null;
};

export class NfseEventRepository {
  constructor(private db: DatabaseManager) {}

  public upsert(event: NewNfseEvent): NfseEvent {
    const accessKey = normalizeNfseAccessKey(event.access_key);
    const existing = this.findDuplicate(event.company_id, event.environment, event.event_identifier, event.content_hash);
    if (existing) return existing;

    const linkedDocument = event.document_id ?? this.db.queryOne<{ id: number }>(
      `SELECT id FROM documents
       WHERE company_id = ? AND document_type = 'NFSE' AND environment = ? AND access_key = ?
       LIMIT 1;`,
      [event.company_id, event.environment, accessKey]
    )?.id;

    const result = this.db.execute(
      `INSERT INTO nfse_events (
        company_id, document_id, environment, access_key, nsu, event_identifier,
        event_type, event_sequence, event_date, schema_type, xml_path, content_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        event.company_id,
        linkedDocument ?? null,
        event.environment,
        accessKey,
        event.nsu === undefined ? null : normalizeNfseNsu(event.nsu),
        event.event_identifier || null,
        event.event_type,
        event.event_sequence ?? null,
        event.event_date || null,
        event.schema_type,
        event.xml_path,
        event.content_hash,
      ]
    );

    const saved = this.findById(result.lastInsertRowid);
    if (!saved) throw new Error('Não foi possível localizar o evento NFS-e após a persistência.');
    return saved;
  }

  public linkPendingToDocument(
    companyId: number,
    environment: NfseEvent['environment'],
    accessKey: string,
    documentId: number
  ): number {
    return this.db.execute(
      `UPDATE nfse_events SET document_id = ?, updated_at = datetime('now', 'localtime')
       WHERE company_id = ? AND environment = ? AND access_key = ? AND document_id IS NULL;`,
      [documentId, companyId, environment, normalizeNfseAccessKey(accessKey)]
    ).changes;
  }

  public findByDocument(documentId: number, companyId: number): NfseEvent[] {
    return this.db.queryAll<NfseEventRow>(
      `SELECT * FROM nfse_events WHERE document_id = ? AND company_id = ?
       ORDER BY event_date, event_sequence, id;`,
      [documentId, companyId]
    ).map(toDomainEvent);
  }

  public findByAccessKey(
    companyId: number,
    accessKey: string,
    environment?: NfseEvent['environment']
  ): NfseEvent[] {
    const cleanKey = normalizeNfseAccessKey(accessKey);
    if (environment) {
      return this.db.queryAll<NfseEventRow>(
        `SELECT * FROM nfse_events WHERE company_id = ? AND environment = ? AND access_key = ?
         ORDER BY event_date, event_sequence, id;`,
        [companyId, environment, cleanKey]
      ).map(toDomainEvent);
    }
    return this.db.queryAll<NfseEventRow>(
      `SELECT * FROM nfse_events WHERE company_id = ? AND access_key = ?
       ORDER BY event_date, event_sequence, id;`,
      [companyId, cleanKey]
    ).map(toDomainEvent);
  }

  private findById(id: number): NfseEvent | null {
    const row = this.db.queryOne<NfseEventRow>('SELECT * FROM nfse_events WHERE id = ?;', [id]);
    return row ? toDomainEvent(row) : null;
  }

  private findDuplicate(
    companyId: number,
    environment: NfseEvent['environment'],
    eventIdentifier: string | undefined,
    contentHash: string
  ): NfseEvent | null {
    const row = this.db.queryOne<NfseEventRow>(
      `SELECT * FROM nfse_events
       WHERE company_id = ? AND environment = ?
         AND (content_hash = ? OR (? IS NOT NULL AND event_identifier = ?))
       ORDER BY id LIMIT 1;`,
      [companyId, environment, contentHash, eventIdentifier || null, eventIdentifier || null]
    );
    return row ? toDomainEvent(row) : null;
  }
}

function toDomainEvent(row: NfseEventRow): NfseEvent {
  return {
    ...row,
    document_id: row.document_id ?? undefined,
    nsu: row.nsu ?? undefined,
    event_identifier: row.event_identifier ?? undefined,
    event_sequence: row.event_sequence ?? undefined,
    event_date: row.event_date ?? undefined,
  };
}
