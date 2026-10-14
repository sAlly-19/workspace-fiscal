import { describe, it, expect } from 'vitest';
import { detectFiscalDocument } from '../detector';
import { NFeParser } from './nfe.parser';
import { CTeParser } from './cte.parser';

const SAMPLE_RES_NFE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<resNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
  <chNFe>35260112345678000199550010001234561000000018</chNFe>
  <CNPJ>12345678000199</CNPJ>
  <xNome>FORNECEDOR RESUMO SEFAZ LTDA</xNome>
  <IE>123456789</IE>
  <dhEmi>2026-02-10T14:30:00-03:00</dhEmi>
  <tpNF>1</tpNF>
  <vNF>1500.50</vNF>
  <digVal>ABCDEF123456=</digVal>
  <dhRecbto>2026-02-10T14:35:00-03:00</dhRecbto>
  <nProt>135260000012345</nProt>
  <cSitNFe>1</cSitNFe>
</resNFe>`;

const SAMPLE_RES_EVENTO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<resEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
  <cOrgao>35</cOrgao>
  <CNPJ>12345678000199</CNPJ>
  <chNFe>35260112345678000199550010001234561000000018</chNFe>
  <dhEvento>2026-02-10T16:00:00-03:00</dhEvento>
  <tpEvento>110111</tpEvento>
  <nSeqEvento>1</nSeqEvento>
  <descEvento>Cancelamento homologado</descEvento>
  <nProt>135260000099999</nProt>
</resEvento>`;

const SAMPLE_RES_CTE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<resCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="1.00">
  <chCTe>35260198765432000188570010000054321000000012</chCTe>
  <CNPJ>98765432000188</CNPJ>
  <xNome>TRANSPORTADORA RESUMO LTDA</xNome>
  <dhEmi>2026-02-11T09:00:00-03:00</dhEmi>
  <vTPrest>850.75</vTPrest>
  <vRec>850.75</vRec>
  <cSitCTe>1</cSitCTe>
</resCTe>`;

describe('SEFAZ Summary Documents Support (resNFe, resEvento, resCTe)', () => {
  describe('detectFiscalDocument', () => {
    it('detects resNFe as NFE', () => {
      expect(detectFiscalDocument(SAMPLE_RES_NFE_XML)).toBe('NFE');
    });

    it('detects resEvento as NFE', () => {
      expect(detectFiscalDocument(SAMPLE_RES_EVENTO_XML)).toBe('NFE');
    });

    it('detects resCTe as CTE', () => {
      expect(detectFiscalDocument(SAMPLE_RES_CTE_XML)).toBe('CTE');
    });
  });

  describe('NFeParser with resNFe & resEvento', () => {
    it('parses resNFe producing a valid FiscalDocument without throwing', () => {
      const parser = new NFeParser();
      const doc = parser.parse(SAMPLE_RES_NFE_XML, 'sample-resnfe.xml', 'batch-1');

      expect(doc.type).toBe('NFE');
      expect(doc.status).toBe('VALID');
      expect(doc.accessKey).toBe('35260112345678000199550010001234561000000018');
      expect(doc.number).toBe('123456');
      expect(doc.series).toBe('1');
      expect(doc.issuer?.document).toBe('12345678000199');
      expect(doc.issuer?.name).toBe('FORNECEDOR RESUMO SEFAZ LTDA');
      expect(doc.totals.total).toBe(1500.5);
      expect(doc.items.length).toBeGreaterThan(0);
      expect(doc.items[0].description).toContain('Resumo');
      expect(doc.rawXmlPath).toBe('sample-resnfe.xml');
      expect(doc.batchId).toBe('batch-1');
    });

    it('parses resEvento producing a valid event FiscalDocument', () => {
      const parser = new NFeParser();
      const doc = parser.parse(SAMPLE_RES_EVENTO_XML, 'sample-resevento.xml');

      expect(doc.type).toBe('NFE');
      expect(doc.accessKey).toBe('35260112345678000199550010001234561000000018');
      expect(doc.items[0].description).toBe('Cancelamento homologado');
    });
  });

  describe('CTeParser with resCTe', () => {
    it('parses resCTe producing a valid FiscalDocument without throwing', () => {
      const parser = new CTeParser();
      const doc = parser.parse(SAMPLE_RES_CTE_XML, 'sample-rescte.xml');

      expect(doc.type).toBe('CTE');
      expect(doc.status).toBe('VALID');
      expect(doc.accessKey).toBe('35260198765432000188570010000054321000000012');
      expect(doc.issuer?.document).toBe('98765432000188');
      expect(doc.issuer?.name).toBe('TRANSPORTADORA RESUMO LTDA');
      expect(doc.totals.total).toBe(850.75);
      expect(doc.items.length).toBeGreaterThan(0);
      expect(doc.items[0].description).toContain('Resumo de CT-e');
    });
  });
});
