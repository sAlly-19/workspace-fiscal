import type { NfseEnvironment } from '../domain/types';

export interface NfseEndpoints {
  adnBaseUrl: string;
  sefinBaseUrl: string;
}

const NFSE_ENDPOINTS: Record<NfseEnvironment, NfseEndpoints> = {
  production: {
    adnBaseUrl: 'https://adn.nfse.gov.br/contribuintes',
    sefinBaseUrl: 'https://sefin.nfse.gov.br/SefinNacional',
  },
  homologation: {
    adnBaseUrl: 'https://adn.producaorestrita.nfse.gov.br/contribuintes',
    sefinBaseUrl: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
  },
};

export function getNfseEndpoints(environment: NfseEnvironment): NfseEndpoints {
  return NFSE_ENDPOINTS[environment];
}
