import { XMLParser } from 'fast-xml-parser';
import { normalizeNfseAccessKey } from '../domain/access-key';
import { NfseDocumentError } from '../domain/errors';
import { normalizeNfseNsu } from '../domain/nsu';

export interface ParsedNfseEvent {
  access_key: string;
  nsu?: string;
  event_identifier?: string;
  event_type: string;
  event_sequence?: number;
  event_date?: string;
  schema_type: string;
  raw_xml: string;
  fiscal_effect: 'NONE' | 'CANCELADA';
}

export class NfseEventParser {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: true,
    numberParseOptions: { leadingZeros: false, hex: false, skipLike: /^\d{12,}$/ },
  });

  public parse(xml: string, schemaType: string, nsu?: string): ParsedNfseEvent {
    const parsed = this.parser.parse(xml) as Record<string, unknown>;
    const info = findObjectByLocalName(parsed, 'infEvento');
    if (!info) throw new NfseDocumentError('XML de evento NFS-e sem a tag infEvento.');

    const accessKeyValue = valueByLocalName(info, 'chNFSe');
    if (accessKeyValue === undefined) throw new NfseDocumentError('Evento NFS-e sem chave de acesso.');
    const eventIdentifier = stringValue(info['@_Id']);
    const eventType = stringValue(valueByLocalName(info, 'tpEvento'))
      || (eventIdentifier ? eventIdentifier.slice(53, 59) : undefined)
      || 'UNKNOWN';
    const sequenceValue = valueByLocalName(info, 'nSeqEvento');
    const sequence = sequenceValue === undefined ? undefined : Number(sequenceValue);

    return {
      access_key: normalizeNfseAccessKey(String(accessKeyValue)),
      nsu: nsu === undefined ? undefined : normalizeNfseNsu(nsu),
      event_identifier: eventIdentifier,
      event_type: eventType,
      event_sequence: sequence !== undefined && Number.isInteger(sequence) ? sequence : undefined,
      event_date: stringValue(valueByLocalName(info, 'dhEvento')),
      schema_type: schemaType,
      raw_xml: xml,
      fiscal_effect: 'NONE',
    };
  }
}

function findObjectByLocalName(value: unknown, localName: string): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (key.split(':').pop() === localName && child && typeof child === 'object' && !Array.isArray(child)) {
      return child as Record<string, unknown>;
    }
    const nested = findObjectByLocalName(child, localName);
    if (nested) return nested;
  }
  return undefined;
}

function valueByLocalName(record: Record<string, unknown>, localName: string): unknown {
  const entry = Object.entries(record).find(([key]) => key.split(':').pop() === localName);
  return entry?.[1];
}

function stringValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}
