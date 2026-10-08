import { BrowserWindow } from 'electron';
import { ApplicationContext } from '../services';
import { registerSecureHandler, requirePositiveInteger, requireString } from './security';
import { activityLogService } from '../../../src/api/services/activity-log.service';

export function registerCertificateHandlers(services: ApplicationContext, getMainWindow: () => BrowserWindow | null): void {
  registerSecureHandler('certificates:listAvailable', getMainWindow, () => services.certProvider.listCertificates());
  registerSecureHandler('certificates:getForCompany', getMainWindow, (_event, id) =>
    services.certRepo.getByCompanyId(requirePositiveInteger(id, 'ID da empresa')));
  registerSecureHandler('certificates:associateToCompany', getMainWindow, async (_event, id, value) => {
    const companyId = requirePositiveInteger(id, 'ID da empresa');
    const company = services.companyService.getById(companyId);
    if (!company) throw new Error('Empresa não encontrada.');
    const thumbprint = requireString(value, 'Thumbprint', 128).replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (!/^[A-F0-9]{40,64}$/.test(thumbprint)) throw new Error('Thumbprint inválido.');
    const cert = await services.certProvider.getCertificate(thumbprint);
    if (!cert) throw new Error('Certificado não localizado no repositório do Windows.');
    if (!cert.has_private_key) throw new Error('O certificado não possui chave privada acessível.');
    if (cert.is_expired || new Date(cert.valid_to).getTime() <= Date.now()) throw new Error('O certificado está expirado.');
    if (cert.extracted_cnpj && cert.extracted_cnpj.slice(0, 8) !== company.cnpj.slice(0, 8)) {
      throw new Error('O CNPJ-base do certificado não corresponde ao CNPJ da empresa.');
    }
    services.certRepo.associate(companyId, cert);

    await activityLogService.record({
      level: 'SUCCESS',
      module: 'CERTIFICATES',
      action: 'CERT_ASSOCIATE',
      message: `Certificado ${cert.subject || cert.thumbprint.slice(0, 8)} associado a ${company.name}.`,
      details: { companyId, companyName: company.name, thumbprint: cert.thumbprint, validTo: cert.valid_to },
    });

    return true;
  });
}
