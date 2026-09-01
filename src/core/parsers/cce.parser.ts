import { XMLParser } from 'fast-xml-parser';

export interface CartaCorrecao {
  sequencia: number;
  dataHoraEvento: string;
  protocolo: string;
  textoCorrecao: string;
}

/**
 * Parser do XML de evento CC-e (carta de correção).
 * Aceita tanto o envelope `<procEventoNFe><evento><infEvento>` quanto o nó direto `<infEvento>`.
 * Filtra apenas eventos do tipo 110110 (CC-e). Retorna lista ordenada por sequência.
 */
export class CartaCorrecaoParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: false,
      trimValues: true,
    });
  }

  parse(xmlContent: string): CartaCorrecao[] {
    if (!xmlContent || !xmlContent.trim()) return [];
    const json = this.parser.parse(xmlContent);
    const events: any[] = [];

    // Caminho 1: <procEventoNFe><evento><infEvento>
    const proc = json.procEventoNFe ?? json['procEventoNFe'];
    if (proc) {
      const ev = proc.evento ?? proc['evento'];
      const arr = Array.isArray(ev) ? ev : [ev];
      for (const e of arr) {
        if (e?.infEvento) events.push(e.infEvento);
      }
    }
    // Caminho 2: <evento><infEvento> direto
    if (events.length === 0) {
      const ev = json.evento ?? json['evento'];
      const arr = Array.isArray(ev) ? ev : [ev];
      for (const e of arr) {
        if (e?.infEvento) events.push(e.infEvento);
      }
    }
    // Caminho 3: <infEvento> na raiz
    if (events.length === 0 && json.infEvento) {
      events.push(json.infEvento);
    }

    const result: CartaCorrecao[] = [];
    for (const inf of events) {
      if (!inf) continue;
      const tipo = String(inf.tpEvento ?? '').trim();
      if (tipo !== '110110') continue;
      const detEvento = inf.detEvento ?? {};
      const xCorrecao = detEvento.xCorrecao ?? detEvento.descEvento ?? '';
      const seq = Number(inf.nSeqEvento ?? '1');
      const dhEvento = String(inf.dhEvento ?? '');
      // `Id` pode estar como atributo ou como string com prefixo. Aceitar ambos.
      const idAttr = inf['@_Id'] ?? inf.Id ?? inf.nProtEvento ?? '';
      result.push({
        sequencia: Number.isFinite(seq) ? seq : 1,
        dataHoraEvento: dhEvento,
        protocolo: String(idAttr).trim(),
        textoCorrecao: String(xCorrecao).trim(),
      });
    }
    result.sort((a, b) => a.sequencia - b.sequencia);
    return result;
  }
}