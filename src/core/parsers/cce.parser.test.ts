import { describe, it, expect } from 'vitest';
import { CartaCorrecaoParser } from './cce.parser';

const SAMPLE_CCE = `<?xml version="1.0" encoding="UTF-8"?>
<procEventoNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
    <infEvento Id="ID11011035240112345678000199550010000001231000000161">
      <cOrgao>35</cOrgao>
      <tpAmb>1</tpAmb>
      <CNPJ>12345678000199</CNPJ>
      <chNFe>35240112345678000199550010000001231000000131</chNFe>
      <dhEvento>2026-01-15T10:30:00-03:00</dhEvento>
      <tpEvento>110110</tpEvento>
      <nSeqEvento>1</nSeqEvento>
      <verEvento>1.00</verEvento>
      <detEvento versao="1.00">
        <descEvento>Carta de Correcao</descEvento>
        <xCorrecao>CNPJ do destinatario corrigido de 123 para 456.</xCorrecao>
        <tpCorrecao>1</tpCorrecao>
      </detEvento>
    </infEvento>
  </evento>
</procEventoNFe>`;

const SAMPLE_MULTI = `<?xml version="1.0" encoding="UTF-8"?>
<procEventoNFe>
  <evento>
    <infEvento>
      <tpEvento>110110</tpEvento>
      <nSeqEvento>2</nSeqEvento>
      <dhEvento>2026-02-01T09:00:00-03:00</dhEvento>
      <Id>ID11011035240112345678000199550010000001231000000262</Id>
      <detEvento>
        <descEvento>Carta de Correcao</descEvento>
        <xCorrecao>Descricao do produto ajustada.</xCorrecao>
      </detEvento>
    </infEvento>
  </evento>
  <evento>
    <infEvento>
      <tpEvento>110110</tpEvento>
      <nSeqEvento>1</nSeqEvento>
      <dhEvento>2026-01-15T10:30:00-03:00</dhEvento>
      <Id>ID11011035240112345678000199550010000001231000000161</Id>
      <detEvento>
        <xCorrecao>CNPJ do destinatario corrigido.</xCorrecao>
      </detEvento>
    </infEvento>
  </evento>
</procEventoNFe>`;

const SAMPLE_NON_CCE = `<?xml version="1.0" encoding="UTF-8"?>
<procEventoNFe>
  <evento>
    <infEvento>
      <tpEvento>110111</tpEvento>
      <nSeqEvento>1</nSeqEvento>
      <dhEvento>2026-01-15T10:30:00-03:00</dhEvento>
      <detEvento>
        <descEvento>Cancelamento</descEvento>
      </detEvento>
    </infEvento>
  </evento>
</procEventoNFe>`;

describe('CartaCorrecaoParser', () => {
  it('parses a single CCe with explicit envelope', () => {
    const p = new CartaCorrecaoParser();
    const result = p.parse(SAMPLE_CCE);
    expect(result.length).toBe(1);
    expect(result[0].sequencia).toBe(1);
    expect(result[0].textoCorrecao).toContain('CNPJ do destinatario corrigido');
    expect(result[0].dataHoraEvento).toContain('2026-01-15');
    expect(result[0].protocolo).toContain('ID110110');
  });

  it('parses multiple CCe events sorted by sequence', () => {
    const p = new CartaCorrecaoParser();
    const result = p.parse(SAMPLE_MULTI);
    expect(result.length).toBe(2);
    expect(result[0].sequencia).toBe(1);
    expect(result[1].sequencia).toBe(2);
  });

  it('ignores non-CCe events (cancellation 110111)', () => {
    const p = new CartaCorrecaoParser();
    const result = p.parse(SAMPLE_NON_CCE);
    expect(result.length).toBe(0);
  });

  it('returns empty array for invalid XML', () => {
    const p = new CartaCorrecaoParser();
    expect(p.parse('<not-xml/>').length).toBe(0);
    expect(p.parse('').length).toBe(0);
  });
});