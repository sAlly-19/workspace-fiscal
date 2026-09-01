import { XMLParser } from 'fast-xml-parser';
import { FiscalDocument } from '../fiscal.types';

export abstract class FiscalParser {
  protected parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: true,
      textNodeName: '#text',
    });
  }

  protected parseXml(xmlContent: string): any {
    return this.parser.parse(xmlContent);
  }

  abstract parse(xmlContent: string, rawXmlPath: string, batchId?: string): FiscalDocument;
}
