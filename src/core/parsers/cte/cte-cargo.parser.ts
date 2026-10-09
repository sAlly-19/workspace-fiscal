import {
  FiscalCteCargo,
  FiscalCteComponent,
  FiscalCteDoc,
  FiscalCteModal,
} from '../../fiscal.types';
import { parseCteNumber } from './cte-number.utils';

export function parseComponents(vPrest: any): FiscalCteComponent[] {
  const list: FiscalCteComponent[] = [];
  if (!vPrest || !vPrest.Comp) return list;
  const comps = Array.isArray(vPrest.Comp) ? vPrest.Comp : [vPrest.Comp];
  for (const c of comps) {
    if (c && c.xNome) {
      list.push({
        name: String(c.xNome),
        amount: parseCteNumber(c.vComp),
      });
    }
  }
  return list;
}

export function parseCargo(infCarga: any): FiscalCteCargo {
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
          quantity: parseCteNumber(q.qCarga),
        });
      }
    }
  }

  return {
    cargoValue: infCarga.vCarga !== undefined ? parseCteNumber(infCarga.vCarga) : undefined,
    predominantProduct: infCarga.proPred ? String(infCarga.proPred) : undefined,
    otherCharacteristics: infCarga.xOutCat ? String(infCarga.xOutCat) : undefined,
    averbationValue: infCarga.vCargaAverb !== undefined ? parseCteNumber(infCarga.vCargaAverb) : undefined,
    quantities,
  };
}

export function parseDocs(infDoc: any): FiscalCteDoc[] {
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
          amount: parseCteNumber(n.vNF),
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
          amount: parseCteNumber(n.vDocFisc),
        });
      }
    }
  }

  return list;
}

export function parseModal(infModal: any): FiscalCteModal {
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

