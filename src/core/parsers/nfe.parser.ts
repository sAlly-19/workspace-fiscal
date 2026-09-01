import { FiscalParser } from './base.parser';
import { FiscalDocument, DocumentType, Party, FiscalItem, FiscalTotals, Address, FiscalBilling } from '../fiscal.types';
import crypto from 'crypto';

export class NFeParser extends FiscalParser {
  parse(xmlContent: string, rawXmlPath: string, batchId?: string): FiscalDocument {
    const jsonObj = this.parseXml(xmlContent);
    
    // Check if it is a procEventoNFe or evento (e.g. Carta de Correção or Cancelamento)
    const evento = jsonObj.procEventoNFe?.evento || jsonObj.evento;
    if (evento && (evento.infEvento || evento['@_versao'])) {
      const infEvento = evento.infEvento || evento;
      const chNFe = infEvento.chNFe ? String(infEvento.chNFe) : '';
      const tpEvento = String(infEvento.tpEvento || '');
      const descEvento = infEvento.detEvento?.descEvento || (tpEvento === '110110' ? 'Carta de Correção Eletrônica' : 'Evento NF-e');
      const xCorrecao = infEvento.detEvento?.xCorrecao || infEvento.detEvento?.xJust || descEvento;
      
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

    return {
      id: crypto.randomUUID(),
      type,
      accessKey: accessKey || undefined,
      number: ide.nNF ? String(ide.nNF) : undefined,
      series: ide.serie ? String(ide.serie) : undefined,
      issueDate: ide.dhEmi ? new Date(ide.dhEmi) : (ide.dEmi ? new Date(ide.dEmi) : undefined),
      status: 'VALID',
      issuer: this.parseParty(emit),
      recipient: dest && Object.keys(dest).length > 0 ? this.parseParty(dest) : undefined,
      items: this.parseItems(det),
      totals: this.parseTotals(total),
      billing: this.parseBilling(infNFe.cobr, infNFe.pag),
      rawXmlPath,
      batchId,
      createdAt: new Date(),
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
    const document = partyData.CNPJ || partyData.CPF || 'NÃO INFORMADO';
    const name = partyData.xNome || 'NÃO INFORMADO';
    
    let address: Address | undefined;
    const end = partyData.enderEmit || partyData.enderDest;
    
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

    return { name, document, address };
  }

  private parseItems(det: any[]): FiscalItem[] {
    return det.map(item => {
      const prod = item.prod || {};
      return {
        code: prod.cProd ? String(prod.cProd) : undefined,
        description: prod.xProd || 'NÃO INFORMADO',
        quantity: parseFloat(prod.qCom) || 0,
        unitPrice: parseFloat(prod.vUnCom) || 0,
        totalPrice: parseFloat(prod.vProd) || 0,
      };
    });
  }

  private parseTotals(total: any): FiscalTotals {
    return {
      products: parseFloat(total.vProd) || 0,
      freight: parseFloat(total.vFrete) || 0,
      insurance: parseFloat(total.vSeg) || 0,
      discount: parseFloat(total.vDesc) || 0,
      taxes: {
        icms: parseFloat(total.vICMS) || 0,
        ipi: parseFloat(total.vIPI) || 0,
        pis: parseFloat(total.vPIS) || 0,
        cofins: parseFloat(total.vCOFINS) || 0,
      },
      total: parseFloat(total.vNF) || 0,
    };
  }
}
