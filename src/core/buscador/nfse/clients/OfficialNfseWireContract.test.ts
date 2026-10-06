import { describe, expect, it } from 'vitest';
import { compressToDocZip } from '../../fiscal/utils/compression';
import { NfseDocumentError } from '../domain/errors';
import { OfficialNfseWireContract } from './OfficialNfseWireContract';

const ACCESS_KEY = '12345678901234567890123456789012345678901234567890';
const CNPJ = '12345678000190';
const DUMMY_XML_NFSE = '<NFSe><infNFSe><chNFSe>12345678901234567890123456789012345678901234567890</chNFSe></infNFSe></NFSe>';
const DUMMY_XML_EVENT = '<evento><infEvento><tpEvento>CANCELAMENTO</tpEvento></infEvento></evento>';

describe('OfficialNfseWireContract', () => {
  const contract = new OfficialNfseWireContract();

  describe('buildDistributionRequest', () => {
    it('produces path /DFe/{NSU}?cnpjConsulta={cnpj}&lote=true and headers { Accept: application/json }', () => {
      const request = contract.buildDistributionRequest({
        cnpj: CNPJ,
        lastNsu: '42',
        environment: 'production',
        thumbprint: 'THUMBPRINT_EXAMPLE',
      });

      expect(request).toEqual({
        path: `/DFe/42?cnpjConsulta=${CNPJ}&lote=true`,
        headers: { Accept: 'application/json' },
      });
    });
  });

  describe('buildDocumentRequest', () => {
    it('produces path /nfse/{accessKey} and headers { Accept: application/json }', () => {
      const request = contract.buildDocumentRequest({
        accessKey: ACCESS_KEY,
        environment: 'production',
        thumbprint: 'THUMBPRINT_EXAMPLE',
      });

      expect(request).toEqual({
        path: `/nfse/${ACCESS_KEY}`,
        headers: { Accept: 'application/json' },
      });
    });
  });

  describe('buildEventsRequest', () => {
    it('produces path /NFSe/{accessKey}/Eventos and headers { Accept: application/json }', () => {
      const request = contract.buildEventsRequest({
        accessKey: ACCESS_KEY,
        environment: 'production',
        thumbprint: 'THUMBPRINT_EXAMPLE',
      });

      expect(request).toEqual({
        path: `/NFSe/${ACCESS_KEY}/Eventos`,
        headers: { Accept: 'application/json' },
      });
    });
  });

  describe('decodeDistribution', () => {
    it('successfully decodes batch with DOCUMENTOS_LOCALIZADOS, decompresses XMLs and sets lastNsu and maxNsu', () => {
      const compressedNfse = compressToDocZip(DUMMY_XML_NFSE);
      const compressedEvent = compressToDocZip(DUMMY_XML_EVENT);

      const responseBody = JSON.stringify({
        StatusProcessamento: 'DOCUMENTOS_LOCALIZADOS',
        TipoAmbiente: 'PRODUCAO',
        DataHoraProcessamento: '2026-10-06T15:00:00Z',
        LoteDFe: [
          {
            NSU: 100,
            ChaveAcesso: ACCESS_KEY,
            TipoDocumento: 'NFSE',
            ArquivoXml: compressedNfse,
            DataHoraGeracao: '2026-10-06T14:30:00Z',
          },
          {
            NSU: 105,
            ChaveAcesso: ACCESS_KEY,
            TipoDocumento: 'EVENTO',
            TipoEvento: 'CANCELAMENTO',
            ArquivoXml: compressedEvent,
            DataHoraGeracao: '2026-10-06T14:35:00Z',
          },
        ],
      });

      const batch = contract.decodeDistribution(responseBody, {});

      expect(batch.status).toBe('DOCUMENTS_FOUND');
      expect(batch.lastNsu).toBe('105');
      expect(batch.maxNsu).toBe('106');
      expect(batch.documents).toHaveLength(2);

      expect(batch.documents[0]).toEqual({
        nsu: '100',
        kind: 'NFSE',
        schemaType: 'NFSE',
        xml: DUMMY_XML_NFSE,
        accessKey: ACCESS_KEY,
        generatedAt: '2026-10-06T14:30:00Z',
      });

      expect(batch.documents[1]).toEqual({
        nsu: '105',
        kind: 'EVENT',
        schemaType: 'CANCELAMENTO',
        xml: DUMMY_XML_EVENT,
        accessKey: ACCESS_KEY,
        generatedAt: '2026-10-06T14:35:00Z',
      });
    });

    it('returns NO_DOCUMENTS and empty documents list for NENHUM_DOCUMENTO_LOCALIZADO', () => {
      const responseBody = JSON.stringify({
        StatusProcessamento: 'NENHUM_DOCUMENTO_LOCALIZADO',
        TipoAmbiente: 'PRODUCAO',
        DataHoraProcessamento: '2026-10-06T15:00:00Z',
        LoteDFe: [],
      });

      const batch = contract.decodeDistribution(responseBody, {});

      expect(batch.status).toBe('NO_DOCUMENTS');
      expect(batch.documents).toEqual([]);
    });

    it('returns REJECTED with message containing errors from Erros for REJEICAO', () => {
      const responseBody = JSON.stringify({
        StatusProcessamento: 'REJEICAO',
        TipoAmbiente: 'PRODUCAO',
        DataHoraProcessamento: '2026-10-06T15:00:00Z',
        Erros: [
          {
            Codigo: 'E001',
            Descricao: 'Certificado digital do transmissor revogado',
          },
        ],
      });

      const batch = contract.decodeDistribution(responseBody, {});

      expect(batch.status).toBe('REJECTED');
      expect(batch.documents).toEqual([]);
      expect(batch.message).toContain('Certificado digital do transmissor revogado');
      expect(batch.message).toContain('E001');
    });

    it('returns NO_DOCUMENTS for empty or non-JSON 404 responses', () => {
      const batchEmpty = contract.decodeDistribution('', {});
      expect(batchEmpty.status).toBe('NO_DOCUMENTS');
      expect(batchEmpty.documents).toEqual([]);

      const batchHtml = contract.decodeDistribution('<html>404 Not Found</html>', {});
      expect(batchHtml.status).toBe('NO_DOCUMENTS');
      expect(batchHtml.documents).toEqual([]);
    });
  });

  describe('decodeDocument', () => {
    it('successfully decodes 200 NFSeGetResponseSucesso and decompresses nfseXmlGZipB64', () => {
      const compressedXml = compressToDocZip(DUMMY_XML_NFSE);
      const responseBody = JSON.stringify({
        tipoAmbiente: 1,
        versaoAplicativo: '1.0',
        dataHoraProcessamento: '2026-10-06T15:10:00Z',
        chaveAcesso: ACCESS_KEY,
        nfseXmlGZipB64: compressedXml,
      });

      const payload = contract.decodeDocument(responseBody, {});

      expect(payload).toEqual({
        kind: 'NFSE',
        schemaType: 'NFSE',
        accessKey: ACCESS_KEY,
        generatedAt: '2026-10-06T15:10:00Z',
        xml: DUMMY_XML_NFSE,
      });
    });

    it('throws NfseDocumentError with erro.descricao when erro object is returned', () => {
      const responseBody = JSON.stringify({
        tipoAmbiente: 1,
        versaoAplicativo: '1.0',
        dataHoraProcessamento: '2026-10-06T15:10:00Z',
        erro: {
          codigo: 'E404',
          descricao: 'Chave de acesso não encontrada.',
        },
      });

      expect(() => contract.decodeDocument(responseBody, {})).toThrow(NfseDocumentError);
      expect(() => contract.decodeDocument(responseBody, {})).toThrow('Chave de acesso não encontrada.');
    });

    it('throws NfseDocumentError with erro.codigo when erro has no descricao', () => {
      const responseBody = JSON.stringify({
        tipoAmbiente: 1,
        versaoAplicativo: '1.0',
        dataHoraProcessamento: '2026-10-06T15:10:00Z',
        erro: {
          codigo: 'E500',
        },
      });

      expect(() => contract.decodeDocument(responseBody, {})).toThrow(NfseDocumentError);
      expect(() => contract.decodeDocument(responseBody, {})).toThrow('E500');
    });
  });

  describe('decodeEvents', () => {
    it('parses LoteDistribuicaoNSUResponse for /NFSe/{accessKey}/Eventos and decompresses ArquivoXml for events', () => {
      const compressedEvent = compressToDocZip(DUMMY_XML_EVENT);
      const responseBody = JSON.stringify({
        StatusProcessamento: 'DOCUMENTOS_LOCALIZADOS',
        TipoAmbiente: 'PRODUCAO',
        DataHoraProcessamento: '2026-10-06T15:20:00Z',
        LoteDFe: [
          {
            NSU: 201,
            ChaveAcesso: ACCESS_KEY,
            TipoDocumento: 'EVENTO',
            TipoEvento: 'CANCELAMENTO',
            ArquivoXml: compressedEvent,
            DataHoraGeracao: '2026-10-06T15:15:00Z',
          },
        ],
      });

      const events = contract.decodeEvents(responseBody, {});

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        nsu: '201',
        kind: 'EVENT',
        schemaType: 'CANCELAMENTO',
        xml: DUMMY_XML_EVENT,
        accessKey: ACCESS_KEY,
        generatedAt: '2026-10-06T15:15:00Z',
      });
    });
  });
});
