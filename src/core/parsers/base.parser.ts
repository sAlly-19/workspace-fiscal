import { XMLParser } from 'fast-xml-parser';
import { FiscalDocument } from '../fiscal.types';

export const DEFAULT_MAX_XML_BYTES = 25 * 1024 * 1024; // 25 MB

export abstract class FiscalParser {
  protected parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: true,
      textNodeName: '#text',
      numberParseOptions: {
        leadingZeros: false,
        hex: false,
        skipLike: /^\d{12,}$/,
      },
    });
  }

  protected parseXml(xmlContent: string, maxBytes: number = DEFAULT_MAX_XML_BYTES): any {
    if (typeof xmlContent === 'string' && xmlContent.length > maxBytes) {
      throw new Error(`Conteúdo XML excede o tamanho máximo permitido de ${Math.round(maxBytes / (1024 * 1024))}MB.`);
    }
    return this.parser.parse(xmlContent);
  }

  abstract parse(xmlContent: string, rawXmlPath: string, batchId?: string): FiscalDocument;
}
