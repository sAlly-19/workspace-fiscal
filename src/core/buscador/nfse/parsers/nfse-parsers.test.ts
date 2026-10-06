import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import type { NfseDistributedPayload } from '../domain/types';
import { NfseDocumentAdapter } from './NfseDocumentAdapter';
import { NfseEventParser } from './NfseEventParser';

const KEY = '12345678901234567890123456789012345678901234567890';

// Synthetic shape used only to test the adapter. It is not labeled or used as an
// official v1.01 conformance fixture.
const SYNTHETIC_NACIONAL_SHAPED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<NFSe>
  <infNFSe Id="NFS${KEY}">
    <nNFSe>321</nNFSe>
    <dhProc>2026-10-06T09:00:00-03:00</dhProc>
    <emit><CNPJ>12345678000190</CNPJ><xNome>PRESTADOR NACIONAL</xNome></emit>
    <DPS><infDPS><serie>900</serie><nDPS>45</nDPS><toma><CNPJ>98765432000110</CNPJ><xNome>TOMADOR NACIONAL</xNome></toma><serv><cServ><cTribNac>010101</cTribNac><xDescServ>Consultoria</xDescServ></cServ></serv><valores><vServPrest><vServ>1500.50</vServ></vServPrest></valores></infDPS></DPS>
    <valores><vLiq>1500.50</vLiq><tribMun><vISSQN>75.03</vISSQN><vBC>1500.50</vBC><pAliq>5</pAliq></tribMun></valores>
  </infNFSe>
</NFSe>`;

describe('NfseDocumentAdapter', () => {
  it('preserves the original XML and maps searchable Nacional fields', () => {
    const payload: NfseDistributedPayload = {
      kind: 'NFSE',
      schemaType: 'NFSe_v1.01',
      xml: SYNTHETIC_NACIONAL_SHAPED_XML,
      accessKey: KEY,
      nsu: '42',
    };

    const result = new NfseDocumentAdapter().adapt(payload);

    expect(result).toMatchObject({
      access_key: KEY,
      document_number: '321',
      series: '900',
      issuer_cnpj: '12345678000190',
      issuer_name: 'PRESTADOR NACIONAL',
      recipient_cnpj: '98765432000110',
      recipient_name: 'TOMADOR NACIONAL',
      total_value: 1500.5,
      situacao_fiscal: 'AUTORIZADA',
      schema_type: 'NFSe_v1.01',
      nsu: '42',
      raw_xml: SYNTHETIC_NACIONAL_SHAPED_XML,
    });
  });

  it.skip('conforms to an official/anonymized Nacional v1.01 fixture (pending external artifact)', () => {
    // Intentionally skipped per design spec section 15. A real fixture must replace this
    // gate; no XML may be fabricated and called official.
  });
});

describe('NfseEventParser', () => {
  it('keeps an unknown event generic without inventing a fiscal effect', () => {
    const fixture = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'nfse-event-unknown.xml'),
      'utf8'
    );

    const result = new NfseEventParser().parse(fixture, 'evento_desconhecido_v1.01', '99');

    expect(result).toEqual({
      access_key: KEY,
      nsu: '99',
      event_identifier: `EVT${KEY}999999001`,
      event_type: '999999',
      event_sequence: 1,
      event_date: '2026-10-06T09:30:00-03:00',
      schema_type: 'evento_desconhecido_v1.01',
      raw_xml: fixture,
      fiscal_effect: 'NONE',
    });
  });

  it('parses real pedRegEvento XML with infPedReg and infEvento containing e101101', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<pedRegEvento versao="1.01" xmlns="http://www.sped.fazenda.gov.br/nfse">
  <infPedReg Id="PRE${KEY}">
    <tpAmb>1</tpAmb>
    <verAplic>1.0</verAplic>
    <dhEvento>2026-10-06T15:00:00-03:00</dhEvento>
    <tpEvento>101101</tpEvento>
    <nSeqEvento>1</nSeqEvento>
    <chNFSe>${KEY}</chNFSe>
    <infEvento>
      <e101101>
        <xDesc>Cancelamento de NFS-e</xDesc>
        <cMotivo>1</cMotivo>
      </e101101>
    </infEvento>
  </infPedReg>
</pedRegEvento>`;

    const result = new NfseEventParser().parse(xml, 'pedRegEvento_v1.01', '10');

    expect(result).toEqual({
      access_key: KEY,
      nsu: '10',
      event_identifier: `PRE${KEY}`,
      event_type: '101101',
      event_sequence: 1,
      event_date: '2026-10-06T15:00:00-03:00',
      schema_type: 'pedRegEvento_v1.01',
      raw_xml: xml,
      fiscal_effect: 'CANCELADA',
    });
  });

  it('parses pedRegEvento without infEvento tag', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<pedRegEvento versao="1.01">
  <infPedReg Id="PRE${KEY}">
    <dhEvento>2026-10-06T12:00:00-03:00</dhEvento>
    <tpEvento>202201</tpEvento>
    <nSeqEvento>2</nSeqEvento>
    <chNFSe>${KEY}</chNFSe>
  </infPedReg>
</pedRegEvento>`;

    const result = new NfseEventParser().parse(xml, 'EVENT', '11');

    expect(result).toMatchObject({
      access_key: KEY,
      nsu: '11',
      event_type: '202201',
      event_sequence: 2,
      event_date: '2026-10-06T12:00:00-03:00',
    });
  });

  it('uses fallbackAccessKey when chNFSe is absent from XML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<evento>
  <infEvento>
    <dhEvento>2026-10-06T14:00:00-03:00</dhEvento>
    <tpEvento>101101</tpEvento>
  </infEvento>
</evento>`;

    const result = new NfseEventParser().parse(xml, 'EVENT', undefined, KEY);

    expect(result.access_key).toBe(KEY);
    expect(result.fiscal_effect).toBe('CANCELADA');
  });
});
