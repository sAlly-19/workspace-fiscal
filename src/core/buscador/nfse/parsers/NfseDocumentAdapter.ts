import { NFSeParser } from '../../../parsers/nfse.parser';
import { normalizeNfseAccessKey } from '../domain/access-key';
import { NfseDocumentError } from '../domain/errors';
import { normalizeNfseNsu } from '../domain/nsu';
import type { NfseDistributedPayload } from '../domain/types';

export interface AdaptedNfseDocument {
  access_key: string;
  document_number?: string;
  series?: string;
  issue_date?: string;
  issuer_cnpj?: string;
  issuer_name?: string;
  recipient_cnpj?: string;
  recipient_name?: string;
  total_value: number;
  situacao_fiscal: 'AUTORIZADA' | 'CANCELADA' | 'DENEGADA';
  schema_type: string;
  nsu: string;
  raw_xml: string;
}

export class NfseDocumentAdapter {
  constructor(private readonly parser = new NFSeParser()) {}

  public adapt(payload: NfseDistributedPayload): AdaptedNfseDocument {
    if (payload.kind !== 'NFSE') throw new NfseDocumentError('O payload informado não contém uma NFS-e principal.');
    const parsed = this.parser.parse(payload.xml, 'nfse-original.xml');
    const parsedKey = parsed.accessKey ? normalizeNfseAccessKey(parsed.accessKey) : undefined;
    const payloadKey = payload.accessKey ? normalizeNfseAccessKey(payload.accessKey) : undefined;
    if (parsedKey && payloadKey && parsedKey !== payloadKey) {
      throw new NfseDocumentError('A chave do envelope diverge da chave presente no XML NFS-e.');
    }
    const accessKey = parsedKey || payloadKey;
    if (!accessKey) throw new NfseDocumentError('A NFS-e não possui chave de acesso identificável.');

    return {
      access_key: accessKey,
      document_number: parsed.number,
      series: parsed.series,
      issue_date: parsed.issueDate && !Number.isNaN(parsed.issueDate.getTime())
        ? parsed.issueDate.toISOString()
        : undefined,
      issuer_cnpj: parsed.issuer?.document,
      issuer_name: parsed.issuer?.name,
      recipient_cnpj: parsed.recipient?.document,
      recipient_name: parsed.recipient?.name,
      total_value: parsed.totals?.total || 0,
      situacao_fiscal: 'AUTORIZADA',
      schema_type: payload.schemaType,
      nsu: normalizeNfseNsu(payload.nsu || '0'),
      raw_xml: payload.xml,
    };
  }
}
