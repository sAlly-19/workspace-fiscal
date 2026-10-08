import { BrowserWindow } from 'electron';
import type { NfseEnvironment } from '../../../src/core/buscador/nfse/domain/types';
import { normalizeNfseAccessKey } from '../../../src/core/buscador/nfse/domain/access-key';
import type { ApplicationContext } from '../services';
import { registerSecureHandler, requirePositiveInteger } from './security';

function parseNfseEnvironment(value: unknown, defaultEnv: NfseEnvironment = 'homologation'): NfseEnvironment {
  if (value === undefined || value === null) {
    return defaultEnv;
  }
  if (value !== 'homologation' && value !== 'production') {
    throw new Error('Ambiente inválido. Deve ser homologation ou production.');
  }
  return value;
}

import { activityLogService } from '../../../src/api/services/activity-log.service';

export function registerNfseHandlers(
  services: ApplicationContext,
  getMainWindow: () => BrowserWindow | null
): void {
  registerSecureHandler('nfse:sync', getMainWindow, async (_event, rawCompanyId, rawEnv) => {
    const companyId = requirePositiveInteger(rawCompanyId, 'ID da empresa');
    const company = services.companyService.getById(companyId);
    if (!company) throw new Error('Empresa não encontrada.');
    if (!company.is_active) throw new Error('Empresa está inativa.');

    const defaultEnv = (services.settingsRepo.getSettings().nfse_environment as NfseEnvironment) || 'homologation';
    const environment = parseNfseEnvironment(rawEnv, defaultEnv);
    const startTime = Date.now();

    try {
      const result = await services.nfseSynchronizer.sync({
        companyId,
        environment,
        onProgress: (progress) => {
          const win = getMainWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.send('nfse:progress', { companyId, ...progress });
          }
        },
      });

      await activityLogService.record({
        level: result.success ? 'SUCCESS' : 'ERROR',
        module: 'BUSCADOR',
        action: 'NFSE_SYNC',
        message: result.success
          ? `Sincronização NFS-e ADN concluída para ${company.name}. ${result.documentsCount} documentos recebidos.`
          : `Sincronização NFS-e ADN finalizada para ${company.name}: ${result.error || 'Falha na sincronizacao'}`,
        details: { companyId, companyName: company.name, environment, result },
        durationMs: Date.now() - startTime,
      });

      return result;
    } catch (err: any) {
      await activityLogService.record({
        level: 'ERROR',
        module: 'BUSCADOR',
        action: 'NFSE_SYNC_ERROR',
        message: `Falha na sincronização NFS-e ADN para ${company.name}: ${err.message}`,
        details: { companyId, companyName: company.name, error: err.message },
        durationMs: Date.now() - startTime,
      });
      throw err;
    }
  });

  registerSecureHandler('nfse:getStatus', getMainWindow, (_event, rawCompanyId, rawEnv) => {
    const companyId = requirePositiveInteger(rawCompanyId, 'ID da empresa');
    const company = services.companyService.getById(companyId);
    if (!company) throw new Error('Empresa não encontrada.');

    const defaultEnv = (services.settingsRepo.getSettings().nfse_environment as NfseEnvironment) || 'homologation';
    const environment = parseNfseEnvironment(rawEnv, defaultEnv);

    return services.nfseSynchronizer.getStatus(companyId, environment);
  });

  registerSecureHandler('nfse:cancelSync', getMainWindow, (_event, rawCompanyId, rawEnv) => {
    const companyId = requirePositiveInteger(rawCompanyId, 'ID da empresa');
    const defaultEnv = (services.settingsRepo.getSettings().nfse_environment as NfseEnvironment) || 'homologation';
    const environment = parseNfseEnvironment(rawEnv, defaultEnv);

    services.nfseSynchronizer.cancel(companyId, environment);
    return true;
  });

  registerSecureHandler('nfse:resetNSU', getMainWindow, (_event, rawCompanyId, rawEnv) => {
    const companyId = requirePositiveInteger(rawCompanyId, 'ID da empresa');
    const defaultEnv = (services.settingsRepo.getSettings().nfse_environment as NfseEnvironment) || 'homologation';
    const environment = parseNfseEnvironment(rawEnv, defaultEnv);

    services.nfseSynchronizer.resetNsu(companyId, environment);
    return true;
  });

  registerSecureHandler('nfse:consultByKey', getMainWindow, async (_event, rawCompanyId, rawAccessKey, rawEnv) => {
    const companyId = requirePositiveInteger(rawCompanyId, 'ID da empresa');
    const company = services.companyService.getById(companyId);
    if (!company) throw new Error('Empresa não encontrada.');

    const accessKey = normalizeNfseAccessKey(String(rawAccessKey ?? ''));
    const defaultEnv = (services.settingsRepo.getSettings().nfse_environment as NfseEnvironment) || 'homologation';
    const environment = parseNfseEnvironment(rawEnv, defaultEnv);

    return services.nfseDirectQuery.queryByKey({
      companyId,
      accessKey,
      environment,
    });
  });

  registerSecureHandler('nfse:getEvents', getMainWindow, (_event, rawCompanyId, rawAccessKey, rawEnv) => {
    const companyId = requirePositiveInteger(rawCompanyId, 'ID da empresa');
    const company = services.companyService.getById(companyId);
    if (!company) throw new Error('Empresa não encontrada.');

    const accessKey = normalizeNfseAccessKey(String(rawAccessKey ?? ''));
    const environment = rawEnv === undefined ? undefined : parseNfseEnvironment(rawEnv);

    return services.nfseEventRepo.findByAccessKey(companyId, accessKey, environment);
  });
}

