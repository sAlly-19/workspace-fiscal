import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseManager } from '../../database/connection';
import { DistributionStateRepository } from '../../database/repositories/DistributionStateRepository';
import { DocumentRepository } from '../../database/repositories/DocumentRepository';
import { NfseEventRepository } from '../../database/repositories/NfseEventRepository';
import type { Company } from '../../domain/types';
import { StorageService } from '../../storage/StorageService';
import type { NfseDistributedPayload } from '../domain/types';
import { NfsePersistenceService } from './NfsePersistenceService';

const KEY = '12345678901234567890123456789012345678901234567890';
const directories: string[] = [];

function tempDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-fiscal-nfse-persistence-'));
  directories.push(directory);
  return directory;
}

function nationalXml(key = KEY): string {
  return `<NFSe><infNFSe Id="NFS${key}"><nNFSe>10</nNFSe><dhProc>2026-10-06T09:00:00-03:00</dhProc><emit><CNPJ>12345678000190</CNPJ><xNome>PRESTADOR</xNome></emit><DPS><infDPS><serie>1</serie><toma><CNPJ>98765432000110</CNPJ><xNome>TOMADOR</xNome></toma><serv><cServ><xDescServ>Serviço</xDescServ></cServ></serv><valores><vServPrest><vServ>100</vServ></vServPrest></valores></infDPS></DPS><valores><vLiq>100</vLiq></valores></infNFSe></NFSe>`;
}

function eventXml(): string {
  return `<evento><infEvento Id="EVT${KEY}999999001"><chNFSe>${KEY}</chNFSe><dhEvento>2026-10-06T09:30:00-03:00</dhEvento><tpEvento>999999</tpEvento><nSeqEvento>1</nSeqEvento></infEvento></evento>`;
}

async function fixture(storage?: StorageService) {
  const root = tempDirectory();
  const db = await DatabaseManager.create(':memory:');
  db.execute("INSERT INTO companies (id, name, cnpj, is_active) VALUES (1, 'Empresa', '12345678000190', 1);");
  const company: Company = {
    id: 1, name: 'Empresa', cnpj: '12345678000190', is_active: true,
    created_at: '2026-10-06T10:00:00.000Z', updated_at: '2026-10-06T10:00:00.000Z',
  };
  const states = new DistributionStateRepository(db);
  const events = new NfseEventRepository(db);
  const service = new NfsePersistenceService(
    db,
    new DocumentRepository(db),
    events,
    states,
    storage || new StorageService(root)
  );
  return { root, db, company, states, events, service };
}

afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('NfsePersistenceService', () => {
  it('atomically persists an event before its note and links both before advancing NSU', async () => {
    const { db, company, states, events, service } = await fixture();
    const payloads: NfseDistributedPayload[] = [
      { kind: 'EVENT', schemaType: 'evento_desconhecido', xml: eventXml(), nsu: '1', accessKey: KEY },
      { kind: 'NFSE', schemaType: 'NFSe_v1.01', xml: nationalXml(), nsu: '2', accessKey: KEY },
    ];

    const result = service.persistBatch({
      company,
      environment: 'homologation',
      origin: 'NFSE_ADN_DISTRIBUTION',
      payloads,
      cursor: { lastNsu: '2', maxNsu: '2' },
    });

    expect(result).toEqual({ documents: 1, events: 1 });
    const document = db.queryOne<{ id: number; content_hash: string; xml_path: string }>(
      "SELECT id, content_hash, xml_path FROM documents WHERE document_type = 'NFSE';"
    );
    expect(document?.content_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(fs.existsSync(document!.xml_path)).toBe(true);
    expect(events.findByDocument(document!.id, 1)).toHaveLength(1);
    expect(states.getOrCreate(1, 'NFSE', 'homologation')).toMatchObject({ last_nsu: '2', max_nsu: '2' });
  });

  it('does not write files or advance NSU when any payload fails parsing', async () => {
    const { root, company, states, service } = await fixture();

    expect(() => service.persistBatch({
      company,
      environment: 'production',
      origin: 'NFSE_ADN_DISTRIBUTION',
      payloads: [
        { kind: 'NFSE', schemaType: 'NFSe_v1.01', xml: nationalXml(), nsu: '1', accessKey: KEY },
        { kind: 'EVENT', schemaType: 'evento_invalido', xml: '<evento/>', nsu: '2', accessKey: KEY },
      ],
      cursor: { lastNsu: '2', maxNsu: '2' },
    })).toThrow();

    expect(fs.readdirSync(root)).toHaveLength(0);
    expect(states.getOrCreate(1, 'NFSE', 'production').last_nsu).toBe('0');
  });

  it('rolls back prior pending files when a later storage write fails', async () => {
    const root = tempDirectory();
    class FailingSecondWriteStorage extends StorageService {
      private calls = 0;
      override saveXmlTransactional(...args: Parameters<StorageService['saveXmlTransactional']>) {
        this.calls += 1;
        if (this.calls === 2) throw new Error('disk full');
        return super.saveXmlTransactional(...args);
      }
    }
    const { company, states, service } = await fixture(new FailingSecondWriteStorage(root));

    expect(() => service.persistBatch({
      company,
      environment: 'homologation',
      origin: 'NFSE_ADN_DISTRIBUTION',
      payloads: [
        { kind: 'EVENT', schemaType: 'evento_desconhecido', xml: eventXml(), nsu: '1', accessKey: KEY },
        { kind: 'NFSE', schemaType: 'NFSe_v1.01', xml: nationalXml(), nsu: '2', accessKey: KEY },
      ],
      cursor: { lastNsu: '2', maxNsu: '2' },
    })).toThrow('disk full');

    const files = fs.existsSync(root)
      ? fs.readdirSync(root, { recursive: true }).filter((entry) => String(entry).endsWith('.xml'))
      : [];
    expect(files).toHaveLength(0);
    expect(states.getOrCreate(1, 'NFSE', 'homologation').last_nsu).toBe('0');
  });
});
