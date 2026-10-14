import { describe, it, expect } from 'vitest';
import { NFeParser } from './nfe.parser';
import { CTeParser } from './cte.parser';
import { NFSeParser } from './nfse.parser';

describe('Reforma Tributária 2026 (IBS, CBS e Imposto Seletivo)', () => {
  const nfeParser = new NFeParser();
  const cteParser = new CTeParser();
  const nfseParser = new NFSeParser();

  describe('NFeParser - RTC 2026', () => {
    it('extracts flat IBS, CBS and IS tags at item and total levels', () => {
      const xmlFlat = `<?xml version="1.0" encoding="UTF-8"?>
      <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
        <NFe>
          <infNFe Id="NFe35260111222333000181550010000000011123456789">
            <ide><mod>55</mod><nNF>1</nNF><serie>1</serie></ide>
            <emit><CNPJ>11222333000181</CNPJ><xNome>EMITENTE TESTE</xNome></emit>
            <dest><CNPJ>00000000000191</CNPJ><xNome>DEST TESTE</xNome></dest>
            <det nItem="1">
              <prod><cProd>001</cProd><xProd>PRODUTO TESTE</xProd><qCom>2</qCom><vUnCom>100.00</vUnCom><vProd>200.00</vProd></prod>
              <imposto>
                <IBSCBS>
                  <vBCIBS>200.00</vBCIBS>
                  <pIBS>0.10</pIBS>
                  <vIBS>0.20</vIBS>
                  <vBCCBS>200.00</vBCCBS>
                  <pCBS>0.90</pCBS>
                  <vCBS>1.80</vCBS>
                </IBSCBS>
                <IS>
                  <vBCIS>200.00</vBCIS>
                  <pIS>1.50</pIS>
                  <vIS>3.00</vIS>
                </IS>
              </imposto>
            </det>
            <total>
              <ICMSTot><vProd>200.00</vProd><vNF>200.00</vNF></ICMSTot>
              <IBSCBSTot>
                <vBCIBS>200.00</vBCIBS>
                <vIBS>0.20</vIBS>
                <vBCCBS>200.00</vBCCBS>
                <vCBS>1.80</vCBS>
              </IBSCBSTot>
              <ISTot>
                <vBCIS>200.00</vBCIS>
                <vIS>3.00</vIS>
              </ISTot>
            </total>
          </infNFe>
        </NFe>
      </nfeProc>`;

      const doc = nfeParser.parse(xmlFlat, '/path/test.xml');
      expect(doc.items[0].ibsValue).toBe(0.2);
      expect(doc.items[0].ibsAliq).toBe(0.1);
      expect(doc.items[0].ibsBase).toBe(200);
      expect(doc.items[0].cbsValue).toBe(1.8);
      expect(doc.items[0].cbsAliq).toBe(0.9);
      expect(doc.items[0].cbsBase).toBe(200);
      expect(doc.items[0].isValue).toBe(3);
      expect(doc.items[0].isAliq).toBe(1.5);
      expect(doc.items[0].isBase).toBe(200);

      expect(doc.totals?.taxes?.ibs).toBe(0.2);
      expect(doc.totals?.taxes?.ibsBase).toBe(200);
      expect(doc.totals?.taxes?.cbs).toBe(1.8);
      expect(doc.totals?.taxes?.cbsBase).toBe(200);
      expect(doc.totals?.taxes?.is).toBe(3);
      expect(doc.totals?.taxes?.isBase).toBe(200);
    });

    it('extracts nested gIBSCBS and gIS tags per NT 2024.002 / 2025.002', () => {
      const xmlNested = `<?xml version="1.0" encoding="UTF-8"?>
      <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
        <NFe>
          <infNFe Id="NFe35260111222333000181550010000000011123456789">
            <ide><mod>55</mod><nNF>2</nNF><serie>1</serie></ide>
            <emit><CNPJ>11222333000181</CNPJ><xNome>EMITENTE TESTE</xNome></emit>
            <det nItem="1">
              <prod><cProd>002</cProd><xProd>PRODUTO NESTED</xProd><qCom>1</qCom><vUnCom>500.00</vUnCom><vProd>500.00</vProd></prod>
              <imposto>
                <IBSCBS>
                  <gIBSCBS>
                    <gIBS>
                      <vBC>500.00</vBC>
                      <pIBS>0.50</pIBS>
                      <vIBS>2.50</vIBS>
                    </gIBS>
                    <gCBS>
                      <vBC>500.00</vBC>
                      <pCBS>1.20</pCBS>
                      <vCBS>6.00</vCBS>
                    </gCBS>
                  </gIBSCBS>
                </IBSCBS>
                <IS>
                  <gIS>
                    <vBC>500.00</vBC>
                    <pIS>2.00</pIS>
                    <vIS>10.00</vIS>
                  </gIS>
                </IS>
              </imposto>
            </det>
            <total>
              <ICMSTot><vProd>500.00</vProd><vNF>500.00</vNF></ICMSTot>
              <IBSCBSTot>
                <gIBSCBS>
                  <vIBS>2.50</vIBS>
                  <vCBS>6.00</vCBS>
                </gIBSCBS>
              </IBSCBSTot>
              <ISTot>
                <vIS>10.00</vIS>
              </ISTot>
            </total>
          </infNFe>
        </NFe>
      </nfeProc>`;

      const doc = nfeParser.parse(xmlNested, '/path/nested.xml');
      expect(doc.items[0].ibsValue).toBe(2.5);
      expect(doc.items[0].ibsAliq).toBe(0.5);
      expect(doc.items[0].cbsValue).toBe(6);
      expect(doc.items[0].cbsAliq).toBe(1.2);
      expect(doc.items[0].isValue).toBe(10);
      expect(doc.items[0].isAliq).toBe(2);

      expect(doc.totals?.taxes?.ibs).toBe(2.5);
      expect(doc.totals?.taxes?.cbs).toBe(6);
      expect(doc.totals?.taxes?.is).toBe(10);
    });
  });

  describe('CTeParser - RTC 2026', () => {
    it('extracts IBS and CBS in CTe imposto', () => {
      const cteXml = `<?xml version="1.0" encoding="UTF-8"?>
      <cteProc xmlns="http://www.portalfiscal.inf.br/cte">
        <CTe>
          <infCte Id="CTe35260111222333000181570010000000011123456789">
            <ide><nCT>100</nCT><serie>1</serie></ide>
            <emit><CNPJ>11222333000181</CNPJ><xNome>TRANSPORTADORA</xNome></emit>
            <vPrest><vTPrest>1000.00</vTPrest></vPrest>
            <imp>
              <ICMS><ICMS00><CST>00</CST><vBC>1000.00</vBC><pICMS>12.00</pICMS><vICMS>120.00</vICMS></ICMS00></ICMS>
              <IBSCBS>
                <vBCIBS>1000.00</vBCIBS>
                <vIBS>1.00</vIBS>
                <vBCCBS>1000.00</vBCCBS>
                <vCBS>9.00</vCBS>
              </IBSCBS>
            </imp>
          </infCte>
        </CTe>
      </cteProc>`;

      const doc = cteParser.parse(cteXml, '/path/cte.xml');
      expect(doc.totals?.taxes?.ibs).toBe(1);
      expect(doc.totals?.taxes?.cbs).toBe(9);
    });
  });

  describe('NFSeParser - RTC 2026', () => {
    it('extracts IBS and CBS in Sefin Nacional NFS-e', () => {
      const nfseXml = `<?xml version="1.0" encoding="UTF-8"?>
      <NFSe xmlns="http://www.sped.fazenda.gov.br/nfse">
        <infNFSe Id="NFS35260111222333000181000000000000000000000000000000">
          <nNFSe>500</nNFSe>
          <emit><CNPJ>11222333000181</CNPJ><xNome>PRESTADOR</xNome></emit>
          <valores>
            <vServ>1000.00</vServ>
            <vLiq>1000.00</vLiq>
            <IBSCBS>
              <vIBS>1.00</vIBS>
              <vCBS>9.00</vCBS>
            </IBSCBS>
          </valores>
        </infNFSe>
      </NFSe>`;

      const doc = nfseParser.parse(nfseXml, '/path/nfse.xml');
      expect(doc.totals?.taxes?.ibs).toBe(1);
      expect(doc.totals?.taxes?.cbs).toBe(9);
    });
  });
});

