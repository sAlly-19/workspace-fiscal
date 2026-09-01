import { DocumentType, FiscalDocument } from '../fiscal.types';
import { NFeParser } from './nfe.parser';
import { CTeParser } from './cte.parser';
import { NFSeParser } from './nfse.parser';

export function parseFiscalDocument(
  xmlContent: string,
  type: DocumentType,
  rawXmlPath: string,
  batchId?: string
): FiscalDocument {
  switch (type) {
    case 'NFE':
    case 'NFCE':
      return new NFeParser().parse(xmlContent, rawXmlPath, batchId);
    case 'CTE':
      return new CTeParser().parse(xmlContent, rawXmlPath, batchId);
    case 'NFSE':
      return new NFSeParser().parse(xmlContent, rawXmlPath, batchId);
    default:
      throw new Error(`Parser não implementado para o tipo: ${type}`);
  }
}
