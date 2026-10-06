import { decompressDocZip } from '../../fiscal/utils/compression';
import { NfseDocumentError } from '../domain/errors';
import type {
  NfseDistributedPayload,
  NfseDistributionBatch,
  NfsePayloadKind,
} from '../domain/types';
import type {
  NfseDistributionInput,
  NfseKeyQueryInput,
  NfseWireContract,
  NfseWireRequest,
} from './NfseWireContract';

/**
 * Official wire contract implementation conforming to the official
 * OpenAPI / Swagger specifications for ADN and SEFIN Nacional APIs.
 */
export class OfficialNfseWireContract implements NfseWireContract {
  public buildDistributionRequest(input: NfseDistributionInput): NfseWireRequest {
    return {
      path: `/DFe/${input.lastNsu}?cnpjConsulta=${input.cnpj}&lote=true`,
      headers: {
        Accept: 'application/json',
      },
    };
  }

  public buildDocumentRequest(input: NfseKeyQueryInput): NfseWireRequest {
    return {
      path: `/nfse/${input.accessKey}`,
      headers: {
        Accept: 'application/json',
      },
    };
  }

  public buildEventsRequest(input: NfseKeyQueryInput): NfseWireRequest {
    return {
      path: `/NFSe/${input.accessKey}/Eventos`,
      headers: {
        Accept: 'application/json',
      },
    };
  }

  public decodeDistribution(
    body: string,
    _headers: Readonly<Record<string, string>>
  ): NfseDistributionBatch {
    const data = typeof body === 'string' ? JSON.parse(body) : body;
    const statusRaw = data.StatusProcessamento || data.statusProcessamento;

    if (statusRaw === 'REJEICAO') {
      const erros = data.Erros || data.erros || [];
      const message =
        erros
          .map((e: any) =>
            [e.Codigo || e.codigo, e.Descricao || e.descricao, e.Complemento || e.complemento]
              .filter(Boolean)
              .join(' - ')
          )
          .filter(Boolean)
          .join('; ') || 'Lote de distribuição rejeitado pela SEFIN/ADN.';

      return {
        status: 'REJECTED',
        lastNsu: '0',
        maxNsu: '0',
        documents: [],
        message,
      };
    }

    if (statusRaw === 'NENHUM_DOCUMENTO_LOCALIZADO') {
      return {
        status: 'NO_DOCUMENTS',
        lastNsu: '0',
        maxNsu: '0',
        documents: [],
      };
    }

    const rawList: any[] = data.LoteDFe || data.loteDFe || [];
    const documents: NfseDistributedPayload[] = [];
    let highestNsu = 0n;

    for (const item of rawList) {
      const nsuVal = item.NSU ?? item.nsu;
      if (nsuVal != null) {
        const nsuBig = BigInt(nsuVal);
        if (nsuBig > highestNsu) {
          highestNsu = nsuBig;
        }
      }

      const tipoDoc = item.TipoDocumento || item.tipoDocumento;
      const tipoEvento = item.TipoEvento || item.tipoEvento;
      const isEvent =
        tipoDoc === 'EVENTO' || tipoDoc === 'PEDIDO_REGISTRO_EVENTO' || Boolean(tipoEvento);
      const kind: NfsePayloadKind = isEvent ? 'EVENT' : 'NFSE';
      const schemaType = isEvent
        ? tipoEvento || tipoDoc || 'EVENT'
        : tipoDoc || 'NFSE';

      const xmlGzip = item.ArquivoXml || item.arquivoXml || '';
      const xml = xmlGzip ? decompressDocZip(xmlGzip) : '';

      documents.push({
        nsu: nsuVal != null ? String(nsuVal) : undefined,
        kind,
        schemaType,
        xml,
        accessKey: item.ChaveAcesso || item.chaveAcesso,
        generatedAt: item.DataHoraGeracao || item.dataHoraGeracao,
      });
    }

    const lastNsu = highestNsu > 0n ? highestNsu.toString() : '0';
    const maxNsu = highestNsu > 0n ? (highestNsu + 1n).toString() : '0';

    return {
      status: 'DOCUMENTS_FOUND',
      lastNsu,
      maxNsu,
      documents,
    };
  }

  public decodeDocument(
    body: string,
    _headers: Readonly<Record<string, string>>
  ): NfseDistributedPayload {
    const data = typeof body === 'string' ? JSON.parse(body) : body;

    const erro = data.erro || data.Erro;
    if (erro) {
      const message =
        erro.descricao ||
        erro.Descricao ||
        erro.codigo ||
        erro.Codigo ||
        'Erro ao consultar documento NFS-e.';
      throw new NfseDocumentError(message);
    }

    const erros = data.erros || data.Erros;
    if (Array.isArray(erros) && erros.length > 0) {
      const first = erros[0];
      const message =
        first.descricao ||
        first.Descricao ||
        first.codigo ||
        first.Codigo ||
        'Erro ao consultar documento NFS-e.';
      throw new NfseDocumentError(message);
    }

    const xmlGzip = data.nfseXmlGZipB64 || data.NfseXmlGZipB64;
    if (!xmlGzip) {
      throw new NfseDocumentError('Documento retornado sem XML compactado.');
    }

    const xml = decompressDocZip(xmlGzip);
    return {
      kind: 'NFSE',
      schemaType: 'NFSE',
      accessKey: data.chaveAcesso || data.ChaveAcesso,
      generatedAt: data.dataHoraProcessamento || data.DataHoraProcessamento,
      xml,
    };
  }

  public decodeEvents(
    body: string,
    _headers: Readonly<Record<string, string>>
  ): NfseDistributedPayload[] {
    const data = typeof body === 'string' ? JSON.parse(body) : body;
    const rawList: any[] = data.LoteDFe || data.loteDFe || [];
    const events: NfseDistributedPayload[] = [];

    for (const item of rawList) {
      const tipoDoc = item.TipoDocumento || item.tipoDocumento;
      const tipoEvento = item.TipoEvento || item.tipoEvento;
      const xmlGzip = item.ArquivoXml || item.arquivoXml || '';
      const xml = xmlGzip ? decompressDocZip(xmlGzip) : '';
      const nsuVal = item.NSU ?? item.nsu;

      events.push({
        nsu: nsuVal != null ? String(nsuVal) : undefined,
        kind: 'EVENT',
        schemaType: tipoEvento || tipoDoc || 'EVENT',
        xml,
        accessKey: item.ChaveAcesso || item.chaveAcesso,
        generatedAt: item.DataHoraGeracao || item.dataHoraGeracao,
      });
    }

    return events;
  }
}
