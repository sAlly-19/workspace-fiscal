import { FiscalParser } from './base.parser';
import { FiscalDocument, FiscalCteRoute } from '../fiscal.types';
import crypto from 'crypto';
import { parseFiscalNumber } from './utils/xml-number.utils';
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
    
    // Suporte a resumo de CT-e (resCTe)
    const resCTe = jsonObj.resCTe;
    if (resCTe) {
      const chCTe = resCTe.chCTe ? String(resCTe.chCTe) : '';
      const numFromKey = chCTe.length >= 34 ? chCTe.substring(25, 34).replace(/^0+/, '') : undefined;
      const serieFromKey = chCTe.length >= 25 ? chCTe.substring(22, 25).replace(/^0+/, '') : undefined;
      const totalVal = parseFiscalNumber(resCTe.vTPrest || resCTe.vNF || resCTe.vRec || 0);

      return {
        id: crypto.randomUUID(),
        type: 'CTE',
        accessKey: chCTe || undefined,
        number: numFromKey,
        series: serieFromKey,
        issueDate: resCTe.dhEmi ? new Date(resCTe.dhEmi) : new Date(),
        status: 'VALID',
        issuer: {
          name: resCTe.xNome ? String(resCTe.xNome) : 'NÃO INFORMADO',
          document: resCTe.CNPJ || resCTe.CPF || 'NÃO INFORMADO',
          ie: resCTe.IE ? String(resCTe.IE) : undefined,
        },
        items: [{
          description: 'Resumo de CT-e (Aguardando download completo)',
          quantity: 1,
          unitPrice: totalVal,
          totalPrice: totalVal,
        }],
        totals: {
          products: totalVal,
          total: totalVal,
        },
        rawXmlPath,
        batchId,
        createdAt: new Date(),
      };
    }

    // Suporte a evento ou resumo de evento de CT-e
    const eventoCTe = jsonObj.procEventoCTe?.eventoCTe || jsonObj.eventoCTe || jsonObj.resEventoCTe;
    if (eventoCTe) {
      const infEvento = eventoCTe.infEvento || eventoCTe;
      const chCTe = infEvento.chCTe ? String(infEvento.chCTe) : '';
      const numFromKey = chCTe.length >= 34 ? chCTe.substring(25, 34).replace(/^0+/, '') : undefined;
      const serieFromKey = chCTe.length >= 25 ? chCTe.substring(22, 25).replace(/^0+/, '') : undefined;
      const descEvento = infEvento.detEvento?.descEvento || infEvento.descEvento || 'Evento CT-e';

      return {
        id: crypto.randomUUID(),
        type: 'CTE',
        accessKey: chCTe || undefined,
        number: numFromKey,
        series: serieFromKey,
        issueDate: infEvento.dhEvento ? new Date(infEvento.dhEvento) : new Date(),
        status: 'VALID',
        issuer: {
          name: typeof descEvento === 'string' ? descEvento : 'Evento CT-e',
          document: infEvento.CNPJ || infEvento.CPF || 'NÃO INFORMADO',
        },
        items: [{
          description: typeof descEvento === 'string' ? descEvento : 'Evento CT-e',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
        }],
        totals: {
          products: 0,
          total: 0,
        },
        rawXmlPath,
        batchId,
        createdAt: new Date(),
      };
    }

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
