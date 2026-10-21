import { describe, it, expect } from 'vitest';
import { sniffXmlIdentifier } from './fast-xml-identifier';

describe('sniffXmlIdentifier', () => {
  it('identifica chave de 44 digitos de NF-e sem namespace', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35260100000000000000550010000000011000000010" versao="4.00">
      <ide><nNF>1</nNF></ide>
    </infNFe>
  </NFe>
</nfeProc>`;
    const result = sniffXmlIdentifier(xml);
    expect(result).not.toBeNull();
    expect(result?.accessKey).toBe('35260100000000000000550010000000011000000010');
  });

  it('identifica chave de 44 digitos com namespaces (<nfe:infNFe Id="NFe...">)', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfe:nfeProc xmlns:nfe="http://www.portalfiscal.inf.br/nfe">
  <nfe:NFe>
    <nfe:infNFe Id="NFe35260100000000000000550010000000021000000020">
    </nfe:infNFe>
  </nfe:NFe>
</nfeProc>`;
    const result = sniffXmlIdentifier(xml);
    expect(result).not.toBeNull();
    expect(result?.accessKey).toBe('35260100000000000000550010000000021000000020');
  });

  it('identifica chave de 44 digitos de CT-e via tag chCTe ou Id', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cteProc versao="4.00">
  <CTe>
    <infCte Id="CTe35260100000000000000570010000000031000000030">
    </infCte>
  </CTe>
</cteProc>`;
    const result = sniffXmlIdentifier(xml);
    expect(result).not.toBeNull();
    expect(result?.accessKey).toBe('35260100000000000000570010000000031000000030');
  });

  it('identifica NFS-e capturando numero da nota e CNPJ do prestador sem confundir com endereco ou tomador', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Nfse>
    <InfNfse>
      <Numero>8855</Numero>
      <PrestadorServico>
        <IdentificacaoPrestador>
          <CpfCnpj>
            <Cnpj>12345678000195</Cnpj>
          </CpfCnpj>
        </IdentificacaoPrestador>
        <Endereco>
          <Numero>100</Numero>
        </Endereco>
      </PrestadorServico>
      <TomadorServico>
        <IdentificacaoTomador>
          <CpfCnpj>
            <Cnpj>99887766000122</Cnpj>
          </CpfCnpj>
        </IdentificacaoTomador>
        <Endereco>
          <Numero>500</Numero>
        </Endereco>
      </TomadorServico>
    </InfNfse>
  </Nfse>
</CompNfse>`;
    const result = sniffXmlIdentifier(xml);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('NFSE');
    expect(result?.number).toBe('8855');
    expect(result?.issuerDocument).toBe('12345678000195');
    expect(result?.compositeKey).toBe('12345678000195:8855');
  });

  it('identifica NFS-e com namespace (<ns2:InfNfse>) e tag <NumeroNfse>', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ns2:CompNfse xmlns:ns2="http://www.abrasf.org.br/nfse.xsd">
  <ns2:Nfse>
    <ns2:InfNfse>
      <ns2:NumeroNfse>4321</ns2:NumeroNfse>
      <ns2:Prestador>
        <ns2:CNPJ>77889900000111</ns2:CNPJ>
      </ns2:Prestador>
    </ns2:InfNfse>
  </ns2:Nfse>
</ns2:CompNfse>`;
    const result = sniffXmlIdentifier(xml);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('NFSE');
    expect(result?.number).toBe('4321');
    expect(result?.issuerDocument).toBe('77889900000111');
  });

  it('identifica NFS-e convertida com tags <N_DA_NFSE> e <CPFCNPJ_PRESTADOR>', () => {
    const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<REGISTRO>
  <N_DA_NFSE>9944</N_DA_NFSE>
  <CPFCNPJ_PRESTADOR>45500200000141</CPFCNPJ_PRESTADOR>
</REGISTRO>`;
    const result = sniffXmlIdentifier(xml);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('NFSE');
    expect(result?.number).toBe('9944');
    expect(result?.issuerDocument).toBe('45500200000141');
    expect(result?.compositeKey).toBe('45500200000141:9944');
  });

  it('identifica Inutilizacao NFe/NFCe via bloco <infInut>', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <infInut Id="ID52244550020000014155001000000001000000001">
    <tpAmb>1</tpAmb>
    <cUF>52</cUF>
    <ano>24</ano>
    <CNPJ>45500200000141</CNPJ>
    <mod>55</mod>
    <serie>1</serie>
    <nNFIni>1</nNFIni>
    <nNFFin>1</nNFFin>
    <xJust>Falha no processo de numeracao</xJust>
  </infInut>
</inutNFe>`;
    const result = sniffXmlIdentifier(xml);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('NFSE');
    expect(result?.number).toBe('1');
    expect(result?.issuerDocument).toBe('45500200000141');
    expect(result?.compositeKey).toBe('45500200000141:1');
  });

  it('identifica chave de evento NF-e via atributo Id do infEvento', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<procEventoNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <evento versao="1.00">
    <infEvento Id="ID2102105226094550020000014155001000001467107170167301">
      <tpEvento>210210</tpEvento>
    </infEvento>
  </evento>
</procEventoNFe>`;
    const result = sniffXmlIdentifier(xml);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('KEY');
    expect(result?.accessKey).toBe('52260945500200000141550010000014671071701673');
  });

  it('retorna null para buffer vazio ou XML malformado sem chaves', () => {
    expect(sniffXmlIdentifier('')).toBeNull();
    expect(sniffXmlIdentifier('<?xml version="1.0"?><teste><foo>bar</foo></teste>')).toBeNull();
  });
});
