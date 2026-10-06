import type { NfseDistributionBatch, NfseDistributedPayload } from '../domain/types';
import type { NfseDistributionInput, NfseKeyQueryInput } from './NfseWireContract';

export interface NfseGateway {
  distribute(input: NfseDistributionInput): Promise<NfseDistributionBatch>;
  consultByKey(input: NfseKeyQueryInput): Promise<NfseDistributedPayload>;
  consultEvents(input: NfseKeyQueryInput): Promise<NfseDistributedPayload[]>;
}
