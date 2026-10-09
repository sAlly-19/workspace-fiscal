import { FiscalParser } from './base.parser';
import { FiscalDocument } from '../fiscal.types';
import {
  parseSefinNacional,
  parseMunicipalNotas,
  parseAbrasf,
} from './nfse';

export * from './nfse';

export class NFSeParser extends FiscalParser {
  parse(xmlContent: string, rawXmlPath: string, batchId?: string): FiscalDocument {
    const jsonObj = this.parseXml(xmlContent);

    // 1. Sefin Nacional / SPED (e.g. <NFSe><infNFSe> or <infNFSe>)
    const sefinInf = jsonObj.NFSe?.infNFSe || jsonObj.infNFSe;
    if (sefinInf) {
      return parseSefinNacional(sefinInf, rawXmlPath, batchId);
    }

    // 2. Municipal / XML Tag format (<Notas><xml>...)
    const notasXml = jsonObj.Notas?.xml || (jsonObj.Notas && !jsonObj.Notas.xml ? jsonObj.Notas : null);
    if (notasXml) {
      return parseMunicipalNotas(notasXml, rawXmlPath, batchId);
    }

    // 3. ABRASF Standard (CompNfse / ConsultarNfseResposta / Nfse / InfNfse)
    let nfse: any = null;
    if (jsonObj.CompNfse?.Nfse) {
      nfse = jsonObj.CompNfse.Nfse;
    } else if (jsonObj.ConsultarNfseResposta?.ListaNfse?.CompNfse?.Nfse) {
      nfse = jsonObj.ConsultarNfseResposta.ListaNfse.CompNfse.Nfse;
    } else if (jsonObj.Nfse) {
      nfse = jsonObj.Nfse;
    } else if (jsonObj.NFSe) {
      nfse = jsonObj.NFSe;
    }

    const inf: any = nfse?.InfNfse || nfse?.infNfse || nfse?.infNFSe || nfse;
    if (inf && (inf.Servico || inf.servico || inf.Numero || inf.nNFSe)) {
      return parseAbrasf(inf, rawXmlPath, batchId);
    }

    throw new Error('Formato NFS-e desconhecido: tags reconhecidas ausentes no XML.');
  }
}
