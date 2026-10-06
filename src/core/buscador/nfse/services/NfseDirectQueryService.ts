import type { CompanyRepository } from '../../database/repositories/CompanyRepository';
import type { CertificateRepository } from '../../database/repositories/CertificateRepository';
import type { DocumentRepository } from '../../database/repositories/DocumentRepository';
import type { SettingsRepository } from '../../database/repositories/SettingsRepository';
import type { FiscalDocument } from '../../domain/types';
import type { NfseGateway } from '../clients/NfseGateway';
import type { NfseDistributedPayload, NfseEnvironment } from '../domain/types';
import { normalizeNfseAccessKey } from '../domain/access-key';
import { NfsePersistenceService } from './NfsePersistenceService';

export interface NfseDirectQueryOptions {
  companyId: number;
  accessKey: string;
  environment?: NfseEnvironment;
  consultEvents?: boolean;
  configuredBasePath?: string;
}

export interface NfseDirectQueryResult {
  success: boolean;
  document?: FiscalDocument;
  eventsCount: number;
  error?: string;
}

export class NfseDirectQueryService {
  constructor(
    private readonly companyRepo: CompanyRepository,
    private readonly certRepo: CertificateRepository,
    private readonly docRepo: DocumentRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly persistenceService: NfsePersistenceService,
    private readonly gateway: NfseGateway
  ) {}

  public async queryByKey(options: NfseDirectQueryOptions): Promise<NfseDirectQueryResult> {
    const cleanKey = normalizeNfseAccessKey(options.accessKey);

    const company = this.companyRepo.findById(options.companyId);
    if (!company) {
      throw new Error(`Empresa com ID ${options.companyId} não encontrada.`);
    }

    const cert = this.certRepo.getByCompanyId(options.companyId);
    if (!cert || cert.is_expired) {
      throw new Error('Certificado digital não encontrado ou expirado para a empresa.');
    }

    const environment: NfseEnvironment =
      options.environment ||
      (this.settingsRepo.getSettings().nfse_environment as NfseEnvironment) ||
      'homologation';

    try {
      const docPayload = await this.gateway.consultByKey({
        environment,
        thumbprint: cert.thumbprint,
        accessKey: cleanKey,
      });

      const payloads: NfseDistributedPayload[] = [docPayload];

      if (options.consultEvents !== false) {
        try {
          const events = await this.gateway.consultEvents({
            environment,
            thumbprint: cert.thumbprint,
            accessKey: cleanKey,
          });
          if (Array.isArray(events)) {
            payloads.push(...events);
          }
        } catch {
          // Consulta de eventos opcional não interrompe o salvamento do documento
        }
      }

      let persistResult;
      try {
        persistResult = this.persistenceService.persistBatch({
          company,
          environment,
          origin: 'NFSE_SEFIN_DIRECT',
          payloads,
          configuredBasePath: options.configuredBasePath,
        });
      } catch (persistErr) {
        if (payloads.length > 1) {
          persistResult = this.persistenceService.persistBatch({
            company,
            environment,
            origin: 'NFSE_SEFIN_DIRECT',
            payloads: [docPayload],
            configuredBasePath: options.configuredBasePath,
          });
        } else {
          throw persistErr;
        }
      }

      const savedDoc = this.docRepo.findByAccessKey(cleanKey, options.companyId, 'NFSE', environment);

      return {
        success: true,
        document: savedDoc || undefined,
        eventsCount: persistResult.events,
      };
    } catch (err: any) {
      return {
        success: false,
        eventsCount: 0,
        error: err?.message || 'Falha na consulta direta da NFS-e.',
      };
    }
  }
}
