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

  public parse(
    xml: string,
    schemaType: string,
    nsu?: string,
    fallbackAccessKey?: string
  ): ParsedNfseEvent {
    const parsed = this.parser.parse(xml) as Record<string, unknown>;

    // 1. Encontrar o container de informações (infPedReg, infEvento, retEvento)
    const info =
      findObjectByLocalName(parsed, 'infPedReg') ||
      findObjectByLocalName(parsed, 'infEvento') ||
      findObjectByLocalName(parsed, 'retEvento');

    if (!info) {
      throw new NfseDocumentError('XML de evento NFS-e sem grupo de informações (infPedReg ou infEvento).');
    }

    // 2. Extrair a chave de acesso (50 dígitos)
    const rawAccessKey =
      findValueByLocalName(parsed, 'chNFSe') ||
      findValueByLocalName(parsed, 'chAcesso') ||
      findValueByLocalName(parsed, 'chaveAcesso') ||
      extractKeyFromId(info['@_Id'] || parsed['@_Id']) ||
      fallbackAccessKey;

    if (!rawAccessKey) {
      throw new NfseDocumentError('Evento NFS-e sem chave de acesso.');
    }

    const access_key = normalizeNfseAccessKey(String(rawAccessKey));

    // 3. Identificador do evento
    const eventIdentifier =
      stringValue(info['@_Id']) ||
      stringValue(parsed['@_Id']) ||
      stringValue(findValueByLocalName(parsed, 'nProtEvento'));

    // 4. Tipo de evento (tpEvento ou tags filhas como e101101, etc.)
    const tpEventoTag = findSpecificEventTag(info) || findSpecificEventTag(parsed);
    const eventType =
      stringValue(findValueByLocalName(parsed, 'tpEvento')) ||
      tpEventoTag ||
      (eventIdentifier && eventIdentifier.length >= 59 ? eventIdentifier.slice(53, 59) : undefined) ||
      (schemaType && schemaType !== 'EVENT' ? schemaType : undefined) ||
      'UNKNOWN';

    // 5. Sequência
    const rawSeq = findValueByLocalName(parsed, 'nSeqEvento');
    const sequence = rawSeq !== undefined && rawSeq !== null && !Number.isNaN(Number(rawSeq))
      ? Number(rawSeq)
      : 1;

    // 6. Data do evento
    const eventDate =
      stringValue(findValueByLocalName(parsed, 'dhEvento')) ||
      stringValue(findValueByLocalName(parsed, 'dhRecbto')) ||
      stringValue(findValueByLocalName(parsed, 'dEmi'));

    // 7. Efeito fiscal (Cancelamento)
    const isCancelled =
      eventType.startsWith('1011') ||
      eventType.startsWith('1051') ||
      /cancel/i.test(eventType) ||
      /cancel/i.test(schemaType);

    return {
      access_key,
      nsu: nsu === undefined ? undefined : normalizeNfseNsu(nsu),
      event_identifier: eventIdentifier,
      event_type: eventType,
      event_sequence: Number.isInteger(sequence) ? sequence : undefined,
      event_date: eventDate,
      schema_type: schemaType,
      raw_xml: xml,
      fiscal_effect: isCancelled ? 'CANCELADA' : 'NONE',
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

function findValueByLocalName(record: unknown, localName: string): unknown {
  if (!record || typeof record !== 'object') return undefined;
  if (Array.isArray(record)) {
    for (const item of record) {
      const found = findValueByLocalName(item, localName);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const obj = record as Record<string, unknown>;
  for (const [key, val] of Object.entries(obj)) {
    if (key.split(':').pop() === localName) {
      return val;
    }
    if (typeof val === 'object' && val !== null) {
      const nested = findValueByLocalName(val, localName);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
}

function findSpecificEventTag(record: unknown): string | undefined {
  if (!record || typeof record !== 'object') return undefined;
  const obj = record as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const local = key.split(':').pop() || '';
    const match = local.match(/^e(\d{6})$/i);
    if (match) return match[1];
  }
  return undefined;
}

function extractKeyFromId(idValue: unknown): string | undefined {
  if (!idValue) return undefined;
  const str = String(idValue);
  const match = str.match(/(?:PRE|ID|EVT)?(\d{50})/i);
  return match?.[1];
}

function stringValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}
