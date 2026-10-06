import type { ICertificateProvider, HttpExecutionResult } from '../../certificates/ICertificateProvider';
import { NfseContractError, NfseHttpError, NfseTlsError } from '../domain/errors';
import type { NfseWireRequest, NfseRequestContext } from './NfseWireContract';
import { NfseRetryPolicy } from './NfseRetryPolicy';

export async function executeNfseRequest(
  provider: ICertificateProvider,
  retryPolicy: NfseRetryPolicy,
  baseUrl: string,
  request: NfseWireRequest,
  context: NfseRequestContext
): Promise<HttpExecutionResult> {
  if (!request.path.startsWith('/') || request.path.startsWith('//') || request.path.includes('://')) {
    throw new NfseContractError('O wire contract NFS-e produziu um caminho inválido.');
  }
  const url = `${baseUrl.replace(/\/$/, '')}${request.path}`;
  const response = await retryPolicy.execute(async () => {
    try {
      return await provider.executeHttpRequest({
        url,
        method: 'GET',
        thumbprint: context.thumbprint,
        headers: request.headers,
        timeoutSec: 30,
        signal: context.signal,
      });
    } catch (error) {
      if (error instanceof NfseContractError || error instanceof NfseTlsError) throw error;
      throw new NfseTlsError('Falha transitória no transporte HTTPS autenticado.');
    }
  }, context.signal);

  if (response.statusCode < 200 || response.statusCode >= 300) {
    // 400 e 404 são status padrão documentados nos Schemas da NFS-e Nacional
    // (ex: 404 no ADN indica que não há novos documentos para o NSU; 404 na SEFIN retorna ResponseErro)
    if (response.statusCode === 404 || response.statusCode === 400) {
      return response;
    }
    throw new NfseHttpError(response.statusCode, response.responseHeaders['retry-after']);
  }
  return response;
}
