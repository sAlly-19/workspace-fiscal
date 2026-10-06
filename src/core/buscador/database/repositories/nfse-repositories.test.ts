import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseManager } from '../connection';
import { DistributionStateRepository } from './DistributionStateRepository';
import { DocumentRepository } from './DocumentRepository';
import { NfseEventRepository } from './NfseEventRepository';
import { SettingsRepository } from './SettingsRepository';

const NFSE_KEY = '12345678901234567890123456789012345678901234567890';

describe('NFS-e repositories', () => {
  let db: DatabaseManager;
  let states: DistributionStateRepository;
  let documents: DocumentRepository;
  let events: NfseEventRepository;

  beforeEach(async () => {
    db = await DatabaseManager.create(':memory:');
    db.execute("INSERT INTO companies (id, name, cnpj, is_active) VALUES (1, 'Empresa', '12345678000190', 1);");
    states = new DistributionStateRepository(db);
    documents = new DocumentRepository(db);
    events = new NfseEventRepository(db);
  });

  it('keeps NFE, CTE and NFSE cursors isolated by environment', () => {
    states.updateNSU(1, 'NFE', '7', '9', 'IDLE', undefined, 'production');
    states.updateNSU(1, 'CTE', '8', '10', 'IDLE', undefined, 'homologation');
    states.updateNSU(1, 'NFSE', '00011', '900719925474099312345', 'IDLE', undefined, 'production');

    expect(states.getOrCreate(1, 'NFE', 'production').last_nsu).toBe('000000000000007');
    expect(states.getOrCreate(1, 'CTE', 'homologation').last_nsu).toBe('000000000000008');
    expect(states.getOrCreate(1, 'NFSE', 'production')).toMatchObject({
      last_nsu: '11',
      max_nsu: '900719925474099312345',
    });
    expect(states.getOrCreate(1, 'NFSE', 'homologation').last_nsu).toBe('0');
  });

  it('upserts one NFSE per company, type, environment and access key', () => {
    const first = documents.upsert({
      company_id: 1,
      document_type: 'NFSE',
      environment: 'homologation',
      origin: 'NFSE_ADN_DISTRIBUTION',
      nsu: '17',
      schema_type: 'NFSe_v1.01',
      access_key: NFSE_KEY,
      content_hash: 'hash-1',
      document_number: '100',
      received_at: '2026-10-06T10:00:00.000Z',
      xml_path: 'C:/xml/nfse.xml',
      xml_status: 'XML_DISPONIVEL',
      pdf_status: 'PDF_INDISPONIVEL',
      situacao_fiscal: 'AUTORIZADA',
    });
    const direct = documents.upsert({
      ...first,
      origin: 'NFSE_SEFIN_DIRECT',
      content_hash: 'hash-2',
      issuer_name: 'Prestador completo',
    });

    expect(direct.id).toBe(first.id);
    expect(direct.issuer_name).toBe('Prestador completo');
    expect(direct.origin).toBe('NFSE_ADN_DISTRIBUTION');
    expect(db.queryOne<{ total: number }>('SELECT COUNT(*) AS total FROM documents;')?.total).toBe(1);
  });

  it('allows the same NFSE key in different environments', () => {
    const base = {
      company_id: 1,
      document_type: 'NFSE' as const,
      origin: 'NFSE_ADN_DISTRIBUTION' as const,
      nsu: '1',
      schema_type: 'NFSe_v1.01',
      access_key: NFSE_KEY,
      content_hash: 'hash-homologation',
      received_at: '2026-10-06T10:00:00.000Z',
      xml_status: 'XML_DISPONIVEL' as const,
      pdf_status: 'PDF_INDISPONIVEL' as const,
      situacao_fiscal: 'AUTORIZADA' as const,
    };

    const homologation = documents.upsert({ ...base, environment: 'homologation' });
    const production = documents.upsert({
      ...base,
      environment: 'production',
      content_hash: 'hash-production',
    });

    expect(production.id).not.toBe(homologation.id);
  });

  it('deduplicates an event by official identifier or content hash', () => {
    const first = events.upsert({
      company_id: 1,
      environment: 'homologation',
      access_key: NFSE_KEY,
      nsu: '18',
      event_identifier: `EVT${NFSE_KEY}101101001`,
      event_type: '101101',
      event_sequence: 1,
      event_date: '2026-10-06T09:00:00-03:00',
      schema_type: 'evento_v1.01',
      xml_path: 'C:/xml/evento.xml',
      content_hash: 'event-hash-1',
    });
    const sameIdentifier = events.upsert({
      ...first,
      content_hash: 'event-hash-2',
      xml_path: 'C:/xml/evento-atualizado.xml',
    });
    const sameHash = events.upsert({
      ...first,
      event_identifier: undefined,
    });

    expect(sameIdentifier.id).toBe(first.id);
    expect(sameHash.id).toBe(first.id);
    expect(db.queryOne<{ total: number }>('SELECT COUNT(*) AS total FROM nfse_events;')?.total).toBe(1);
  });

  it('links an event that arrived before its NFSE document', () => {
    const pending = events.upsert({
      company_id: 1,
      environment: 'production',
      access_key: NFSE_KEY,
      event_type: 'UNKNOWN',
      schema_type: 'evento_desconhecido',
      xml_path: 'C:/xml/pending.xml',
      content_hash: 'pending-event-hash',
    });
    expect(pending.document_id).toBeUndefined();

    const document = documents.upsert({
      company_id: 1,
      document_type: 'NFSE',
      environment: 'production',
      origin: 'NFSE_SEFIN_DIRECT',
      nsu: '0',
      schema_type: 'NFSe_v1.01',
      access_key: NFSE_KEY,
      content_hash: 'document-hash',
      received_at: '2026-10-06T10:00:00.000Z',
      xml_status: 'XML_DISPONIVEL',
      pdf_status: 'PDF_INDISPONIVEL',
      situacao_fiscal: 'AUTORIZADA',
    });

    expect(events.findByDocument(document.id, 1)).toEqual([
      expect.objectContaining({ id: pending.id, document_id: document.id }),
    ]);
  });

  it('stores the NFS-e environment independently from SEFAZ', () => {
    const settings = new SettingsRepository(db);

    settings.updateSettings({ nfse_environment: 'production' });

    expect(settings.getSettings()).toMatchObject({
      sefaz_environment: 'homologation',
      nfse_environment: 'production',
    });
  });
});
