import fs from 'fs';
import path from 'path';
import { initDatabase, rawClient } from '../src/db';
import { generateSchedule } from '../src/core/depreciation/calculate';

async function seed() {
  console.log('--- Populando banco de dados com dados de demonstração ---');
  await initDatabase();

  const storageDir = path.join(process.cwd(), 'storage', 'documents');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  // Limpar tabelas para dados limpos de demonstração
  await rawClient.execute('DELETE FROM depreciation_entries;');
  await rawClient.execute('DELETE FROM depreciation_exports;');
  await rawClient.execute('DELETE FROM assets;');
  await rawClient.execute('DELETE FROM categories;');
  await rawClient.execute('DELETE FROM document_events;');
  await rawClient.execute('DELETE FROM document_taxes;');
  await rawClient.execute('DELETE FROM document_items;');
  await rawClient.execute('DELETE FROM documents;');
  await rawClient.execute('DELETE FROM batches;');
  await rawClient.execute('DELETE FROM folders;');
  await rawClient.execute('DELETE FROM companies;');

  // 1. Folders
  const folderFiscal = 'folder_fiscal_2026';
  const folderNfe = 'folder_nfe_emitidas';
  const folderCte = 'folder_cte_fretes';
  const folderNfse = 'folder_nfse_servicos';

  await rawClient.execute({
    sql: 'INSERT INTO folders (id, name, parent_id, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)',
    args: [folderFiscal, 'Exercício Fiscal 2026', Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
  });
  await rawClient.execute({
    sql: 'INSERT INTO folders (id, name, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    args: [folderNfe, 'NF-e Mercadorias (Vendas e Compras)', folderFiscal, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
  });
  await rawClient.execute({
    sql: 'INSERT INTO folders (id, name, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    args: [folderCte, 'CT-e Conhecimentos de Frete', folderFiscal, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
  });
  await rawClient.execute({
    sql: 'INSERT INTO folders (id, name, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    args: [folderNfse, 'NFS-e Serviços Tomados', folderFiscal, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
  });

  // 2. Documentos Fiscais & XMLs
  // Doc 1: NF-e Venda de Maquinário
  const xmlNfe1 = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35260112345678000190550010000145201000145201" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>00014520</cNF>
        <natOp>VENDA DE PRODUCAO DO ESTABELECIMENTO</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>14520</nNF>
        <dhEmi>2026-03-15T09:30:00-03:00</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>12345678000190</CNPJ>
        <xNome>INDUSTRIA METALURGICA PROGRESSO LTDA</xNome>
        <xFant>PROGRESSO METAL</xFant>
        <IE>112233445566</IE>
        <enderEmit>
          <xLgr>AVENIDA DAS INDUSTRIAS</xLgr>
          <nro>1500</nro>
          <xBairro>DISTRITO INDUSTRIAL</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>04571000</CEP>
        </enderEmit>
      </emit>
      <dest>
        <CNPJ>98765432000110</CNPJ>
        <xNome>DISTRIBUIDORA AURORA ALIMENTOS S.A.</xNome>
        <IE>998877665544</IE>
        <enderDest>
          <xLgr>RODOVIA ANHANGUERA KM 102</xLgr>
          <nro>S/N</nro>
          <xBairro>PARQUE EMPRESARIAL</xBairro>
          <cMun>3509502</cMun>
          <xMun>CAMPINAS</xMun>
          <UF>SP</UF>
          <CEP>13069901</CEP>
        </enderDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>MQ-001</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>TORNO MECANICO CNC UNIVERSAL MODELO ROMI CENTUR 30D</xProd>
          <NCM>84581199</NCM>
          <CFOP>5101</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>185000.0000</vUnCom>
          <vProd>185000.00</vProd>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <vBC>185000.00</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>33300.00</vICMS>
            </ICMS00>
          </ICMS>
          <PIS>
            <PISAliq>
              <CST>01</CST>
              <vBC>185000.00</vBC>
              <pPIS>1.65</pPIS>
              <vPIS>3052.50</vPIS>
            </PISAliq>
          </PIS>
          <COFINS>
            <COFINSAliq>
              <CST>01</CST>
              <vBC>185000.00</vBC>
              <pCOFINS>7.60</pCOFINS>
              <vCOFINS>14060.00</vCOFINS>
            </COFINSAliq>
          </COFINS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>185000.00</vBC>
          <vICMS>33300.00</vICMS>
          <vProd>185000.00</vProd>
          <vNF>185000.00</vNF>
          <vPIS>3052.50</vPIS>
          <vCOFINS>14060.00</vCOFINS>
        </ICMSTot>
      </total>
      <cobr>
        <fat>
          <nFat>014520</nFat>
          <vOrig>185000.00</vOrig>
          <vLiq>185000.00</vLiq>
        </fat>
        <dup>
          <nDup>001</nDup>
          <dVenc>2026-04-15</dVenc>
          <vDup>92500.00</vDup>
        </dup>
        <dup>
          <nDup>002</nDup>
          <dVenc>2026-05-15</dVenc>
          <vDup>92500.00</vDup>
        </dup>
      </cobr>
    </infNFe>
  </NFe>
</nfeProc>`;

  const xmlNfe2 = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35260298765432000110550010000089341000089340" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>00008934</cNF>
        <natOp>COMPRA DE ATIVO IMOBILIZADO</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>8934</nNF>
        <dhEmi>2026-02-10T14:15:00-03:00</dhEmi>
        <tpNF>0</tpNF>
      </ide>
      <emit>
        <CNPJ>45678910000123</CNPJ>
        <xNome>CONCESSIONARIA COMERCIAL DE VEICULOS S.A.</xNome>
        <IE>554433221100</IE>
      </emit>
      <dest>
        <CNPJ>12345678000190</CNPJ>
        <xNome>INDUSTRIA METALURGICA PROGRESSO LTDA</xNome>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>CAM-001</cProd>
          <xProd>CAMINHAO MERCEDES-BENZ ATEGO 2430 6X2 ANO 2024</xProd>
          <NCM>87042310</NCM>
          <CFOP>1551</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>420000.0000</vUnCom>
          <vProd>420000.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vProd>420000.00</vProd>
          <vNF>420000.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

  // Doc 3: CT-e Conhecimento de Transporte Rodoviário
  const xmlCte = `<?xml version="1.0" encoding="UTF-8"?>
<cteProc xmlns="http://www.portalfiscal.inf.br/cte" versao="3.00">
  <CTe>
    <infCte Id="CTe35260133445566000188570010000055411000005541" versao="3.00">
      <ide>
        <cUF>35</cUF>
        <cCT>00005541</cCT>
        <CFOP>5353</CFOP>
        <natOp>PRESTACAO DE SERVICO DE TRANSPORTE RODOVIARIO</natOp>
        <mod>57</mod>
        <serie>1</serie>
        <nCT>5541</nCT>
        <dhEmi>2026-03-16T11:20:00-03:00</dhEmi>
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
        <CNPJ>33445566000188</CNPJ>
        <xNome>TRANSPORTADORA RAPIDO TRANSCONTINENTAL LTDA</xNome>
        <IE>987654321000</IE>
      </emit>
      <rem>
        <CNPJ>12345678000190</CNPJ>
        <xNome>INDUSTRIA METALURGICA PROGRESSO LTDA</xNome>
      </rem>
      <dest>
        <CNPJ>98765432000110</CNPJ>
        <xNome>DISTRIBUIDORA AURORA ALIMENTOS S.A.</xNome>
      </dest>
      <vPrest>
        <vTPrest>3420.00</vTPrest>
        <vRec>3420.00</vRec>
        <Comp>
          <xNome>FRETE PESO</xNome>
          <vComp>2800.00</vComp>
        </Comp>
        <Comp>
          <xNome>PEDAGIO</xNome>
          <vComp>420.00</vComp>
        </Comp>
        <Comp>
          <xNome>GRIS</xNome>
          <vComp>200.00</vComp>
        </Comp>
      </vPrest>
      <imp>
        <ICMS>
          <ICMS00>
            <CST>00</CST>
            <vBC>3420.00</vBC>
            <pICMS>12.00</pICMS>
            <vICMS>410.40</vICMS>
          </ICMS00>
        </ICMS>
      </imp>
      <infCTeNorm>
        <infCarga>
          <vCarga>185000.00</vCarga>
          <proPred>MAQUINAS INDUSTRIAIS E EQUIPAMENTOS</proPred>
          <infQ>
            <cUnid>01</cUnid>
            <tpMed>PESO BRUTO</tpMed>
            <qCarga>4850.000</qCarga>
          </infQ>
        </infCarga>
        <infDoc>
          <infNFe>
            <chave>35260112345678000190550010000145201000145201</chave>
          </infNFe>
        </infDoc>
        <infModal versaoModal="3.00">
          <rodo>
            <RNTRC>88997766</RNTRC>
            <veic>
              <placa>BRA2E19</placa>
              <UF>SP</UF>
            </veic>
            <moto>
              <xNome>CARLOS ALBERTO MENDONCA</xNome>
              <CPF>11122233344</CPF>
            </moto>
          </rodo>
        </infModal>
      </infCTeNorm>
    </infCte>
  </CTe>
</cteProc>`;

  // Doc 4: NFS-e Nota Fiscal de Serviço Eletrônica
  const xmlNfse = `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Nfse>
    <InfNfse>
      <Numero>2026048</Numero>
      <CodigoVerificacao>9F8E-7D6C-5B4A</CodigoVerificacao>
      <DataEmissao>2026-03-20T16:00:00</DataEmissao>
      <ValoresNfse>
        <ValorServicos>8500.00</ValorServicos>
        <ValorDeducoes>0.00</ValorDeducoes>
        <ValorPis>55.25</ValorPis>
        <ValorCofins>255.00</ValorCofins>
        <ValorInss>935.00</ValorInss>
        <ValorIr>127.50</ValorIr>
        <ValorCsll>85.00</ValorCsll>
        <IssRetido>1</IssRetido>
        <ValorIss>425.00</ValorIss>
        <ValorIssRetido>425.00</ValorIssRetido>
        <OutrasRetencoes>0.00</OutrasRetencoes>
        <BaseCalculo>8500.00</BaseCalculo>
        <Aliquota>5.00</Aliquota>
        <ValorLiquidoNfse>6617.25</ValorLiquidoNfse>
      </ValoresNfse>
      <PrestadorServico>
        <IdentificacaoPrestador>
          <CpfCnpj>
            <Cnpj>55667788000199</Cnpj>
          </CpfCnpj>
          <InscricaoMunicipal>88776655</InscricaoMunicipal>
        </IdentificacaoPrestador>
        <RazaoSocial>ALPHA CONSULTORIA CONTABIL E TRIBUTARIA S/S</RazaoSocial>
        <NomeFantasia>ALPHA CONTABILIDADE</NomeFantasia>
        <Endereco>
          <Endereco>AV PAULISTA</Endereco>
          <Numero>1000</Numero>
          <Complemento>CJ 142</Complemento>
          <Bairro>BELA VISTA</Bairro>
          <CodigoMunicipio>3550308</CodigoMunicipio>
          <Uf>SP</Uf>
          <Cep>01310100</Cep>
        </Endereco>
      </PrestadorServico>
      <TomadorServico>
        <IdentificacaoTomador>
          <CpfCnpj>
            <Cnpj>12345678000190</Cnpj>
          </CpfCnpj>
        </IdentificacaoTomador>
        <RazaoSocial>INDUSTRIA METALURGICA PROGRESSO LTDA</RazaoSocial>
        <Endereco>
          <Endereco>AV DAS INDUSTRIAS</Endereco>
          <Numero>1500</Numero>
          <Bairro>DISTRITO INDUSTRIAL</Bairro>
          <CodigoMunicipio>3550308</CodigoMunicipio>
          <Uf>SP</Uf>
          <Cep>04571000</Cep>
        </Endereco>
      </TomadorServico>
      <Servico>
        <Valores>
          <ValorServicos>8500.00</ValorServicos>
          <BaseCalculo>8500.00</BaseCalculo>
          <Aliquota>0.05</Aliquota>
          <ValorIss>425.00</ValorIss>
        </Valores>
        <ItemListaServico>17.01</ItemListaServico>
        <CodigoTributacaoMunicipio>692060100</CodigoTributacaoMunicipio>
        <Discriminacao>SERVICOS ESPECIALIZADOS DE ASSESSORIA CONTABIL, REVISAO TRIBUTARIA PERIODICA E AUDITORIA FISCAL REFERENTE AO PERIODO DE 01/2026 A 03/2026.</Discriminacao>
        <CodigoMunicipio>3550308</CodigoMunicipio>
      </Servico>
    </InfNfse>
  </Nfse>
</CompNfse>`;

  const pathNfe1 = path.join(storageDir, 'NFe35260112345678000190550010000145201000145201.xml');
  const pathNfe2 = path.join(storageDir, 'NFe35260298765432000110550010000089341000089340.xml');
  const pathCte = path.join(storageDir, 'CTe35260133445566000188570010000055411000005541.xml');
  const pathNfse = path.join(storageDir, 'NFSe_2026048_Alpha.xml');

  fs.writeFileSync(pathNfe1, xmlNfe1, 'utf-8');
  fs.writeFileSync(pathNfe2, xmlNfe2, 'utf-8');
  fs.writeFileSync(pathCte, xmlCte, 'utf-8');
  fs.writeFileSync(pathNfse, xmlNfse, 'utf-8');

  // Inserir documentos no banco
  await rawClient.execute({
    sql: `INSERT INTO documents (
      id, type, access_key, number, series, issue_date, status,
      issuer_name, issuer_document, recipient_name, recipient_document,
      total_amount, raw_xml_path, batch_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'doc_demo_nfe_1',
      'NFE',
      '35260112345678000190550010000145201000145201',
      '14520',
      '1',
      Math.floor(new Date('2026-03-15T09:30:00-03:00').getTime() / 1000),
      'VALID',
      'INDUSTRIA METALURGICA PROGRESSO LTDA',
      '12345678000190',
      'DISTRIBUIDORA AURORA ALIMENTOS S.A.',
      '98765432000110',
      185000.0,
      pathNfe1,
      folderNfe,
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000)
    ]
  });

  await rawClient.execute({
    sql: `INSERT INTO documents (
      id, type, access_key, number, series, issue_date, status,
      issuer_name, issuer_document, recipient_name, recipient_document,
      total_amount, raw_xml_path, batch_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'doc_demo_nfe_2',
      'NFE',
      '35260298765432000110550010000089341000089340',
      '8934',
      '1',
      Math.floor(new Date('2026-02-10T14:15:00-03:00').getTime() / 1000),
      'VALID',
      'CONCESSIONARIA COMERCIAL DE VEICULOS S.A.',
      '45678910000123',
      'INDUSTRIA METALURGICA PROGRESSO LTDA',
      '12345678000190',
      420000.0,
      pathNfe2,
      folderNfe,
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000)
    ]
  });

  await rawClient.execute({
    sql: `INSERT INTO documents (
      id, type, access_key, number, series, issue_date, status,
      issuer_name, issuer_document, recipient_name, recipient_document,
      total_amount, raw_xml_path, batch_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'doc_demo_cte_1',
      'CTE',
      '35260133445566000188570010000055411000005541',
      '5541',
      '1',
      Math.floor(new Date('2026-03-16T11:20:00-03:00').getTime() / 1000),
      'VALID',
      'TRANSPORTADORA RAPIDO TRANSCONTINENTAL LTDA',
      '33445566000188',
      'DISTRIBUIDORA AURORA ALIMENTOS S.A.',
      '98765432000110',
      3420.0,
      pathCte,
      folderCte,
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000)
    ]
  });

  await rawClient.execute({
    sql: `INSERT INTO documents (
      id, type, access_key, number, series, issue_date, status,
      issuer_name, issuer_document, recipient_name, recipient_document,
      total_amount, raw_xml_path, batch_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'doc_demo_nfse_1',
      'NFSE',
      '9F8E-7D6C-5B4A',
      '2026048',
      'U',
      Math.floor(new Date('2026-03-20T16:00:00-03:00').getTime() / 1000),
      'VALID',
      'ALPHA CONSULTORIA CONTABIL E TRIBUTARIA S/S',
      '55667788000199',
      'INDUSTRIA METALURGICA PROGRESSO LTDA',
      '12345678000190',
      8500.0,
      pathNfse,
      folderNfse,
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000)
    ]
  });

  // Itens para NF-e 1
  await rawClient.execute({
    sql: `INSERT INTO document_items (id, document_id, code, description, quantity, unit_price, total_price, cfop, ncm, unit)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ['item_1', 'doc_demo_nfe_1', 'MQ-001', 'TORNO MECANICO CNC UNIVERSAL MODELO ROMI CENTUR 30D', 1, 185000, 185000, '5101', '84581199', 'UN']
  });

  // Impostos para NF-e 1
  await rawClient.execute({
    sql: `INSERT INTO document_taxes (id, document_id, tax_type, amount, base, rate) VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['tax_1', 'doc_demo_nfe_1', 'ICMS', 33300, 185000, 18]
  });
  await rawClient.execute({
    sql: `INSERT INTO document_taxes (id, document_id, tax_type, amount, base, rate) VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['tax_2', 'doc_demo_nfe_1', 'PIS', 3052.5, 185000, 1.65]
  });
  await rawClient.execute({
    sql: `INSERT INTO document_taxes (id, document_id, tax_type, amount, base, rate) VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['tax_3', 'doc_demo_nfe_1', 'COFINS', 14060, 185000, 7.6]
  });

  // 3. Módulo Depreciação
  const companyId = 'comp_progresso';
  await rawClient.execute({
    sql: `INSERT INTO companies (id, name, trade_name, cnpj, document, state, city, depreciation_rule, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      companyId,
      'Indústria Metalúrgica Progresso Ltda',
      'Progresso Metalúrgica',
      '12345678000190',
      '12345678000190',
      'SP',
      'São Paulo',
      'PROPORTIONAL',
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000)
    ]
  });

  // Categorias
  const catMaq = 'cat_maq';
  const catVeic = 'cat_veic';
  const catInfo = 'cat_info';
  const catMoveis = 'cat_moveis';

  await rawClient.execute({
    sql: 'INSERT INTO categories (id, company_id, name, default_rate, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [catMaq, companyId, 'Máquinas e Equipamentos Industriais', 10.0, Math.floor(Date.now() / 1000)]
  });
  await rawClient.execute({
    sql: 'INSERT INTO categories (id, company_id, name, default_rate, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [catVeic, companyId, 'Veículos de Transporte e Carga', 20.0, Math.floor(Date.now() / 1000)]
  });
  await rawClient.execute({
    sql: 'INSERT INTO categories (id, company_id, name, default_rate, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [catInfo, companyId, 'Equipamentos de Tecnologia e Informática', 20.0, Math.floor(Date.now() / 1000)]
  });
  await rawClient.execute({
    sql: 'INSERT INTO categories (id, company_id, name, default_rate, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [catMoveis, companyId, 'Móveis, Utensílios e Instalações', 10.0, Math.floor(Date.now() / 1000)]
  });

  // Bens (Assets)
  const assetList = [
    {
      id: 'asset_1',
      description: 'Torno Mecânico CNC Universal Romi Centur 30D',
      supplier: 'Indústrias Romi S.A.',
      doc: '14520',
      acqDate: new Date('2024-03-15T00:00:00Z'),
      valueCents: 18500000,
      catId: catMaq,
      catName: 'Máquinas e Equipamentos Industriais',
      rate: 10.0,
      ncm: '84581199'
    },
    {
      id: 'asset_2',
      description: 'Caminhão Mercedes-Benz Atego 2430 6x2',
      supplier: 'Concessionária Comercial de Veículos S.A.',
      doc: '8934',
      acqDate: new Date('2023-08-10T00:00:00Z'),
      valueCents: 42000000,
      catId: catVeic,
      catName: 'Veículos de Transporte e Carga',
      rate: 20.0,
      ncm: '87042310'
    },
    {
      id: 'asset_3',
      description: 'Servidor Dell PowerEdge R750 2x Intel Xeon 64GB',
      supplier: 'Dell Computadores do Brasil Ltda',
      doc: '33412',
      acqDate: new Date('2025-01-05T00:00:00Z'),
      valueCents: 3850000,
      catId: catInfo,
      catName: 'Equipamentos de Tecnologia e Informática',
      rate: 20.0,
      ncm: '84715010'
    },
    {
      id: 'asset_4',
      description: 'Empilhadeira Elétrica Hyster 2.5T com Carregador Trifásico',
      supplier: 'Hyster Equipamentos de Movimentação Ltda',
      doc: '5541',
      acqDate: new Date('2024-05-20T00:00:00Z'),
      valueCents: 9500000,
      catId: catMaq,
      catName: 'Máquinas e Equipamentos Industriais',
      rate: 10.0,
      ncm: '84271019'
    },
    {
      id: 'asset_5',
      description: 'Conjunto de Estações de Trabalho e Cadeiras Ergonômicas NR-17',
      supplier: 'Móveis Corporativos Modernos Ltda',
      doc: '2210',
      acqDate: new Date('2024-11-12T00:00:00Z'),
      valueCents: 2480000,
      catId: catMoveis,
      catName: 'Móveis, Utensílios e Instalações',
      rate: 10.0,
      ncm: '94031000'
    }
  ];

  for (const a of assetList) {
    await rawClient.execute({
      sql: `INSERT INTO assets (
        id, company_id, supplier, acquisition_date, document_number, description,
        acquisition_value, ncm, category_id, category_name, annual_rate, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      args: [
        a.id,
        companyId,
        a.supplier,
        Math.floor(a.acqDate.getTime() / 1000),
        a.doc,
        a.description,
        a.valueCents,
        a.ncm,
        a.catId,
        a.catName,
        a.rate,
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000)
      ]
    });

    // Calcular parcelas mensais de depreciação linear até a competência 2026-09
    const schedule = generateSchedule({
      acquisitionDate: a.acqDate,
      acquisitionValue: a.valueCents,
      annualRate: a.rate,
      depreciationRule: 'PROPORTIONAL'
    });

    for (const entry of schedule) {
      if (entry.competence > '2026-09') continue;
      await rawClient.execute({
        sql: `INSERT INTO depreciation_entries (
          id, asset_id, competence, depreciation_value, accumulated_value, current_value, exported, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `entry_${a.id}_${entry.competence}`,
          a.id,
          entry.competence,
          entry.depreciationValue,
          entry.accumulatedValue,
          entry.currentValue,
          entry.competence < '2026-09' ? 1 : 0,
          Math.floor(Date.now() / 1000)
        ]
      });
    }
  }

  console.log('--- Dados de demonstração populados com sucesso! ---');
}

seed().catch(console.error);
