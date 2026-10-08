import { BrowserWindow } from 'electron';
import { DocumentType } from '../../../src/core/buscador/domain/types';
import { ApplicationContext } from '../services';
import { registerSecureHandler, requirePositiveInteger } from './security';
import { activityLogService } from '../../../src/api/services/activity-log.service';

function parseDocumentType(value: unknown): DocumentType {
  if (value !== 'NFE' && value !== 'CTE') throw new Error('Tipo de documento inválido.');
  return value;
}

export function registerSefazHandlers(services: ApplicationContext, getMainWindow: () => BrowserWindow | null): void {
  registerSecureHandler('sefaz:consultDocuments', getMainWindow, async (_event, rawId, rawType) => {
    const companyId = requirePositiveInteger(rawId, 'ID da empresa');
    const docType = rawType ? parseDocumentType(rawType) : undefined;
    const startTime = Date.now();
    const company = services.companyService.getById(companyId);
    const companyName = company?.name || `Empresa #${companyId}`;

    try {
      const result = await services.distributionEngine.syncCompanyDocuments(
        companyId,
        (progress) => {
          const win = getMainWindow();
          if (win && !win.isDestroyed()) win.webContents.send('sefaz:progress', { companyId, ...progress });
        },
        { documentType: docType }
      );

      const actionName = docType === 'CTE' ? 'SEFAZ_SYNC_CTE' : docType === 'NFE' ? 'SEFAZ_SYNC_NFE' : 'SEFAZ_SYNC_ALL';
      const isSuccess = result.success;

      await activityLogService.record({
        level: isSuccess ? 'SUCCESS' : 'ERROR',
        module: 'BUSCADOR',
        action: actionName,
        message: isSuccess
          ? `Sincronização SEFAZ ${docType || 'NF-e/CT-e'} concluída para ${companyName}. ${result.documentsCount} novos documentos.`
          : `Sincronização SEFAZ ${docType || 'NF-e/CT-e'} finalizada para ${companyName}.`,
        details: {
          companyId,
          companyName,
          docType,
          documentsCount: result.documentsCount,
          nfe: { success: result.nfe.success, cStat: result.nfe.cStat, xMotivo: result.nfe.xMotivo },
          cte: { success: result.cte.success, cStat: result.cte.cStat, xMotivo: result.cte.xMotivo },
        },
        durationMs: Date.now() - startTime,
      });

      return result;
    } catch (err: any) {
      await activityLogService.record({
        level: 'ERROR',
        module: 'BUSCADOR',
        action: docType === 'CTE' ? 'SEFAZ_SYNC_CTE_ERROR' : 'SEFAZ_SYNC_NFE_ERROR',
        message: `Falha na consulta SEFAZ para ${companyName}: ${err.message}`,
        details: { companyId, companyName, error: err.message },
        durationMs: Date.now() - startTime,
      });
      throw err;
    }
  });

  registerSecureHandler('sefaz:getStatus', getMainWindow, (_event, id) => {
    const companyId = requirePositiveInteger(id, 'ID da empresa');
    if (!services.companyService.getById(companyId)) throw new Error('Empresa não encontrada.');
    const environment = services.settingsRepo.getSettings().sefaz_environment;
    const nfe = services.distStateRepo.getOrCreate(companyId, 'NFE', environment);
    const cte = services.distStateRepo.getOrCreate(companyId, 'CTE', environment);
    return {
      nfeLastNSU: nfe.last_nsu,
      cteLastNSU: cte.last_nsu,
      isRunning: nfe.status === 'RUNNING' || cte.status === 'RUNNING',
      environment,
    };
  });

  registerSecureHandler('sefaz:cancelQuery', getMainWindow, (_event, id, rawType) => {
    const companyId = requirePositiveInteger(id, 'ID da empresa');
    const docType = rawType === undefined ? undefined : parseDocumentType(rawType);
    services.distributionEngine.cancel(companyId, docType);
    return true;
  });

  registerSecureHandler('sefaz:resetNSU', getMainWindow, async (_event, id, rawType) => {
    const companyId = requirePositiveInteger(id, 'ID da empresa');
    const docType = parseDocumentType(rawType);
    const company = services.companyService.getById(companyId);
    const companyName = company?.name || `Empresa #${companyId}`;

    services.distributionEngine.resetNSU(companyId, docType);

    await activityLogService.record({
      level: 'WARN',
      module: 'BUSCADOR',
      action: `RESET_NSU_${docType}`,
      message: `NSU de ${docType} resetado para 000000000000000 na empresa ${companyName}.`,
      details: { companyId, companyName, docType },
    });

    return true;
  });
}
