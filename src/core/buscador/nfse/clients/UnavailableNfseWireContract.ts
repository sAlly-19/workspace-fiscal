import { NfseContractError } from '../domain/errors';
import type { NfseDistributionBatch, NfseDistributedPayload } from '../domain/types';
import type {
  NfseDistributionInput,
  NfseKeyQueryInput,
  NfseWireContract,
  NfseWireRequest,
} from './NfseWireContract';

const MESSAGE = 'Contrato oficial da API NFS-e não configurado. Forneça o OpenAPI oficial ou uma resposta real anonimizada.';

export class UnavailableNfseWireContract implements NfseWireContract {
  buildDistributionRequest(_input: NfseDistributionInput): NfseWireRequest { return unavailable(); }
  buildDocumentRequest(_input: NfseKeyQueryInput): NfseWireRequest { return unavailable(); }
  buildEventsRequest(_input: NfseKeyQueryInput): NfseWireRequest { return unavailable(); }
  decodeDistribution(_body: string, _headers: Readonly<Record<string, string>>): NfseDistributionBatch { return unavailable(); }
  decodeDocument(_body: string, _headers: Readonly<Record<string, string>>): NfseDistributedPayload { return unavailable(); }
  decodeEvents(_body: string, _headers: Readonly<Record<string, string>>): NfseDistributedPayload[] { return unavailable(); }
}

function unavailable(): never {
  throw new NfseContractError(MESSAGE);
}
