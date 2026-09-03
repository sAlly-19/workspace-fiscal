import { FiscalParser } from './base.parser';
import { 
  FiscalDocument, 
  Party, 
  FiscalTotals, 
  Address, 
  FiscalBilling,
  FiscalCteCargo,
  FiscalCteComponent,
  FiscalCteDoc,
  FiscalCteModal,
  FiscalCteRoute,
  FiscalCteTomador
} from '../fiscal.types';
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

    const emitParty = this.parseParty(emit);
    const remParty = rem && Object.keys(rem).length > 0 ? this.parseParty(rem) : undefined;
    const destParty = dest && Object.keys(dest).length > 0 ? this.parseParty(dest) : undefined;
    const expedParty = exped && Object.keys(exped).length > 0 ? this.parseParty(exped) : undefined;
    const recebParty = receb && Object.keys(receb).length > 0 ? this.parseParty(receb) : undefined;

    // Tomador do serviço
    const cteTomador = this.parseTomador(ide, infCte.toma3, infCte.toma4, remParty, destParty, expedParty, recebParty);

    // Rota
    const cteRoute: FiscalCteRoute = {
      startCity: ide.xMunIni ? String(ide.xMunIni) : undefined,
      startState: ide.UFIni ? String(ide.UFIni) : undefined,
      endCity: ide.xMunFim ? String(ide.xMunFim) : undefined,
      endState: ide.UFFim ? String(ide.UFFim) : undefined,
    };

    // Componentes do valor do frete
    const cteComponents = this.parseComponents(vPrest);

    // Informações da carga
    const cteCargo = this.parseCargo(infCTeNorm.infCarga || infCte.infCarga);

    // Documentos originários / NF-e transportadas
    const cteDocs = this.parseDocs(infCTeNorm.infDoc || infCte.infDoc);

    // Modal Rodoviário
    const cteModal = this.parseModal(infCTeNorm.infModal || infCte.infModal);

    // ICMS detalhado
    const icmsDetails = this.parseIcms(imp);

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
    const totalPrestacao = this.parseNumber(vPrest.vTPrest);

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
      totals: this.parseTotals(vPrest, imp, icmsDetails),
      billing: this.parseBilling(infCte.cobr),
      additionalInfo,
      fiscoInfo,
      rawXmlPath,
      batchId,
      createdAt: new Date(),
    };
  }

  private parseTomador(
    ide: any, 
    toma3: any, 
    toma4: any, 
    rem?: Party, 
    dest?: Party, 
    exped?: Party, 
    receb?: Party
  ): FiscalCteTomador {
    let role = '0';
    if (toma3 && toma3.toma !== undefined) {
      role = String(toma3.toma);
    } else if (toma4 && toma4.toma !== undefined) {
      role = String(toma4.toma);
    } else if (ide.toma !== undefined) {
      role = String(ide.toma);
    }

    if (toma4 && (toma4.CNPJ || toma4.CPF || toma4.xNome)) {
      const rawDoc = toma4.CNPJ ?? toma4.CPF;
      const docStr = rawDoc ? String(rawDoc) : undefined;
      const end = toma4.enderToma || {};
      return {
        role: '4',
        name: toma4.xNome ? String(toma4.xNome) : undefined,
        document: docStr,
        ie: toma4.IE ? String(toma4.IE) : undefined,
        phone: toma4.fone ? String(toma4.fone) : undefined,
        address: end.xLgr ? {
          street: end.xLgr,
          number: end.nro ? String(end.nro) : undefined,
          complement: end.xCpl,
          neighborhood: end.xBairro,
          city: end.xMun,
          state: end.UF,
          zipCode: end.CEP ? String(end.CEP) : undefined,
        } : undefined,
      };
    }

    // Map role
    if (role === '0' && rem) {
      return { role: '0', name: rem.name, document: rem.document, ie: rem.ie, phone: rem.phone, address: rem.address };
    }
    if (role === '1' && exped) {
      return { role: '1', name: exped.name, document: exped.document, ie: exped.ie, phone: exped.phone, address: exped.address };
    }
    if (role === '2' && receb) {
      return { role: '2', name: receb.name, document: receb.document, ie: receb.ie, phone: receb.phone, address: receb.address };
    }
    if (role === '3' && dest) {
      return { role: '3', name: dest.name, document: dest.document, ie: dest.ie, phone: dest.phone, address: dest.address };
    }

    return {
      role,
      name: rem?.name || dest?.name || 'NÃO INFORMADO',
      document: rem?.document || dest?.document || 'NÃO INFORMADO',
      ie: rem?.ie || dest?.ie,
      phone: rem?.phone || dest?.phone,
      address: rem?.address || dest?.address,
    };
  }

  private parseComponents(vPrest: any): FiscalCteComponent[] {
    const list: FiscalCteComponent[] = [];
    if (!vPrest || !vPrest.Comp) return list;
    const comps = Array.isArray(vPrest.Comp) ? vPrest.Comp : [vPrest.Comp];
    for (const c of comps) {
      if (c && c.xNome) {
        list.push({
          name: String(c.xNome),
          amount: this.parseNumber(c.vComp),
        });
      }
    }
    return list;
  }

  private parseCargo(infCarga: any): FiscalCteCargo {
    if (!infCarga) {
      return { quantities: [] };
    }

    const quantities: Array<{ unit: string; measureType: string; quantity: number }> = [];
    if (infCarga.infQ) {
      const qArr = Array.isArray(infCarga.infQ) ? infCarga.infQ : [infCarga.infQ];
      for (const q of qArr) {
        if (q) {
          quantities.push({
            unit: String(q.cUnid || '01'),
            measureType: String(q.tpMed || 'PESO BRUTO'),
            quantity: this.parseNumber(q.qCarga),
          });
        }
      }
    }

    return {
      cargoValue: infCarga.vCarga !== undefined ? this.parseNumber(infCarga.vCarga) : undefined,
      predominantProduct: infCarga.proPred ? String(infCarga.proPred) : undefined,
      otherCharacteristics: infCarga.xOutCat ? String(infCarga.xOutCat) : undefined,
      averbationValue: infCarga.vCargaAverb !== undefined ? this.parseNumber(infCarga.vCargaAverb) : undefined,
      quantities,
    };
  }

  private parseDocs(infDoc: any): FiscalCteDoc[] {
    const list: FiscalCteDoc[] = [];
    if (!infDoc) return list;

    // NF-e
    if (infDoc.infNFe) {
      const nfeArr = Array.isArray(infDoc.infNFe) ? infDoc.infNFe : [infDoc.infNFe];
      for (const n of nfeArr) {
        if (n && n.chave) {
          list.push({
            type: 'NFE',
            key: String(n.chave),
          });
        }
      }
    }

    // NF Papel
    if (infDoc.infNF) {
      const nfArr = Array.isArray(infDoc.infNF) ? infDoc.infNF : [infDoc.infNF];
      for (const n of nfArr) {
        if (n) {
          list.push({
            type: 'NF',
            number: n.nDoc ? String(n.nDoc) : undefined,
            series: n.serie ? String(n.serie) : undefined,
            issueDate: n.dEmi ? String(n.dEmi) : undefined,
            amount: this.parseNumber(n.vNF),
          });
        }
      }
    }

    // Outros
    if (infDoc.infOutros) {
      const outrosArr = Array.isArray(infDoc.infOutros) ? infDoc.infOutros : [infDoc.infOutros];
      for (const n of outrosArr) {
        if (n) {
          list.push({
            type: 'OUTROS',
            number: n.nDoc ? String(n.nDoc) : undefined,
            amount: this.parseNumber(n.vDocFisc),
          });
        }
      }
    }

    return list;
  }

  private parseModal(infModal: any): FiscalCteModal {
    if (!infModal || !infModal.rodo) return {};
    const rodo = infModal.rodo;
    const veic = rodo.veic ? (Array.isArray(rodo.veic) ? rodo.veic[0] : rodo.veic) : {};
    const moto = rodo.moto ? (Array.isArray(rodo.moto) ? rodo.moto[0] : rodo.moto) : {};

    return {
      rntrc: rodo.RNTRC ? String(rodo.RNTRC) : undefined,
      ciot: rodo.CIOT ? String(rodo.CIOT) : undefined,
      vehiclePlate: veic.placa ? String(veic.placa) : undefined,
      vehicleUf: veic.UF ? String(veic.UF) : undefined,
      renavam: veic.RENAVAM ? String(veic.RENAVAM) : undefined,
      driverName: moto.xNome ? String(moto.xNome) : undefined,
      driverCpf: moto.CPF ? String(moto.CPF) : undefined,
    };
  }

  private parseIcms(imp: any): { cst?: string; base: number; aliq: number; value: number; reduction: number } {
    let cst: string | undefined;
    let base = 0;
    let aliq = 0;
    let value = 0;
    let reduction = 0;

    const icmsNode = imp.ICMS || {};
    for (const key of Object.keys(icmsNode)) {
      const mod = icmsNode[key];
      if (mod) {
        cst = mod.CST !== undefined ? String(mod.CST) : key.replace(/^ICMS/, '');
        if (mod.vBC !== undefined) base = this.parseNumber(mod.vBC);
        if (mod.pICMS !== undefined) aliq = this.parseNumber(mod.pICMS);
        if (mod.vICMS !== undefined) value = this.parseNumber(mod.vICMS);
        if (mod.pRedBC !== undefined) reduction = this.parseNumber(mod.pRedBC);
        break;
      }
    }

    return { cst, base, aliq, value, reduction };
  }

  private parseBilling(cobrData: any): FiscalBilling | undefined {
    if (!cobrData) return undefined;
    const billing: FiscalBilling = {};
    let hasData = false;

    if (cobrData.fat) {
      const fat = cobrData.fat;
      billing.invoice = {
        number: fat.nFat ? String(fat.nFat) : undefined,
        originalAmount: fat.vOrig !== undefined ? this.parseNumber(fat.vOrig) : undefined,
        discountAmount: fat.vDesc !== undefined ? this.parseNumber(fat.vDesc) : undefined,
        netAmount: fat.vLiq !== undefined ? this.parseNumber(fat.vLiq) : undefined,
      };
      hasData = true;
    }

    if (cobrData.dup) {
      const dups = Array.isArray(cobrData.dup) ? cobrData.dup : [cobrData.dup];
      billing.duplicates = dups.map((d: any) => ({
        number: d.nDup ? String(d.nDup) : '',
        dueDate: d.dVenc ? String(d.dVenc) : '',
        amount: this.parseNumber(d.vDup),
      }));
      hasData = true;
    }

    return hasData ? billing : undefined;
  }

  private parseParty(partyData: any): Party {
    const rawDoc = partyData.CNPJ ?? partyData.CPF;
    const document = rawDoc !== undefined && rawDoc !== null ? String(rawDoc) : 'NÃO INFORMADO';
    const name = partyData.xNome ? String(partyData.xNome) : (partyData.xFant ? String(partyData.xFant) : 'NÃO INFORMADO');
    const ie = partyData.IE ? String(partyData.IE) : undefined;
    const im = partyData.IM ? String(partyData.IM) : undefined;
    const phone = partyData.fone ? String(partyData.fone) : undefined;
    const email = partyData.email ? String(partyData.email) : undefined;
    
    let address: Address | undefined;
    const end = partyData.enderEmit || partyData.enderDest || partyData.enderReme || partyData.enderExped || partyData.enderReceb || partyData.enderToma;
    
    if (end) {
      address = {
        street: end.xLgr,
        number: end.nro ? String(end.nro) : undefined,
        complement: end.xCpl,
        neighborhood: end.xBairro,
        city: end.xMun,
        state: end.UF,
        zipCode: end.CEP ? String(end.CEP) : undefined,
        country: end.xPais,
      };
    }

    return { name, document, ie, im, phone, email, address };
  }

  private parseTotals(vPrest: any, imp: any, icms: { base: number; value: number }): FiscalTotals {
    const totalPrest = this.parseNumber(vPrest.vTPrest);
    const tribFed = imp.infTribFed || {};
    const pis = this.parseNumber(tribFed.vPIS) || this.parseNumber(imp.vPIS) || 0;
    const cofins = this.parseNumber(tribFed.vCOFINS) || this.parseNumber(imp.vCOFINS) || 0;
    const inss = this.parseNumber(tribFed.vINSS) || 0;
    const ir = this.parseNumber(tribFed.vIR) || 0;
    const csll = this.parseNumber(tribFed.vCSLL) || 0;
    const totalTaxes = this.parseNumber(imp.vTotTrib) || (icms.value + pis + cofins + inss + ir + csll);

    return {
      products: 0,
      total: totalPrest,
      icmsBase: icms.base,
      totalTaxes,
      taxes: {
        icms: icms.value,
        icmsBase: icms.base,
        pis,
        cofins,
        inss,
        ir,
        csll,
        totalTaxes,
      }
    };
  }

  private parseNumber(val: any): number {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const original = String(val).trim();
    if (original.includes(',') && original.includes('.')) {
      return parseFloat(original.replace(/\./g, '').replace(',', '.')) || 0;
    }
    if (original.includes(',')) {
      return parseFloat(original.replace(',', '.')) || 0;
    }
    return parseFloat(original) || 0;
  }
}
