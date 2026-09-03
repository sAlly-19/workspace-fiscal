import { describe, it, expect } from 'vitest';
import { detectFiscalDocument } from '../detector';
import { NFeParser } from './nfe.parser';
import { CTeParser } from './cte.parser';
import { NFSeParser } from './nfse.parser';
import { parseFiscalDocument } from './index';

const SAMPLE_NFE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35240112345678000199550010000001231000000131" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>00000131</cNF>
        <natOp>VENDA DE MERCADORIAS</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>123</nNF>
        <dhEmi>2026-01-15T10:00:00-03:00</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>EMPRESA TESTE LTDA</xNome>
        <IE>123456789</IE>
        <enderEmit>
          <xLgr>RUA DAS FLORES</xLgr>
          <nro>100</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>01001000</CEP>
        </enderEmit>
      </emit>
      <dest>
        <CNPJ>98765432000188</CNPJ>
        <xNome>CLIENTE DESTINO SA</xNome>
        <IE>987654321</IE>
        <enderDest>
          <xLgr>AV BRASIL</xLgr>
          <nro>500</nro>
          <xBairro>JARDINS</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>01430000</CEP>
        </enderDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>PROD001</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>NOTEBOOK DELL INSPIRON 15</xProd>
          <NCM>84713012</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>2.0000</qCom>
          <vUnCom>2500.0000</vUnCom>
          <vProd>5000.00</vProd>
          <vDesc>100.00</vDesc>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <vBC>4900.00</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>882.00</vICMS>
            </ICMS00>
          </ICMS>
          <PIS>
            <PISAliq>
              <CST>01</CST>
              <vBC>4900.00</vBC>
              <pPIS>1.65</pPIS>
              <vPIS>80.85</vPIS>
            </PISAliq>
          </PIS>
          <COFINS>
            <COFINSAliq>
              <CST>01</CST>
              <vBC>4900.00</vBC>
              <pCOFINS>7.60</pCOFINS>
              <vCOFINS>372.40</vCOFINS>
            </COFINSAliq>
          </COFINS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>4900.00</vBC>
          <vICMS>882.00</vICMS>
          <vProd>5000.00</vProd>
          <vDesc>100.00</vDesc>
          <vNF>4900.00</vNF>
          <vPIS>80.85</vPIS>
          <vCOFINS>372.40</vCOFINS>
        </ICMSTot>
      </total>
      <cobr>
        <fat>
          <nFat>123</nFat>
          <vOrig>5000.00</vOrig>
          <vDesc>100.00</vDesc>
          <vLiq>4900.00</vLiq>
        </fat>
        <dup>
          <nDup>001</nDup>
          <dVenc>2026-02-15</dVenc>
          <vDup>4900.00</vDup>
        </dup>
      </cobr>
    </infNFe>
  </NFe>
</nfeProc>`;

const SAMPLE_CTE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<cteProc xmlns="http://www.portalfiscal.inf.br/cte" versao="3.00">
  <CTe>
    <infCte Id="CTe35240112345678000199570010000004561000000456" versao="3.00">
      <ide>
        <cUF>35</cUF>
        <cCT>00000456</cCT>
        <CFOP>5353</CFOP>
        <natOp>TRANSPORTE RODOVIARIO</natOp>
        <mod>57</mod>
        <serie>1</serie>
        <nCT>456</nCT>
        <dhEmi>2026-01-20T14:00:00-03:00</dhEmi>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <xMunIni>SAO PAULO</xMunIni>
        <UFIni>SP</UFIni>
        <xMunFim>CAMPINAS</xMunFim>
        <UFFim>SP</UFFim>
        <toma3>
          <toma>0</toma>
        </toma3>
      </ide>
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>TRANSPORTADORA RAPIDA LTDA</xNome>
        <IE>123456789</IE>
      </emit>
      <rem>
        <CNPJ>11111111000111</CNPJ>
        <xNome>REMETENTE INDUSTRIA SA</xNome>
      </rem>
      <dest>
        <CNPJ>22222222000122</CNPJ>
        <xNome>DESTINATARIO COMERCIO LTDA</xNome>
      </dest>
      <vPrest>
        <vTPrest>1500.00</vTPrest>
        <vRec>1500.00</vRec>
        <Comp>
          <xNome>FRETE VALOR</xNome>
          <vComp>1200.00</vComp>
        </Comp>
        <Comp>
          <xNome>PEDAGIO</xNome>
          <vComp>300.00</vComp>
        </Comp>
      </vPrest>
      <imp>
        <ICMS>
          <ICMS00>
            <CST>00</CST>
            <vBC>1500.00</vBC>
            <pICMS>12.00</pICMS>
            <vICMS>180.00</vICMS>
          </ICMS00>
        </ICMS>
      </imp>
      <infCTeNorm>
        <infCarga>
          <vCarga>50000.00</vCarga>
          <proPred>EQUIPAMENTOS ELETRONICOS</proPred>
          <infQ>
            <cUnid>01</cUnid>
            <tpMed>PESO BRUTO</tpMed>
            <qCarga>1250.500</qCarga>
          </infQ>
        </infCarga>
        <infDoc>
          <infNFe>
            <chave>35260111111111000111550010000001231000000123</chave>
          </infNFe>
        </infDoc>
        <infModal versaoModal="3.00">
          <rodo>
            <RNTRC>12345678</RNTRC>
            <veic>
              <placa>ABC1D23</placa>
              <UF>SP</UF>
            </veic>
            <moto>
              <xNome>JOSE DA SILVA</xNome>
              <CPF>12345678900</CPF>
            </moto>
          </rodo>
        </infModal>
      </infCTeNorm>
    </infCte>
  </CTe>
</cteProc>`;

const SAMPLE_NFSE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Nfse>
    <InfNfse>
      <Numero>789</Numero>
      <CodigoVerificacao>A1B2C3D4</CodigoVerificacao>
      <DataEmissao>2026-01-25T09:00:00</DataEmissao>
      <ValoresNfse>
        <BaseCalculo>2000.00</BaseCalculo>
        <Aliquota>5.00</Aliquota>
        <ValorIss>100.00</ValorIss>
        <ValorLiquidoNfse>2000.00</ValorLiquidoNfse>
      </ValoresNfse>
      <PrestadorServico>
        <IdentificacaoPrestador>
          <CpfCnpj>
            <Cnpj>33333333000133</Cnpj>
          </CpfCnpj>
          <InscricaoMunicipal>123456</InscricaoMunicipal>
        </IdentificacaoPrestador>
        <RazaoSocial>CONSULTORIA E SOFTWARES LTDA</RazaoSocial>
      </PrestadorServico>
      <TomadorServico>
        <IdentificacaoTomador>
          <CpfCnpj>
            <Cnpj>44444444000144</Cnpj>
          </CpfCnpj>
        </IdentificacaoTomador>
        <RazaoSocial>EMPRESA CONTRATANTE SA</RazaoSocial>
      </TomadorServico>
      <Servico>
        <Valores>
          <ValorServicos>2000.00</ValorServicos>
          <ValorDeducoes>0.00</ValorDeducoes>
          <ValorPis>13.00</ValorPis>
          <ValorCofins>60.00</ValorCofins>
          <ValorInss>0.00</ValorInss>
          <ValorIr>30.00</ValorIr>
          <ValorCsll>20.00</ValorCsll>
          <IssRetido>2</IssRetido>
          <ValorIss>100.00</ValorIss>
          <BaseCalculo>2000.00</BaseCalculo>
          <Aliquota>0.05</Aliquota>
        </Valores>
        <ItemListaServico>0107</ItemListaServico>
        <Discriminacao>DESENVOLVIMENTO DE SOFTWARE SOB ENCOMENDA</Discriminacao>
        <MunicipioPrestacaoServico>3550308</MunicipioPrestacaoServico>
      </Servico>
    </InfNfse>
  </Nfse>
</CompNfse>`;

describe('Fiscal Detectors and Parsers', () => {
  it('detects NFe correctly', () => {
    const type = detectFiscalDocument(SAMPLE_NFE_XML);
    expect(type).toBe('NFE');
  });

  it('detects CTe correctly', () => {
    const type = detectFiscalDocument(SAMPLE_CTE_XML);
    expect(type).toBe('CTE');
  });

  it('detects NFSe correctly', () => {
    const type = detectFiscalDocument(SAMPLE_NFSE_XML);
    expect(type).toBe('NFSE');
  });

  it('parses NFe correctly', () => {
    const parser = new NFeParser();
    const doc = parser.parse(SAMPLE_NFE_XML, 'sample.xml');

    expect(doc.type).toBe('NFE');
    expect(doc.number).toBe('123');
    expect(doc.series).toBe('1');
    expect(doc.accessKey).toBe('35240112345678000199550010000001231000000131');
    expect(doc.issuer?.name).toBe('EMPRESA TESTE LTDA');
    expect(doc.issuer?.document).toBe('12345678000199');
    expect(doc.recipient?.name).toBe('CLIENTE DESTINO SA');
    expect(doc.items).toHaveLength(1);
    expect(doc.items?.[0]?.code).toBe('PROD001');
    expect(doc.items?.[0]?.description).toBe('NOTEBOOK DELL INSPIRON 15');
    expect(doc.items?.[0]?.ncm).toBe('84713012');
    expect(doc.items?.[0]?.cfop).toBe('5102');
    expect(doc.items?.[0]?.unit).toBe('UN');
    expect(doc.items?.[0]?.quantity).toBe(2);
    expect(doc.items?.[0]?.unitPrice).toBe(2500);
    expect(doc.totals?.products).toBe(5000);
    expect(doc.totals?.icmsBase).toBe(4900);
    expect(doc.totals?.taxes?.icms).toBe(882);
    expect(doc.totals?.taxes?.pis).toBe(80.85);
    expect(doc.totals?.taxes?.cofins).toBe(372.4);
    expect(doc.totals?.total).toBe(4900);
    expect(doc.billing?.duplicates).toHaveLength(1);
    expect(doc.billing?.duplicates?.[0]?.amount).toBe(4900);
  });

  it('parses CTe correctly', () => {
    const parser = new CTeParser();
    const doc = parser.parse(SAMPLE_CTE_XML, 'sample-cte.xml');

    expect(doc.type).toBe('CTE');
    expect(doc.number).toBe('456');
    expect(doc.series).toBe('1');
    expect(doc.issuer?.name).toBe('TRANSPORTADORA RAPIDA LTDA');
    expect(doc.recipient?.name).toBe('DESTINATARIO COMERCIO LTDA');
    expect(doc.sender?.name).toBe('REMETENTE INDUSTRIA SA');
    expect(doc.cteRoute?.startCity).toBe('SAO PAULO');
    expect(doc.cteRoute?.endCity).toBe('CAMPINAS');
    expect(doc.cteTomador?.role).toBe('0');
    expect(doc.cteCargo?.predominantProduct).toBe('EQUIPAMENTOS ELETRONICOS');
    expect(doc.cteCargo?.cargoValue).toBe(50000);
    expect(doc.cteCargo?.quantities?.[0]?.quantity).toBe(1250.5);
    expect(doc.cteComponents).toHaveLength(2);
    expect(doc.cteComponents?.[0]?.name).toBe('FRETE VALOR');
    expect(doc.cteComponents?.[0]?.amount).toBe(1200);
    expect(doc.cteDocs?.[0]?.key).toBe('35260111111111000111550010000001231000000123');
    expect(doc.cteModal?.rntrc).toBe('12345678');
    expect(doc.cteModal?.vehiclePlate).toBe('ABC1D23');
    expect(doc.cteModal?.driverName).toBe('JOSE DA SILVA');
    expect(doc.items?.[0]?.cfop).toBe('5353');
    expect(doc.totals?.icmsBase).toBe(1500);
    expect(doc.totals?.taxes?.icms).toBe(180);
    expect(doc.totals?.total).toBe(1500);
  });

  it('parses NFSe correctly', () => {
    const parser = new NFSeParser();
    const doc = parser.parse(SAMPLE_NFSE_XML, 'sample-nfse.xml');

    expect(doc.type).toBe('NFSE');
    expect(doc.number).toBe('789');
    expect(doc.issuer?.name).toBe('CONSULTORIA E SOFTWARES LTDA');
    expect(doc.recipient?.name).toBe('EMPRESA CONTRATANTE SA');
    expect(doc.serviceCode).toBe('0107');
    expect(doc.serviceDescription).toBe('DESENVOLVIMENTO DE SOFTWARE SOB ENCOMENDA');
    expect(doc.totals?.taxes?.iss).toBe(100);
    expect(doc.totals?.taxes?.pis).toBe(13);
    expect(doc.totals?.taxes?.cofins).toBe(60);
    expect(doc.totals?.taxes?.inss).toBe(0);
    expect(doc.totals?.taxes?.ir).toBe(30);
    expect(doc.totals?.taxes?.csll).toBe(20);
    expect(doc.totals?.taxes?.issRetained).toBe(0);
    expect(doc.totals?.total).toBe(2000);
  });

  it('dispatches parseFiscalDocument correctly', () => {
    const doc = parseFiscalDocument(SAMPLE_NFE_XML, 'NFE', 'path.xml');
    expect(doc.type).toBe('NFE');
    expect(doc.number).toBe('123');
  });
});

