import { FiscalParser } from './base.parser';
import { FiscalDocument, FiscalCteRoute } from '../fiscal.types';
import crypto from 'crypto';
import {
  parseCteNumber,
  parseParty,
  parseTomador,
  parseComponents,
  parseCargo,
  parseDocs,
  parseModal,
  parseIcms,
  parseBilling,
  parseTotals,
} from './cte';

export * from './cte';

export class CTeParser extends FiscalParser {
  parse(xmlContent: string, rawXmlPath: string, batchId?: string): FiscalDocument {
    const jsonObj = this.parseXml(xmlContent);
    
    const cte = jsonObj.cteProc?.CTe || jsonObj.CTe;
    
    if (!cte || !cte.infCte) {
      throw new Error('Formato CT-e inválido: tag infCte ausente.');
    }

    const infCte = cte.infCte;
    const ide = infCte.ide || {};
    const emit = infCte.emit || {};
    const rem = infCte.rem || {}; // Remetente
    const dest = infCte.dest || {}; // Destinatário
    const exped = infCte.exped || {}; // Expedidor
    const receb = infCte.receb || {}; // Recebedor
    const vPrest = infCte.vPrest || {};
    const imp = infCte.imp || {};
    const infCTeNorm = infCte.infCTeNorm || {};
    const compl = infCte.compl || {};
    
    // Protocolo
    const protCTe = jsonObj.cteProc?.protCTe?.infProt || {};
    const protocol = protCTe.nProt ? `${protCTe.nProt} - ${protCTe.dhRecbto || ''}` : undefined;

    // Access key
    const rawId = infCte['@_Id'] || '';
    const accessKey = rawId.replace(/^CTe/, '');

    const emitParty = parseParty(emit);
    const remParty = rem && Object.keys(rem).length > 0 ? parseParty(rem) : undefined;
    const destParty = dest && Object.keys(dest).length > 0 ? parseParty(dest) : undefined;
    const expedParty = exped && Object.keys(exped).length > 0 ? parseParty(exped) : undefined;
    const recebParty = receb && Object.keys(receb).length > 0 ? parseParty(receb) : undefined;

    // Tomador do serviço
    const cteTomador = parseTomador(ide, infCte.toma3, infCte.toma4, remParty, destParty, expedParty, recebParty);

    // Rota
    const cteRoute: FiscalCteRoute = {
      startCity: ide.xMunIni ? String(ide.xMunIni) : undefined,
      startState: ide.UFIni ? String(ide.UFIni) : undefined,
      endCity: ide.xMunFim ? String(ide.xMunFim) : undefined,
      endState: ide.UFFim ? String(ide.UFFim) : undefined,
    };

    // Componentes do valor do frete
    const cteComponents = parseComponents(vPrest);

    // Informações da carga
    const cteCargo = parseCargo(infCTeNorm.infCarga || infCte.infCarga);

    // Documentos originários / NF-e transportadas
    const cteDocs = parseDocs(infCTeNorm.infDoc || infCte.infDoc);

    // Modal Rodoviário
    const cteModal = parseModal(infCTeNorm.infModal || infCte.infModal);

    // ICMS detalhado
    const icmsDetails = parseIcms(imp);

    // Observações
    const obsList: string[] = [];
    if (compl.xObs) obsList.push(String(compl.xObs));
    if (compl.ObsCont) {
      const obsContArr = Array.isArray(compl.ObsCont) ? compl.ObsCont : [compl.ObsCont];
      for (const o of obsContArr) {
        if (o.xTexto) obsList.push(`${o['@_xCampo'] || 'Obs'}: ${o.xTexto}`);
      }
    }
    const additionalInfo = obsList.length > 0 ? obsList.join('\n') : undefined;

    const fiscoList: string[] = [];
    if (compl.ObsFisco) {
      const obsFiscoArr = Array.isArray(compl.ObsFisco) ? compl.ObsFisco : [compl.ObsFisco];
      for (const o of obsFiscoArr) {
        if (o.xTexto) fiscoList.push(`${o['@_xCampo'] || 'Fisco'}: ${o.xTexto}`);
      }
    }
    const fiscoInfo = fiscoList.length > 0 ? fiscoList.join('\n') : undefined;

    const cfopStr = ide.CFOP ? String(ide.CFOP) : undefined;
    const totalPrestacao = parseCteNumber(vPrest.vTPrest);

    return {
      id: crypto.randomUUID(),
      type: 'CTE',
      accessKey: accessKey || undefined,
      number: ide.nCT ? String(ide.nCT) : undefined,
      series: ide.serie ? String(ide.serie) : undefined,
      issueDate: ide.dhEmi ? new Date(ide.dhEmi) : undefined,
      operationNature: ide.natOp ? String(ide.natOp) : 'PRESTACAO DE SERVICO DE TRANSPORTE',
      protocol,
      status: 'VALID',
      issuer: emitParty,
      recipient: destParty,
      sender: remParty,
      shipper: expedParty,
      receiver: recebParty,
      cteTomador,
      cteRoute,
      cteCargo,
      cteComponents,
      cteDocs,
      cteModal,
      cteServiceType: ide.tpServ ? String(ide.tpServ) : '0',
      cteType: ide.tpCTe ? String(ide.tpCTe) : '0',
      cteCst: icmsDetails.cst,
      cteIcmsAliq: icmsDetails.aliq,
      cteIcmsValue: icmsDetails.value,
      cteIcmsBase: icmsDetails.base,
      cteIcmsReduction: icmsDetails.reduction,
      items: [
        {
          code: cfopStr,
          cfop: cfopStr,
          description: ide.natOp ? String(ide.natOp) : 'Prestação de Serviço de Transporte Rodoviário de Cargas',
          quantity: 1,
          unit: 'UN',
          unitPrice: totalPrestacao,
          totalPrice: totalPrestacao,
          icmsBase: icmsDetails.base,
          icmsValue: icmsDetails.value,
          icmsAliq: icmsDetails.aliq,
        }
      ],
      totals: parseTotals(vPrest, imp, icmsDetails),
      billing: parseBilling(infCte.cobr),
      additionalInfo,
      fiscoInfo,
      rawXmlPath,
      batchId,
      createdAt: new Date(),
    };
  }
}
