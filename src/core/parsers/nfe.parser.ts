import { FiscalParser } from './base.parser';
import { FiscalDocument, DocumentType, Party, FiscalItem, FiscalTotals, Address, FiscalBilling, FiscalTransport } from '../fiscal.types';
import crypto from 'crypto';
import { parseFiscalNumber } from './utils/xml-number.utils';
import { extractItemRtcTaxes, extractTotalsRtcTaxes } from './utils/rtc-taxes.utils';

export class NFeParser extends FiscalParser {
  parse(xmlContent: string, rawXmlPath: string, batchId?: string): FiscalDocument {
    const jsonObj = this.parseXml(xmlContent);
    
    // Check if it is a procEventoNFe or evento (e.g. Carta de Correção or Cancelamento)
    const evento = jsonObj.procEventoNFe?.evento
      || jsonObj.procEventoNFe?.eventoNFe
      || jsonObj.eventoNFe
      || jsonObj.evento;
    if (evento && (evento.infEvento || evento['@_versao'])) {
      const infEvento = evento.infEvento || evento;
      const chNFe = infEvento.chNFe || infEvento.chDFe ? String(infEvento.chNFe || infEvento.chDFe) : '';
      const tpEvento = String(infEvento.tpEvento || '');
      const descEvento = infEvento.detEvento?.descEvento || (tpEvento === '110110' ? 'Carta de Correção Eletrônica' : 'Evento NF-e');
      const xCorrecao = infEvento.detEvento?.xCorrecao || infEvento.detEvento?.cTexto || infEvento.detEvento?.xJust || descEvento;
      
      const numFromKey = chNFe.length >= 34 ? chNFe.substring(25, 34).replace(/^0+/, '') : undefined;
      const serieFromKey = chNFe.length >= 25 ? chNFe.substring(22, 25).replace(/^0+/, '') : undefined;
      
      return {
        id: crypto.randomUUID(),
        type: 'NFE',
        accessKey: chNFe || undefined,
        number: numFromKey,
        series: serieFromKey,
        issueDate: infEvento.dhEvento ? new Date(infEvento.dhEvento) : new Date(),
        status: 'VALID',
        issuer: {
          name: `${descEvento}`,
          document: infEvento.CNPJ || infEvento.CPF || 'NÃO INFORMADO',
        },
        items: [{
          description: typeof xCorrecao === 'string' ? xCorrecao : descEvento,
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

    // Check if it is a retInutNFe or inutNFe (Inutilização)
    const inut = jsonObj.retInutNFe?.infInut || jsonObj.inutNFe?.infInut || jsonObj.procInutNFe?.retInutNFe?.infInut;
    if (inut) {
      const docType: DocumentType = inut.mod === 65 ? 'NFCE' : 'NFE';
      const nIni = inut.nNFIni ? String(inut.nNFIni) : '';
      const nFin = inut.nNFFin ? String(inut.nNFFin) : '';
      const numStr = nIni === nFin || !nFin ? nIni : `${nIni} a ${nFin}`;
      const motivo = inut.xMotivo || 'Inutilização de Numeração Homologada';

      return {
        id: crypto.randomUUID(),
        type: docType,
        accessKey: inut.nProt ? String(inut.nProt) : undefined,
        number: numStr || undefined,
        series: inut.serie ? String(inut.serie) : undefined,
        issueDate: inut.dhRecbto ? new Date(inut.dhRecbto) : new Date(),
        status: 'VALID',
        issuer: {
          name: `Inutilização ${docType} (${inut.cUF || 'UF'})`,
          document: inut.CNPJ || 'NÃO INFORMADO',
        },
        items: [{
          description: `${motivo} - Protocolo: ${inut.nProt || 'S/N'}`,
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

    // Check if it is a resNFe (SEFAZ summary)
    const resNFe = jsonObj.resNFe;
    if (resNFe) {
      const chNFe = resNFe.chNFe ? String(resNFe.chNFe) : '';
      const numFromKey = chNFe.length >= 34 ? chNFe.substring(25, 34).replace(/^0+/, '') : undefined;
      const serieFromKey = chNFe.length >= 25 ? chNFe.substring(22, 25).replace(/^0+/, '') : undefined;
      const totalVal = parseFiscalNumber(resNFe.vNF);

      return {
        id: crypto.randomUUID(),
        type: 'NFE',
        accessKey: chNFe || undefined,
        number: numFromKey,
        series: serieFromKey,
        issueDate: resNFe.dhEmi ? new Date(resNFe.dhEmi) : new Date(),
        status: 'VALID',
        issuer: {
          name: resNFe.xNome ? String(resNFe.xNome) : 'NÃO INFORMADO',
          document: resNFe.CNPJ || resNFe.CPF || 'NÃO INFORMADO',
          ie: resNFe.IE ? String(resNFe.IE) : undefined,
        },
        items: [{
          description: 'Resumo de NF-e (Aguardando manifesto ou download integral)',
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

    // Check if it is a resEvento (SEFAZ summary event)
    const resEvento = jsonObj.resEvento;
    if (resEvento) {
      const chNFe = resEvento.chNFe ? String(resEvento.chNFe) : '';
      const numFromKey = chNFe.length >= 34 ? chNFe.substring(25, 34).replace(/^0+/, '') : undefined;
      const serieFromKey = chNFe.length >= 25 ? chNFe.substring(22, 25).replace(/^0+/, '') : undefined;
      const descEvento = resEvento.descEvento || resEvento.xEvento || (String(resEvento.tpEvento) === '110111' ? 'Cancelamento de NF-e' : 'Evento de Resumo NF-e');

      return {
        id: crypto.randomUUID(),
        type: 'NFE',
        accessKey: chNFe || undefined,
        number: numFromKey,
        series: serieFromKey,
        issueDate: resEvento.dhEvento ? new Date(resEvento.dhEvento) : new Date(),
        status: 'VALID',
        issuer: {
          name: typeof descEvento === 'string' ? descEvento : 'Evento de Resumo NF-e',
          document: resEvento.CNPJ || resEvento.CPF || 'NÃO INFORMADO',
        },
        items: [{
          description: typeof descEvento === 'string' ? descEvento : 'Evento de Resumo NF-e',
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

    // Support both nfeProc (with signature) and raw NFe
    const nfe = jsonObj.nfeProc?.NFe || jsonObj.NFe;
    
    if (!nfe || !nfe.infNFe) {
      throw new Error('Formato NF-e inválido: tag infNFe ausente.');
    }

    const infNFe = nfe.infNFe;
    const ide = infNFe.ide || {};
    const emit = infNFe.emit || {};
    const dest = infNFe.dest || {};
    const total = infNFe.total?.ICMSTot || {};
    const det = Array.isArray(infNFe.det) ? infNFe.det : (infNFe.det ? [infNFe.det] : []);

    // Determine type from mod (55 = NFe, 65 = NFCe)
    const type: DocumentType = ide.mod === 65 ? 'NFCE' : 'NFE';
    
    // Extract access key (Id attribute usually has "NFe" prefix)
    const rawId = infNFe['@_Id'] || '';
    const accessKey = rawId.replace(/^NFe/, '');

    // Extract Signature
    const sig = nfe.Signature || jsonObj.nfeProc?.Signature || jsonObj.Signature;
    const hasSignature = !!(sig?.SignedInfo && sig?.SignatureValue);
    const signatureDigest = sig?.SignedInfo?.Reference?.DigestValue ? String(sig.SignedInfo.Reference.DigestValue) : undefined;

    // Extract Protocol
    const infProt = jsonObj.nfeProc?.protNFe?.infProt || jsonObj.protNFe?.infProt;
    const hasAuthorizationProtocol = !!(infProt && infProt.nProt);
    const protocolStatus = infProt?.cStat ? String(infProt.cStat) : undefined;
    const protocolStatusDescription = infProt?.xMotivo ? String(infProt.xMotivo) : undefined;
    let protocol: string | undefined;
    if (infProt && infProt.nProt) {
      let protDateStr = '';
      if (infProt.dhRecbto) {
        try {
          const d = new Date(infProt.dhRecbto);
          protDateStr = ` - ${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR')}`;
        } catch {}
      }
      protocol = `${infProt.nProt}${protDateStr}`;
    }

    return {
      id: crypto.randomUUID(),
      type,
      accessKey: accessKey || undefined,
      number: ide.nNF ? String(ide.nNF) : undefined,
      series: ide.serie ? String(ide.serie) : undefined,
      issueDate: ide.dhEmi ? new Date(ide.dhEmi) : (ide.dEmi ? new Date(ide.dEmi) : undefined),
      exitDate: ide.dhSaiEnt ? new Date(ide.dhSaiEnt) : (ide.dSaiEnt ? new Date(ide.dSaiEnt) : undefined),
      exitTime: ide.dhSaiEnt ? new Date(ide.dhSaiEnt).toLocaleTimeString('pt-BR') : (ide.hSaiEnt ? String(ide.hSaiEnt) : undefined),
      operationNature: ide.natOp ? String(ide.natOp) : undefined,
      protocol,
      hasSignature,
      hasAuthorizationProtocol,
      protocolStatus,
      protocolStatusDescription,
      signatureDigest,
      status: 'VALID',
      issuer: this.parseParty(emit),
      recipient: dest && Object.keys(dest).length > 0 ? this.parseParty(dest) : undefined,
      transport: this.parseTransport(infNFe.transp),
      additionalInfo: infNFe.infAdic?.infCpl ? String(infNFe.infAdic.infCpl) : undefined,
      fiscoInfo: infNFe.infAdic?.infAdFisco ? String(infNFe.infAdic.infAdFisco) : undefined,
      items: this.parseItems(det),
      totals: this.parseTotals(total, infNFe.total?.ISSQNtot, infNFe.total),
      billing: this.parseBilling(infNFe.cobr, infNFe.pag),
      rawXmlPath,
      batchId,
      createdAt: new Date(),
    };
  }

  private parseTransport(transp: any): FiscalTransport | undefined {
    if (!transp) return undefined;
    const transporta = transp.transporta || {};
    const veic = transp.veicTransp || {};
    const vol = Array.isArray(transp.vol) ? transp.vol[0] : (transp.vol || {});

    return {
      modFrete: transp.modFrete !== undefined ? transp.modFrete : undefined,
      name: transporta.xNome ? String(transporta.xNome) : undefined,
      document: transporta.CNPJ || transporta.CPF ? String(transporta.CNPJ || transporta.CPF) : undefined,
      ie: transporta.IE ? String(transporta.IE) : undefined,
      address: transporta.xEnder ? String(transporta.xEnder) : undefined,
      city: transporta.xMun ? String(transporta.xMun) : undefined,
      state: transporta.UF ? String(transporta.UF) : undefined,
      vehiclePlate: veic.placa ? String(veic.placa) : undefined,
      vehicleUf: veic.UF ? String(veic.UF) : undefined,
      anttCode: veic.RNTC ? String(veic.RNTC) : undefined,
      volumeQuantity: vol.qVol !== undefined ? vol.qVol : undefined,
      volumeSpecies: vol.esp ? String(vol.esp) : undefined,
      volumeBrand: vol.marca ? String(vol.marca) : undefined,
      volumeNumber: vol.nVol ? String(vol.nVol) : undefined,
      grossWeight: vol.pesoB !== undefined ? parseFloat(vol.pesoB) : undefined,
      netWeight: vol.pesoL !== undefined ? parseFloat(vol.pesoL) : undefined,
    };
  }

  private parseBilling(cobrData: any, pagData: any): FiscalBilling | undefined {
    if (!cobrData && !pagData) return undefined;

    const billing: FiscalBilling = {};
    let hasData = false;

    if (cobrData?.fat) {
      const fat = cobrData.fat;
      billing.invoice = {
        number: fat.nFat ? String(fat.nFat) : undefined,
        originalAmount: fat.vOrig !== undefined ? parseFloat(fat.vOrig) : undefined,
        discountAmount: fat.vDesc !== undefined ? parseFloat(fat.vDesc) : undefined,
        netAmount: fat.vLiq !== undefined ? parseFloat(fat.vLiq) : undefined,
      };
      hasData = true;
    }

    if (cobrData?.dup) {
      const dups = Array.isArray(cobrData.dup) ? cobrData.dup : [cobrData.dup];
      billing.duplicates = dups.map((d: any) => ({
        number: d.nDup ? String(d.nDup) : '',
        dueDate: d.dVenc ? String(d.dVenc) : '',
        amount: parseFloat(d.vDup) || 0,
      }));
      hasData = true;
    }

    if (pagData) {
      const detPags = Array.isArray(pagData.detPag)
        ? pagData.detPag
        : pagData.detPag
        ? [pagData.detPag]
        : [];

      if (detPags.length > 0) {
        billing.payments = detPags.map((p: any) => ({
          paymentType: p.tPag ? String(p.tPag) : undefined,
          indicator: p.indPag !== undefined ? String(p.indPag) : undefined,
          amount: parseFloat(p.vPag) || 0,
        }));
        hasData = true;
      }
    }

    return hasData ? billing : undefined;
  }

  private parseParty(partyData: any): Party {
    const rawDoc = partyData.CNPJ ?? partyData.CPF;
    const document = rawDoc !== undefined && rawDoc !== null ? String(rawDoc) : 'NÃO INFORMADO';
    const name = partyData.xNome ? String(partyData.xNome) : 'NÃO INFORMADO';
    const ie = partyData.IE ? String(partyData.IE) : undefined;
    const im = partyData.IM ? String(partyData.IM) : undefined;
    const end = partyData.enderEmit || partyData.enderDest;
    const phone = end?.fone ? String(end.fone) : undefined;
    
    let address: Address | undefined;
    if (end) {
      address = {
        street: end.xLgr,
        number: end.nro,
        complement: end.xCpl,
        neighborhood: end.xBairro,
        city: end.xMun,
        state: end.UF,
        zipCode: end.CEP,
        country: end.xPais,
      };
    }

    return { name, document, ie, im, phone, address };
  }

  private parseItems(det: any[]): FiscalItem[] {
    return det.map(item => {
      const prod = item.prod || {};
      const imp = item.imposto || {};

      let cst = '00';
      let orig = '0';
      let icmsBase = 0;
      let icmsAliq = 0;
      let icmsValue = 0;

      const icms = imp.ICMS || {};
      for (const k of Object.keys(icms)) {
        const node = icms[k];
        if (node && typeof node === 'object') {
          if (node.orig !== undefined) orig = String(node.orig);
          if (node.CST !== undefined) cst = String(node.CST);
          else if (node.CSOSN !== undefined) cst = String(node.CSOSN);
          if (node.vBC !== undefined) icmsBase = parseFloat(node.vBC) || 0;
          if (node.pICMS !== undefined) icmsAliq = parseFloat(node.pICMS) || 0;
          if (node.vICMS !== undefined) icmsValue = parseFloat(node.vICMS) || 0;
          break;
        }
      }

      let ipiValue = 0;
      let ipiAliq = 0;
      const ipi = imp.IPI?.IPITrib || imp.IPI || {};
      if (ipi.vIPI !== undefined) ipiValue = parseFloat(ipi.vIPI) || 0;
      const rtcTaxes = extractItemRtcTaxes(imp);

      return {
        code: prod.cProd !== undefined && prod.cProd !== null ? String(prod.cProd) : undefined,
        description: prod.xProd || 'NÃO INFORMADO',
        ncm: prod.NCM !== undefined && prod.NCM !== null ? String(prod.NCM) : undefined,
        cst: `${orig}/${cst}`,
        cfop: prod.CFOP !== undefined && prod.CFOP !== null ? String(prod.CFOP) : undefined,
        unit: prod.uCom !== undefined && prod.uCom !== null ? String(prod.uCom) : undefined,
        quantity: parseFloat(prod.qCom) || 0,
        unitPrice: parseFloat(prod.vUnCom) || 0,
        totalPrice: parseFloat(prod.vProd) || 0,
        discount: parseFloat(prod.vDesc) || 0,
        icmsBase,
        icmsAliq,
        icmsValue,
        ipiValue,
        ipiAliq,
        ...rtcTaxes,
      };
    });
  }

  private parseTotals(total: any, issqnTotal?: any, rawTotalNode?: any): FiscalTotals {
    const icms = parseFloat(total.vICMS) || 0;
    const icmsBase = parseFloat(total.vBC) || 0;
    const icmsSt = parseFloat(total.vST) || 0;
    const icmsStBase = parseFloat(total.vBCST) || 0;
    const ipi = parseFloat(total.vIPI) || 0;
    const pis = parseFloat(total.vPIS) || (issqnTotal ? parseFloat(issqnTotal.vPIS) || 0 : 0);
    const cofins = parseFloat(total.vCOFINS) || (issqnTotal ? parseFloat(issqnTotal.vCOFINS) || 0 : 0);
    const iss = issqnTotal ? parseFloat(issqnTotal.vISS) || 0 : 0;
    const ii = parseFloat(total.vII) || 0;
    const fcp = parseFloat(total.vFCP) || 0;
    const icmsUfDest = parseFloat(total.vICMSUFDest) || 0;
    const icmsUfRemet = parseFloat(total.vICMSUFRemet) || 0;
    const fcpUfDest = parseFloat(total.vFCPUFDest) || 0;
    const rtcTotals = extractTotalsRtcTaxes(rawTotalNode || total);
    const totalTaxes = parseFloat(total.vTotTrib) || (icms + icmsSt + ipi + pis + cofins + iss + ii + (rtcTotals.ibs || 0) + (rtcTotals.cbs || 0) + (rtcTotals.is || 0));

    return {
      products: parseFloat(total.vProd) || (issqnTotal ? parseFloat(issqnTotal.vServ) || 0 : 0),
      freight: parseFloat(total.vFrete) || 0,
      insurance: parseFloat(total.vSeg) || 0,
      discount: parseFloat(total.vDesc) || (issqnTotal ? parseFloat(issqnTotal.vDesc) || 0 : 0),
      otherExpenses: parseFloat(total.vOutro) || 0,
      icmsBase,
      icmsStBase,
      totalTaxes,
      taxes: {
        icms,
        icmsBase,
        icmsSt,
        icmsStBase,
        ipi,
        pis,
        cofins,
        iss,
        ii,
        fcp,
        icmsUfDest,
        icmsUfRemet,
        fcpUfDest,
        ...rtcTotals,
        totalTaxes,
      },
      total: parseFloat(total.vNF) || (issqnTotal ? parseFloat(issqnTotal.vServ) || 0 : 0),
    };
  }
}
