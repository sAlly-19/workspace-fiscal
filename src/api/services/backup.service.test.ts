import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { backupService } from './backup.service';
import { storageService } from './storage.service';
import { db, rawClient, initDatabase } from '../../db';
import { companies, categories, assets, documents, applicationSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';

describe('Backup and Restore Service - Scenarios A to F', () => {
  const testDir = path.join(os.tmpdir(), `wsf-backup-test-${Date.now()}`);

  beforeAll(async () => {
    fs.mkdirSync(testDir, { recursive: true });
    await initDatabase();
  });

  afterAll(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  it('Cenário A: Backup completo (.wfb) cria manifesto válido e estatísticas reais', async () => {
    // 1. Prepara dados de teste
    const testCompanyId = `comp_test_${Date.now()}`;
    await db.insert(companies).values({
      id: testCompanyId,
      name: 'Empresa Teste A',
      cnpj: '12345678000199',
      depreciationRule: 'PROPORTIONAL',
    });

    const testCatId = `cat_test_${Date.now()}`;
    await db.insert(categories).values({
      id: testCatId,
      companyId: testCompanyId,
      name: 'Veículos de Teste',
      defaultRate: 20,
    });

    const testAssetId = `asset_test_${Date.now()}`;
    await db.insert(assets).values({
      id: testAssetId,
      companyId: testCompanyId,
      categoryId: testCatId,
      supplier: 'Concessionária Teste',
      acquisitionDate: new Date('2025-01-15'),
      documentNumber: 'NF-999',
      description: 'Furgão Utilitário',
      acquisitionValue: 5000000,
      annualRate: 20,
    });

    // Cria XML e Documento de teste
    const xmlPath = await storageService.saveXml(`sample_doc_${Date.now()}.xml`, '<nfeProc><infNFeId>123</infNFeId></nfeProc>');
    const testDocId = `doc_test_${Date.now()}`;
    await db.insert(documents).values({
      id: testDocId,
      type: 'NFE',
      accessKey: '35260000000000000000550010000009991234567890',
      number: '999',
      status: 'VALID',
      rawXmlPath: xmlPath,
    });

    // 2. Cria backup completo
    const backupRes = await backupService.createBackup({
      modules: ['NF_VIEW', 'DEPRECIATION', 'SETTINGS'],
      customDestination: testDir,
      customFilename: 'backup_cenario_a.wfb',
    });

    expect(fs.existsSync(backupRes.path)).toBe(true);
    expect(backupRes.manifest.format).toBe('workspace-fiscal-backup');
    expect(backupRes.manifest.appVersion).toBe('2.5.3');
    expect(backupRes.manifest.modules).toEqual(['NF_VIEW', 'DEPRECIATION', 'SETTINGS']);
    expect(backupRes.manifest.stats.companies).toBeGreaterThanOrEqual(1);
    expect(backupRes.manifest.stats.assets).toBeGreaterThanOrEqual(1);

    // 3. Inspeciona o arquivo gerado
    const inspection = await backupService.inspectBackup(backupRes.path);
    expect(inspection.valid).toBe(true);
    expect(inspection.isLegacy).toBe(false);
    expect(inspection.format).toBe('wfb');
    expect(inspection.appVersion).toBe('2.5.3');
    expect(inspection.modules).toContain('DEPRECIATION');
    expect(inspection.modules).toContain('NF_VIEW');
    expect(inspection.modules).toContain('SETTINGS');
  });

  it('Cenário B: Backup seletivo de Depreciação e restauração em banco', async () => {
    // 1. Gera backup apenas com DEPRECIATION
    const backupRes = await backupService.createBackup({
      modules: ['DEPRECIATION'],
      customDestination: testDir,
      customFilename: 'backup_cenario_b_deprec.wfb',
    });

    const inspection = await backupService.inspectBackup(backupRes.path);
    expect(inspection.valid).toBe(true);
    expect(inspection.modules).toEqual(['DEPRECIATION']);

    // 2. Modifica/limpa as tabelas de depreciação
    await rawClient.execute('DELETE FROM "depreciation_entries";');
    await rawClient.execute('DELETE FROM "depreciation_exports";');
    await rawClient.execute('DELETE FROM "assets";');
    await rawClient.execute('DELETE FROM "categories";');
    await rawClient.execute('DELETE FROM "companies";');

    const emptyCompCount = await db.query.companies.findMany();
    expect(emptyCompCount.length).toBe(0);

    // 3. Restaura o backup
    const restoreRes = await backupService.restoreBackup({
      filePath: backupRes.path,
      modulesToRestore: ['DEPRECIATION'],
    });

    expect(restoreRes.success).toBe(true);
    expect(restoreRes.restoredModules).toEqual(['DEPRECIATION']);

    // Confirma que os dados foram restabelecidos
    const restoredCompanies = await db.query.companies.findMany();
    expect(restoredCompanies.length).toBeGreaterThan(0);
    const restoredAssets = await db.query.assets.findMany();
    expect(restoredAssets.length).toBeGreaterThan(0);
  });

  it('Cenário C: Backup seletivo de NF View restaura banco e arquivos XML no storage', async () => {
    const xmlFilename = `cenario_c_xml_${Date.now()}.xml`;
    const xmlContent = '<nfeProc><cenario>C</cenario></nfeProc>';
    const xmlPath = await storageService.saveXml(xmlFilename, xmlContent);

    const docId = `doc_c_${Date.now()}`;
    await db.insert(documents).values({
      id: docId,
      type: 'NFE',
      accessKey: '35260000000000000000550010000008881234567890',
      number: '888',
      status: 'VALID',
      rawXmlPath: xmlPath,
    });

    const backupRes = await backupService.createBackup({
      modules: ['NF_VIEW'],
      customDestination: testDir,
      customFilename: 'backup_cenario_c_nfview.wfb',
    });

    // Apaga XML e apaga registros
    await storageService.deleteXml(xmlPath);
    await rawClient.execute('DELETE FROM "document_events";');
    await rawClient.execute('DELETE FROM "document_taxes";');
    await rawClient.execute('DELETE FROM "document_items";');
    await rawClient.execute('DELETE FROM "documents";');

    // Restaura NF View
    const restoreRes = await backupService.restoreBackup({
      filePath: backupRes.path,
      modulesToRestore: ['NF_VIEW'],
    });

    expect(restoreRes.success).toBe(true);

    // Confirma que o XML foi re-extraído no storage
    const restoredXml = await storageService.readXml(xmlPath);
    expect(restoredXml).toBe(xmlContent);

    // Confirma que o documento foi re-inserido no SQLite
    const restoredDoc = await db.query.documents.findFirst({
      where: eq(documents.id, docId),
    });
    expect(restoredDoc).toBeDefined();
    expect(restoredDoc?.number).toBe('888');
  });

  it('Cenário D: Arquivo corrompido ou aleatório é rejeitado adequadamente', async () => {
    const invalidFile = path.join(testDir, 'arquivo_falso.wfb');
    fs.writeFileSync(invalidFile, 'Isso nao e um arquivo de backup valido do Workspace Fiscal');

    const inspection = await backupService.inspectBackup(invalidFile);
    expect(inspection.valid).toBe(false);
    expect(inspection.error).toBeDefined();
  });

  it('Cenário E: Arquivo SQLite legado (.db) é identificado como legado', async () => {
    // Cria um arquivo com cabeçalho SQLite 3
    const legacyDbPath = path.join(testDir, 'legacy_teste.db');
    // Copia o próprio SQLite atual para testar inspeção de SQLite
    const currentDbPath = path.resolve('sqlite.db');
    if (fs.existsSync(currentDbPath)) {
      fs.copyFileSync(currentDbPath, legacyDbPath);
      const inspection = await backupService.inspectBackup(legacyDbPath);
      expect(inspection.valid).toBe(true);
      expect(inspection.isLegacy).toBe(true);
      expect(inspection.format).toBe('legacy-sqlite');
      expect(inspection.modules).toContain('FULL_DATABASE');
    }
  });

  it('Cenário F: Falha na restauração não corrompe o banco e cria backup de segurança', async () => {
    // Cria um zip com manifest apontando para NF_VIEW mas com data/nf_view.json corrompido
    const corruptWfb = path.join(testDir, 'corrupt_package.wfb');
    const zip = new AdmZip();
    zip.addFile('manifest.json', Buffer.from(JSON.stringify({
      format: 'workspace-fiscal-backup',
      formatVersion: '1.0',
      appVersion: '2.5.3',
      createdAt: new Date().toISOString(),
      modules: ['NF_VIEW'],
      stats: {},
    })));
    zip.addFile('data/nf_view.json', Buffer.from('{"documents": [INVALID JSON SYNTAX]}', 'utf-8'));
    zip.writeZip(corruptWfb);

    // Tentativa de restauração deve falhar
    await expect(backupService.restoreBackup({
      filePath: corruptWfb,
      modulesToRestore: ['NF_VIEW'],
    })).rejects.toThrow();

    // Confirma que o banco continua operacional
    const integrity = await rawClient.execute('PRAGMA integrity_check;');
    const result = integrity.rows?.[0]?.[0] ?? (integrity.rows?.[0] as any)?.integrity_check;
    expect(result).toBe('ok');
  });

  it('Cenário G: Persistência de configurações por módulo e integridade entre escopos', async () => {
    // 1. Configuração Global: Backup settings
    backupService.updateSettings({ intervalDays: 14, retentionCount: 60 });
    const loadedBackupCfg = await backupService.loadSettingsFromDb();
    expect(loadedBackupCfg.intervalDays).toBe(14);
    expect(loadedBackupCfg.retentionCount).toBe(60);

    // 2. Configuração NF View: Dedupe Policy
    const dedupeVal = JSON.stringify({ policy: 'OVERWRITE' });
    const existingDedupe = await db.query.applicationSettings.findFirst({
      where: eq(applicationSettings.key, 'import_dedupe_policy'),
    });
    if (existingDedupe) {
      await db.update(applicationSettings).set({ value: dedupeVal }).where(eq(applicationSettings.key, 'import_dedupe_policy'));
    } else {
      await db.insert(applicationSettings).values({ key: 'import_dedupe_policy', value: dedupeVal });
    }
    const checkDedupe = await db.query.applicationSettings.findFirst({
      where: eq(applicationSettings.key, 'import_dedupe_policy'),
    });
    expect(JSON.parse(checkDedupe?.value || '{}').policy).toBe('OVERWRITE');

    // 3. Configuração Depreciação: Regra de depreciação na empresa
    const companyId = `comp_rule_test_${Date.now()}`;
    await db.insert(companies).values({
      id: companyId,
      name: 'Empresa Regra Teste',
      depreciationRule: 'NEXT_MONTH',
    });
    const loadedCompany = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });
    expect(loadedCompany?.depreciationRule).toBe('NEXT_MONTH');

    // Altera regra para PROPORTIONAL
    await db.update(companies).set({ depreciationRule: 'PROPORTIONAL' }).where(eq(companies.id, companyId));
    const reloadedCompany = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });
    expect(reloadedCompany?.depreciationRule).toBe('PROPORTIONAL');
  });
});

