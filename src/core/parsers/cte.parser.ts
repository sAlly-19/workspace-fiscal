import { FiscalParser } from './base.parser';
import { FiscalDocument, Party, FiscalTotals, Address, FiscalBilling } from '../fiscal.types';
import crypto from 'crypto';

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
    const rem = infCte.rem || {}; // Rementente
    const dest = infCte.dest || {}; // Destinatário
    const vPrest = infCte.vPrest || {};
    const imp = infCte.imp || {};
    
    // Extract access key
    const rawId = infCte['@_Id'] || '';
    const accessKey = rawId.replace(/^CTe/, '');

    // In a CTe, the issuer is the transport company, and the recipient could be interpreted 
    // as the dest (destinatário da carga) or the tomador (who pays). We'll use dest for now.
    
    return {
      id: crypto.randomUUID(),
      type: 'CTE',
      accessKey: accessKey || undefined,
      number: ide.nCT ? String(ide.nCT) : undefined,
      series: ide.serie ? String(ide.serie) : undefined,
      issueDate: ide.dhEmi ? new Date(ide.dhEmi) : undefined,
      status: 'VALID',
      issuer: this.parseParty(emit),
      recipient: dest && Object.keys(dest).length > 0 ? this.parseParty(dest) : undefined,
      items: [
        {
          description: 'Serviço de Transporte',
          quantity: 1,
          unitPrice: parseFloat(vPrest.vTPrest) || 0,
          totalPrice: parseFloat(vPrest.vTPrest) || 0,
        }
      ],
      totals: this.parseTotals(vPrest, imp),
      billing: this.parseBilling(infCte.cobr),
      rawXmlPath,
      batchId,
      createdAt: new Date(),
    };
  }

  private parseBilling(cobrData: any): FiscalBilling | undefined {
    if (!cobrData) return undefined;
    const billing: FiscalBilling = {};
    let hasData = false;

    if (cobrData.fat) {
      const fat = cobrData.fat;
      billing.invoice = {
        number: fat.nFat ? String(fat.nFat) : undefined,
        originalAmount: fat.vOrig !== undefined ? parseFloat(fat.vOrig) : undefined,
        discountAmount: fat.vDesc !== undefined ? parseFloat(fat.vDesc) : undefined,
        netAmount: fat.vLiq !== undefined ? parseFloat(fat.vLiq) : undefined,
      };
      hasData = true;
    }

    if (cobrData.dup) {
      const dups = Array.isArray(cobrData.dup) ? cobrData.dup : [cobrData.dup];
      billing.duplicates = dups.map((d: any) => ({
        number: d.nDup ? String(d.nDup) : '',
        dueDate: d.dVenc ? String(d.dVenc) : '',
        amount: parseFloat(d.vDup) || 0,
      }));
      hasData = true;
    }

    return hasData ? billing : undefined;
  }

  private parseParty(partyData: any): Party {
    const rawDoc = partyData.CNPJ ?? partyData.CPF;
    const document = rawDoc !== undefined && rawDoc !== null ? String(rawDoc) : 'NÃO INFORMADO';
    const name = partyData.xNome ? String(partyData.xNome) : 'NÃO INFORMADO';
    
    let address: Address | undefined;
    const end = partyData.enderEmit || partyData.enderDest || partyData.enderReme;
    
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

  private parseTotals(vPrest: any, imp: any): FiscalTotals {
    let icmsTotal = 0;
    
    // CTe ICMS can be in ICMS00, ICMS20, etc.
    const icmsNode = imp.ICMS || {};
    for (const key of Object.keys(icmsNode)) {
      if (icmsNode[key] && icmsNode[key].vICMS) {
        icmsTotal += parseFloat(icmsNode[key].vICMS);
      }
    }

    return {
      products: 0,
      total: parseFloat(vPrest.vTPrest) || 0,
      taxes: {
        icms: icmsTotal,
      }
    };
  }
}
