import type { CompanyRepository } from '../../database/repositories/CompanyRepository';
import type { CertificateRepository } from '../../database/repositories/CertificateRepository';
import type { DistributionStateRepository } from '../../database/repositories/DistributionStateRepository';
import type { SettingsRepository } from '../../database/repositories/SettingsRepository';
import type { DistributionState } from '../../domain/types';
import type { NfseGateway } from '../clients/NfseGateway';
import type { NfseEnvironment } from '../domain/types';
import { compareNfseNsu } from '../domain/nsu';
import { NfsePersistenceService } from './NfsePersistenceService';

export interface NfseSyncOptions {
  companyId: number;
  environment?: NfseEnvironment;
  configuredBasePath?: string;
  onProgress?: (progress: NfseSyncProgress) => void;
}

export interface NfseSyncProgress {
  message: string;
  currentNsu: string;
  maxNsu: string;
  documentsCount: number;
  eventsCount: number;
}

export interface NfseSyncResult {
  success: boolean;
  documentsCount: number;
  eventsCount: number;
  lastNsu: string;
  maxNsu: string;
  error?: string;
}

export type NfseSyncStatus = DistributionState;

export class NfseSynchronizer {
  private readonly activeQueries = new Map<string, AbortController>();

  constructor(
    private readonly companyRepo: CompanyRepository,
    private readonly certRepo: CertificateRepository,
    private readonly distStateRepo: DistributionStateRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly persistenceService: NfsePersistenceService,
    private readonly gateway: NfseGateway
  ) {}

  public getStatus(companyId: number, environment: NfseEnvironment = 'homologation'): DistributionState {
    return this.distStateRepo.getOrCreate(companyId, 'NFSE', environment);
  }

  public resetNsu(companyId: number, environment: NfseEnvironment = 'homologation'): DistributionState {
    return this.distStateRepo.resetNSU(companyId, 'NFSE', environment);
  }

  public cancel(companyId: number, environment?: NfseEnvironment): void {
    const prefix = environment ? `${companyId}:${environment}` : `${companyId}:`;
    for (const [key, controller] of this.activeQueries) {
      if (key.startsWith(prefix) || key === `${companyId}:${environment}`) {
        controller.abort();
        this.activeQueries.delete(key);
      }
    }
  }

  public async sync(options: NfseSyncOptions): Promise<NfseSyncResult> {
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

    const stateKey = `${options.companyId}:${environment}`;
    if (this.activeQueries.has(stateKey)) {
      throw new Error('Já existe uma sincronização de NFS-e em andamento para esta empresa e ambiente.');
    }

    const controller = new AbortController();
    this.activeQueries.set(stateKey, controller);

    const state = this.distStateRepo.getOrCreate(options.companyId, 'NFSE', environment);
    let currentNsu = state.last_nsu || '0';
    let maxNsu = state.max_nsu || '0';
    let totalDocs = 0;
    let totalEvents = 0;

    this.distStateRepo.updateStatus(options.companyId, 'NFSE', 'RUNNING', undefined, environment);

    try {
      while (!controller.signal.aborted) {
        options.onProgress?.({
          message: `Consultando ADN a partir do NSU ${currentNsu}...`,
          currentNsu,
          maxNsu,
          documentsCount: totalDocs,
          eventsCount: totalEvents,
        });

        const batch = await this.gateway.distribute({
          cnpj: company.cnpj,
          thumbprint: cert.thumbprint,
          environment,
          lastNsu: currentNsu,
          signal: controller.signal,
        });

        if (batch.status === 'REJECTED') {
          const errMsg = batch.message || 'Lote de distribuição rejeitado pela SEFIN/ADN.';
          this.distStateRepo.updateStatus(options.companyId, 'NFSE', 'ERROR', errMsg, environment);
          return {
            success: false,
            documentsCount: totalDocs,
            eventsCount: totalEvents,
            lastNsu: currentNsu,
            maxNsu,
            error: errMsg,
          };
        }

        maxNsu = batch.maxNsu;
        const batchDocs = batch.documents || [];

        if (batchDocs.length > 0) {
          const persistResult = this.persistenceService.persistBatch({
            company,
            environment,
            origin: 'NFSE_ADN_DISTRIBUTION',
            payloads: batchDocs,
            cursor: { lastNsu: batch.lastNsu, maxNsu: batch.maxNsu },
            configuredBasePath: options.configuredBasePath,
          });

          totalDocs += persistResult.documents;
          totalEvents += persistResult.events;
          currentNsu = batch.lastNsu;
        } else {
          if (batch.lastNsu && compareNfseNsu(batch.lastNsu, currentNsu) > 0) {
            currentNsu = batch.lastNsu;
            this.distStateRepo.updateNSU(options.companyId, 'NFSE', currentNsu, maxNsu, 'RUNNING', undefined, environment);
          }
        }

        options.onProgress?.({
          message: `Processado até o NSU ${currentNsu} de ${maxNsu}`,
          currentNsu,
          maxNsu,
          documentsCount: totalDocs,
          eventsCount: totalEvents,
        });

        const hasMore =
          batch.status === 'DOCUMENTS_FOUND' &&
          compareNfseNsu(currentNsu, maxNsu) < 0 &&
          batchDocs.length > 0;

        if (!hasMore) {
          break;
        }
      }

      this.distStateRepo.updateStatus(options.companyId, 'NFSE', 'IDLE', undefined, environment);

      return {
        success: true,
        documentsCount: totalDocs,
        eventsCount: totalEvents,
        lastNsu: currentNsu,
        maxNsu,
      };
    } catch (err: any) {
      if (controller.signal.aborted) {
        this.distStateRepo.updateStatus(options.companyId, 'NFSE', 'IDLE', 'Sincronização cancelada', environment);
        return {
          success: true,
          documentsCount: totalDocs,
          eventsCount: totalEvents,
          lastNsu: currentNsu,
          maxNsu,
        };
      }

      const errMsg = err?.message || 'Erro durante a sincronização de NFS-e';
      this.distStateRepo.updateStatus(options.companyId, 'NFSE', 'ERROR', errMsg, environment);
      return {
        success: false,
        documentsCount: totalDocs,
        eventsCount: totalEvents,
        lastNsu: currentNsu,
        maxNsu,
        error: errMsg,
      };
    } finally {
      this.activeQueries.delete(stateKey);
    }
  }
}
