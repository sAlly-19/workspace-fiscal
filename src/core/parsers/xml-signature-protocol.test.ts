import { describe, it, expect } from 'vitest';
import { NFeParser } from './nfe.parser';
import { CTeParser } from './cte.parser';

describe('XML Signature and Authorization Protocol Detection (IMP-019)', () => {
  const nfeParser = new NFeParser();
  const cteParser = new CTeParser();

  it('detects xmldsig signature and authorization protocol in authorized NFe', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
      <NFe>
        <infNFe Id="NFe35260111222333000181550010000000011123456789">
          <ide><mod>55</mod><nNF>1</nNF><serie>1</serie></ide>
          <emit><CNPJ>11222333000181</CNPJ><xNome>EMITENTE</xNome></emit>
          <total><ICMSTot><vProd>100.00</vProd><vNF>100.00</vNF></ICMSTot></total>
        </infNFe>
        <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
          <SignedInfo>
            <Reference URI="#NFe35260111222333000181550010000000011123456789">
              <DigestValue>K9p1234567890abcdef=</DigestValue>
            </Reference>
          </SignedInfo>
          <SignatureValue>MEQCIDv+1234567890abcdef==</SignatureValue>
        </Signature>
      </NFe>
      <protNFe>
        <infProt>
          <cStat>100</cStat>
          <xMotivo>Autorizado o uso da NF-e</xMotivo>
          <nProt>135260000000001</nProt>
          <dhRecbto>2026-01-15T10:00:00-03:00</dhRecbto>
        </infProt>
      </protNFe>
    </nfeProc>`;

    const doc = nfeParser.parse(xml, '/path/nfe-signed.xml');
    expect(doc.hasSignature).toBe(true);
    expect(doc.hasAuthorizationProtocol).toBe(true);
    expect(doc.protocolStatus).toBe('100');
    expect(doc.protocolStatusDescription).toBe('Autorizado o uso da NF-e');
    expect(doc.signatureDigest).toBe('K9p1234567890abcdef=');
  });

  it('detects unsigned and unprotocolled draft NFe', () => {
    const rawNfe = `<?xml version="1.0" encoding="UTF-8"?>
    <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
      <infNFe Id="NFe35260111222333000181550010000000011123456789">
        <ide><mod>55</mod><nNF>2</nNF><serie>1</serie></ide>
        <emit><CNPJ>11222333000181</CNPJ><xNome>EMITENTE</xNome></emit>
        <total><ICMSTot><vProd>50.00</vProd><vNF>50.00</vNF></ICMSTot></total>
      </infNFe>
    </NFe>`;

    const doc = nfeParser.parse(rawNfe, '/path/nfe-raw.xml');
    expect(doc.hasSignature).toBe(false);
    expect(doc.hasAuthorizationProtocol).toBe(false);
    expect(doc.protocolStatus).toBeUndefined();
  });

  it('detects cancelled NFe protocol (cStat 101)', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
      <NFe>
        <infNFe Id="NFe35260111222333000181550010000000011123456789">
          <ide><mod>55</mod><nNF>3</nNF><serie>1</serie></ide>
          <emit><CNPJ>11222333000181</CNPJ><xNome>EMITENTE</xNome></emit>
          <total><ICMSTot><vProd>100.00</vProd><vNF>100.00</vNF></ICMSTot></total>
        </infNFe>
      </NFe>
      <protNFe>
        <infProt>
          <cStat>101</cStat>
          <xMotivo>Cancelamento de NF-e homologado</xMotivo>
          <nProt>135260000000002</nProt>
        </infProt>
      </protNFe>
    </nfeProc>`;

    const doc = nfeParser.parse(xml, '/path/nfe-cancelled.xml');
    expect(doc.hasAuthorizationProtocol).toBe(true);
    expect(doc.protocolStatus).toBe('101');
    expect(doc.protocolStatusDescription).toBe('Cancelamento de NF-e homologado');
  });

  it('detects signature and protocol in CTe', () => {
    const cteXml = `<?xml version="1.0" encoding="UTF-8"?>
    <cteProc xmlns="http://www.portalfiscal.inf.br/cte">
      <CTe>
        <infCte Id="CTe35260111222333000181570010000000011123456789">
          <ide><nCT>10</nCT><serie>1</serie></ide>
          <emit><CNPJ>11222333000181</CNPJ><xNome>TRANSP</xNome></emit>
          <vPrest><vTPrest>250.00</vTPrest></vPrest>
        </infCte>
        <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
          <SignedInfo>
            <Reference URI="#CTe35260111222333000181570010000000011123456789">
              <DigestValue>CTE_DIGEST_VALUE=</DigestValue>
            </Reference>
          </SignedInfo>
          <SignatureValue>CTE_SIG_VALUE==</SignatureValue>
        </Signature>
      </CTe>
      <protCTe>
        <infProt>
          <cStat>100</cStat>
          <xMotivo>Autorizado o uso do CT-e</xMotivo>
          <nProt>135260000000003</nProt>
        </infProt>
      </protCTe>
    </cteProc>`;

    const doc = cteParser.parse(cteXml, '/path/cte-signed.xml');
    expect(doc.hasSignature).toBe(true);
    expect(doc.hasAuthorizationProtocol).toBe(true);
    expect(doc.protocolStatus).toBe('100');
    expect(doc.signatureDigest).toBe('CTE_DIGEST_VALUE=');
  });
});
