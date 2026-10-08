import { BrowserWindow } from 'electron';
import { ApplicationContext } from '../services';
import { registerSecureHandler } from './security';
import { activityLogService, type ActivityLogInput } from '../../../src/api/services/activity-log.service';

export function registerActivityLogHandlers(
  _services: ApplicationContext,
  getMainWindow: () => BrowserWindow | null
): void {
  registerSecureHandler('logs:list', getMainWindow, (_event, filter) => {
    return activityLogService.list(filter || {});
  });

  registerSecureHandler('logs:getStats', getMainWindow, () => {
    return activityLogService.getStats();
  });

  registerSecureHandler('logs:clearOld', getMainWindow, (_event, days) => {
    const retentionDays = typeof days === 'number' && days > 0 ? days : 60;
    return activityLogService.clearOld(retentionDays);
  });

  registerSecureHandler('logs:exportCsv', getMainWindow, (_event, filter) => {
    return activityLogService.exportCsv(filter || {});
  });

  registerSecureHandler('logs:exportJson', getMainWindow, (_event, filter) => {
    return activityLogService.exportJson(filter || {});
  });

  registerSecureHandler('logs:record', getMainWindow, (_event, input) => {
    if (!input || typeof input !== 'object') throw new Error('Entrada de log inválida.');
    return activityLogService.record(input as ActivityLogInput);
  });
}

