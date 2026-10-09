import crypto from 'crypto';
import { FiscalDocument, Address } from '../../fiscal.types';
import { parseNfseNumber } from './nfse-number.utils';

/**
 * Sefin Nacional / Padrão Nacional SPED NFS-e
 */
export function parseSefinNacional(inf: any, rawXmlPath: string, batchId?: string): FiscalDocument {
  const dps = inf.DPS?.infDPS || inf.infDPS || {};
  const emit = inf.emit || {};
  const toma = dps.toma || {};
  const serv = dps.serv || {};
  const cServ = serv.cServ || {};
  const locPrest = serv.locPrest || {};
  const valores = inf.valores || {};
  const dpsValores = dps.valores || {};
  const tribFed = valores.tribFed || dpsValores.tribFed || {};
  const tribMun = valores.tribMun || dpsValores.tribMun || {};

  const rawId = inf['@_Id'] || dps['@_Id'] || '';
  const accessKey = rawId ? String(rawId).replace(/^NFS/, '') : undefined;
  const number = inf.nNFSe ? String(inf.nNFSe) : (dps.nDPS ? String(dps.nDPS) : undefined);
  const series = dps.serie ? String(dps.serie) : undefined;
  const rpsNumber = dps.nDPS ? String(dps.nDPS) : undefined;
  const rpsSeries = dps.serie ? String(dps.serie) : undefined;
  const verificationCode = inf.cVerif || inf.cVerificacao || accessKey;
  
  let issueDate: Date | undefined;
  if (inf.dhProc) {
    issueDate = new Date(inf.dhProc);
  } else if (dps.dhEmi) {
    issueDate = new Date(dps.dhEmi);
  } else {
    issueDate = new Date();
  }

  const issuerName = emit.xNome || emit.xFant || 'PRESTADOR DE SERVIÇO';
  const issuerDoc = emit.CNPJ || emit.CPF || 'NÃO INFORMADO';
  const endEmit = emit.enderNac || emit.end;
  let issuerAddress: Address | undefined;
  if (endEmit) {
    issuerAddress = {
      street: endEmit.xLgr,
      number: endEmit.nro ? String(endEmit.nro) : undefined,
      complement: endEmit.xCpl,
      neighborhood: endEmit.xBairro,
      city: inf.xLocEmi || endEmit.cMun || endEmit.xMun,
      state: endEmit.UF,
      zipCode: endEmit.CEP ? String(endEmit.CEP) : undefined,
    };
  }

  const recipientName = toma.xNome || 'TOMADOR DO SERVIÇO';
  const recipientDoc = toma.CNPJ || toma.CPF || 'NÃO INFORMADO';
  const endToma = toma.end?.endNac || toma.end || toma.enderNac;
  let recipientAddress: Address | undefined;
  if (endToma) {
    recipientAddress = {
      street: endToma.xLgr,
      number: endToma.nro ? String(endToma.nro) : undefined,
      complement: endToma.xCpl,
      neighborhood: endToma.xBairro,
      city: endToma.cMun || endToma.xMun,
      state: endToma.UF,
      zipCode: endToma.CEP ? String(endToma.CEP) : undefined,
    };
  }

  const descServ = cServ.xDescServ || serv.xDiscriminacao || inf.xTribNac || 'Serviço Prestado';
  const valServ = parseNfseNumber(dpsValores.vServPrest?.vServ) || parseNfseNumber(valores.vServ) || parseNfseNumber(valores.vLiq) || 0;
  const valDescIncond = parseNfseNumber(valores.vDescIncond) || parseNfseNumber(dpsValores.vDescIncond) || 0;
  const valDescCond = parseNfseNumber(valores.vDescCond) || parseNfseNumber(dpsValores.vDescCond) || 0;
  const valDed = parseNfseNumber(valores.vDed) || parseNfseNumber(dpsValores.vDed) || 0;

  const valIss = parseNfseNumber(valores.vISSQN) || parseNfseNumber(tribMun.vISSQN) || 0;
  const valBc = parseNfseNumber(valores.vBC) || parseNfseNumber(tribMun.vBC) || (valServ - valDescIncond - valDed);
  const aliqIss = parseNfseNumber(valores.pAliq) || parseNfseNumber(tribMun.pAliq) || 0;

  const tpRetISSQN = tribMun.tpRetISSQN || valores.tpRetISSQN;
  const issRetido = tpRetISSQN === '2' || tpRetISSQN === 2 || tpRetISSQN === '3' || tpRetISSQN === 3;
  const valIssRetido = issRetido ? (parseNfseNumber(tribMun.vISSRet) || valIss) : 0;

  const pis = parseNfseNumber(tribFed.vPIS) || parseNfseNumber(tribFed.vRetPIS) || parseNfseNumber(valores.vPIS) || 0;
  const cofins = parseNfseNumber(tribFed.vCOFINS) || parseNfseNumber(tribFed.vRetCOFINS) || parseNfseNumber(valores.vCOFINS) || 0;
  const inss = parseNfseNumber(tribFed.vINSS) || parseNfseNumber(tribFed.vRetCP) || parseNfseNumber(valores.vINSS) || 0;
  const ir = parseNfseNumber(tribFed.vIRRF) || parseNfseNumber(tribFed.vRetIRRF) || parseNfseNumber(valores.vIR) || 0;
  const csll = parseNfseNumber(tribFed.vCSLL) || parseNfseNumber(tribFed.vRetCSLL) || parseNfseNumber(valores.vCSLL) || 0;
  const outrasRet = parseNfseNumber(valores.vOutrasRet) || 0;

  const totalRetencoes = pis + cofins + inss + ir + csll + outrasRet + (issRetido ? valIss : 0);
  const totalTaxes = valIss + pis + cofins + inss + ir + csll + outrasRet;
  const valTotal = parseNfseNumber(valores.vLiq) || (valServ - valDescIncond - totalRetencoes);

  const optanteSN = emit.opSimpNac === '1' || emit.opSimpNac === 1 || emit.cRegTrib === '1' || emit.cRegTrib === 1;

  return {
    id: crypto.randomUUID(),
    type: 'NFSE',
    accessKey,
    number,
    series,
    issueDate,
    status: 'VALID',
    rpsNumber,
    rpsSeries,
    verificationCode,
    serviceCode: cServ.cTribNac || cServ.cNBS || undefined,
    cnaeCode: cServ.cCNAE || undefined,
    cityServiceCode: cServ.cTribMun || undefined,
    serviceDescription: descServ,
    serviceCity: locPrest.cMun || locPrest.xMun || undefined,
    optanteSimplesNacional: optanteSN,
    additionalInfo: inf.infAdic?.infCpl || inf.xOutrasInformacoes || undefined,
    issuer: {
      name: issuerName,
      document: issuerDoc,
      im: emit.IM ? String(emit.IM) : undefined,
      ie: emit.IE ? String(emit.IE) : undefined,
      phone: emit.fone ? String(emit.fone) : undefined,
      email: emit.email ? String(emit.email) : undefined,
      address: issuerAddress,
    },
    recipient: {
      name: recipientName,
      document: recipientDoc,
      im: toma.IM ? String(toma.IM) : undefined,
      ie: toma.IE ? String(toma.IE) : undefined,
      phone: toma.fone ? String(toma.fone) : undefined,
      email: toma.email ? String(toma.email) : undefined,
      address: recipientAddress,
    },
    items: [
      {
        code: cServ.cTribNac || cServ.cNBS || undefined,
        description: descServ,
        quantity: 1,
        unit: 'UN',
        unitPrice: valServ,
        totalPrice: valServ,
      }
    ],
    totals: {
      products: valServ,
      discount: valDescIncond,
      conditionalDiscount: valDescCond,
      unconditionalDiscount: valDescIncond,
      deductions: valDed,
      icmsBase: valBc,
      totalTaxes,
      taxes: {
        iss: valIss,
        issBase: valBc,
        issAliquot: aliqIss,
        issRetained: issRetido ? valIssRetido : 0,
        deductions: valDed,
        pis,
        cofins,
        inss,
        ir,
        csll,
        outrasRetencoes: outrasRet,
        totalTaxes,
      },
      total: valTotal || valServ,
    },
    rawXmlPath,
    batchId,
    createdAt: new Date(),
  };
}

