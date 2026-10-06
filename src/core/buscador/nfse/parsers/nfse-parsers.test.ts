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
});
