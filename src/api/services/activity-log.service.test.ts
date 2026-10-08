import { describe, it, expect, beforeEach } from 'vitest';
import { db, initDatabase } from '../../db';
import { activityLogs } from '../../db/schema';
import { ActivityLogService } from './activity-log.service';

describe('ActivityLogService', () => {
  let service: ActivityLogService;

  beforeEach(async () => {
    await initDatabase();
    // Limpa a tabela antes de cada teste
    await db.delete(activityLogs);
    service = new ActivityLogService();
  });

  it('registra um novo log com id e timestamp gerados', async () => {
    const entry = await service.record({
      level: 'SUCCESS',
      module: 'BUSCADOR',
      action: 'SEFAZ_SYNC_NFE',
      message: 'Sincronização NF-e finalizada com sucesso.',
      details: { count: 12, companyId: 1 },
      durationMs: 450,
    });

    expect(entry.id).toBeDefined();
    expect(entry.level).toBe('SUCCESS');
    expect(entry.module).toBe('BUSCADOR');
    expect(entry.action).toBe('SEFAZ_SYNC_NFE');

    const result = await service.list();
    expect(result.total).toBe(1);
    expect(result.logs[0].message).toBe('Sincronização NF-e finalizada com sucesso.');
  });

  it('filtra logs por level, module e termo de busca', async () => {
    await service.record({
      level: 'SUCCESS',
      module: 'BUSCADOR',
      action: 'SEFAZ_SYNC_NFE',
      message: 'Consulta de notas fiscais concluída',
      details: { cnpj: '12345678000199' },
    });

    await service.record({
      level: 'ERROR',
      module: 'CERTIFICATES',
      action: 'CERT_VALIDATION_ERROR',
      message: 'Certificado digital não ativado',
      details: { thumbprint: 'ABC123DEF' },
    });

    await service.record({
      level: 'WARN',
      module: 'COMPANIES',
      action: 'COMPANY_DELETE',
      message: 'Empresa removida do cadastro',
    });

    // Filtro por level
    const errors = await service.list({ level: 'ERROR' });
    expect(errors.total).toBe(1);
    expect(errors.logs[0].action).toBe('CERT_VALIDATION_ERROR');

    // Filtro por módulo
    const certs = await service.list({ module: 'CERTIFICATES' });
    expect(certs.total).toBe(1);
    expect(certs.logs[0].level).toBe('ERROR');

    // Filtro por busca textual
    const searchResult = await service.list({ search: '12345678000199' });
    expect(searchResult.total).toBe(1);
    expect(searchResult.logs[0].action).toBe('SEFAZ_SYNC_NFE');
  });

  it('calcula estatísticas consolidadas de auditoria', async () => {
    await service.record({ level: 'SUCCESS', module: 'BACKUP', action: 'BACKUP_CREATE', message: 'Backup gerado' });
    await service.record({ level: 'SUCCESS', module: 'NFVIEW', action: 'XML_IMPORT', message: 'XMLs importados' });
    await service.record({ level: 'ERROR', module: 'BUSCADOR', action: 'SYNC_ERROR', message: 'Erro de conexão' });
    await service.record({ level: 'WARN', module: 'COMPANIES', action: 'COMPANY_UPDATE', message: 'Dados alterados' });
    await service.record({ level: 'INFO', module: 'SYSTEM', action: 'APP_START', message: 'App inicializado' });

    const stats = await service.getStats();
    expect(stats.total).toBe(5);
    expect(stats.successCount).toBe(2);
    expect(stats.errorCount).toBe(1);
    expect(stats.warnCount).toBe(1);
    expect(stats.infoCount).toBe(1);
  });

  it('limpa registros com base em dias de retenção', async () => {
    // Insere um log recente
    await service.record({ level: 'INFO', module: 'SYSTEM', action: 'TEST_RECENT', message: 'Log recente' });

    // Insere um log simulado antigo (mais de 60 dias atrás)
    const oldTimestamp = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000);
    await service.record({
      timestamp: oldTimestamp,
      level: 'INFO',
      module: 'SYSTEM',
      action: 'TEST_OLD',
      message: 'Log antigo para purgar',
    });

    const beforeClear = await service.list();
    expect(beforeClear.total).toBe(2);

    const clearResult = await service.clearOld(60);
    expect(clearResult.deletedCount).toBe(1);

    const afterClear = await service.list();
    expect(afterClear.total).toBe(1);
    expect(afterClear.logs[0].action).toBe('TEST_RECENT');
  });

  it('exporta registros para formato CSV e JSON', async () => {
    await service.record({
      level: 'SUCCESS',
      module: 'BUSCADOR',
      action: 'SYNC_TEST',
      message: 'Mensagem com vírgula, e "aspas"',
      details: { key: 'val' },
    });

    const csv = await service.exportCsv();
    expect(csv).toContain('Data/Hora,Nível,Módulo,Ação,Mensagem,Duração (ms),Detalhes');
    expect(csv).toContain('SYNC_TEST');
    expect(csv).toContain('"Mensagem com vírgula, e ""aspas"""');

    const json = await service.exportJson();
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].action).toBe('SYNC_TEST');
  });
});

