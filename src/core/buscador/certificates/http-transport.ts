import type { CertificateInfo } from '../domain/types';
import type { HttpExecutionOptions } from './ICertificateProvider';

const OFFICIAL_NFSE_HOSTS = new Set([
  'adn.nfse.gov.br',
  'adn.producaorestrita.nfse.gov.br',
  'sefin.nfse.gov.br',
  'sefin.producaorestrita.nfse.gov.br',
]);

export interface ValidatedHttpExecutionOptions extends HttpExecutionOptions {
  timeoutSec: number;
  thumbprint: string;
}

export async function validateHttpExecutionOptions(
  options: HttpExecutionOptions,
  findCertificate: (thumbprint: string) => Promise<CertificateInfo | null>
): Promise<ValidatedHttpExecutionOptions> {
  if (options.signal?.aborted) throw new Error('Consulta cancelada pelo usuário.');
  if (options.method !== 'GET') throw new Error('O transporte NFS-e permite somente requisições GET.');

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(options.url);
  } catch {
    throw new Error('URL NFS-e inválida.');
  }
  if (parsedUrl.protocol !== 'https:') throw new Error('A URL NFS-e deve usar HTTPS.');
  if (parsedUrl.username || parsedUrl.password || !OFFICIAL_NFSE_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
    throw new Error('Host não autorizado para o transporte NFS-e.');
  }

  const timeoutSec = options.timeoutSec ?? 30;
  if (!Number.isInteger(timeoutSec) || timeoutSec < 1 || timeoutSec > 120) {
    throw new Error('O timeout HTTPS deve estar entre 1 e 120 segundos.');
  }

  const thumbprint = options.thumbprint.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (!/^[A-F0-9]{40,64}$/.test(thumbprint)) throw new Error('Thumbprint de certificado inválido.');
  const certificate = await findCertificate(thumbprint);
  if (!certificate) throw new Error('O certificado selecionado não foi localizado.');
  if (!certificate.has_private_key) throw new Error('O certificado selecionado não possui chave privada acessível.');
  if (certificate.is_expired || new Date(certificate.valid_to).getTime() <= Date.now()) {
    throw new Error('O certificado selecionado está expirado.');
  }

  for (const [name, value] of Object.entries(options.headers || {})) {
    if (/\r|\n/.test(name) || /\r|\n/.test(value)) throw new Error('Header HTTPS inválido.');
  }

  return { ...options, thumbprint, timeoutSec };
}

export function sanitizedTransportFailure(): Error {
  return new Error('Falha no transporte HTTPS autenticado. Consulte os logs técnicos sanitizados.');
}
