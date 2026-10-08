import { BrowserWindow } from 'electron';
import { ApplicationContext } from '../services';
import { CreateCompanyDTO, UpdateCompanyDTO } from '../../../src/core/buscador/domain/types';
import { isApprovedFolder, registerSecureHandler, requirePositiveInteger } from './security';
import { activityLogService } from '../../../src/api/services/activity-log.service';

export function registerCompanyHandlers(services: ApplicationContext, getMainWindow: () => BrowserWindow | null): void {
  registerSecureHandler('companies:list', getMainWindow, () => services.companyService.list());
  registerSecureHandler('companies:getActive', getMainWindow, () => services.companyService.getActive());

  registerSecureHandler('companies:create', getMainWindow, async (_event, value) => {
    if (!value || typeof value !== 'object') throw new Error('Dados da empresa inválidos.');
    const dto = value as Partial<CreateCompanyDTO>;
    if (dto.folder_path && !isApprovedFolder(dto.folder_path)) throw new Error('Selecione a pasta da empresa pelo botão “Escolher”.');
    const created = services.companyService.create({
      name: typeof dto.name === 'string' ? dto.name : '',
      cnpj: typeof dto.cnpj === 'string' ? dto.cnpj : '',
      uf: typeof dto.uf === 'string' ? dto.uf : undefined,
      folder_path: typeof dto.folder_path === 'string' ? dto.folder_path : undefined,
    });
    await activityLogService.record({
      level: 'SUCCESS',
      module: 'COMPANIES',
      action: 'COMPANY_CREATE',
      message: `Empresa cadastrada com sucesso: ${created.name} (${created.cnpj})`,
      details: created,
    });
    return created;
  });

  registerSecureHandler('companies:update', getMainWindow, async (_event, value) => {
    if (!value || typeof value !== 'object') throw new Error('Dados da empresa inválidos.');
    const dto = value as Partial<UpdateCompanyDTO>;
    const companyId = requirePositiveInteger(dto.id, 'ID da empresa');
    const existing = services.companyService.getById(companyId);
    if (!existing) throw new Error('Empresa não encontrada.');
    if (dto.folder_path && !isApprovedFolder(dto.folder_path, existing.folder_path)) {
      throw new Error('Selecione a pasta da empresa pelo botão “Escolher”.');
    }
    const updated = services.companyService.update({
      id: companyId,
      name: typeof dto.name === 'string' ? dto.name : undefined,
      cnpj: typeof dto.cnpj === 'string' ? dto.cnpj : undefined,
      uf: typeof dto.uf === 'string' ? dto.uf : undefined,
      folder_path: typeof dto.folder_path === 'string' ? dto.folder_path : undefined,
    });
    await activityLogService.record({
      level: 'INFO',
      module: 'COMPANIES',
      action: 'COMPANY_UPDATE',
      message: `Dados da empresa atualizados: ${updated.name}`,
      details: updated,
    });
    return updated;
  });

  registerSecureHandler('companies:delete', getMainWindow, async (_event, id) => {
    const companyId = requirePositiveInteger(id, 'ID da empresa');
    const existing = services.companyService.getById(companyId);
    const result = services.companyService.delete(companyId);
    await activityLogService.record({
      level: 'WARN',
      module: 'COMPANIES',
      action: 'COMPANY_DELETE',
      message: `Empresa excluída do cadastro: ${existing?.name || `ID #${companyId}`}`,
      details: existing || undefined,
    });
    return result;
  });

  registerSecureHandler('companies:selectActive', getMainWindow, (_event, id) => {
    const companyId = requirePositiveInteger(id, 'ID da empresa');
    const selected = services.companyService.selectActive(companyId);
    if (!selected) throw new Error('Empresa não encontrada.');
    return selected;
  });
}
