import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import AdmZip from 'adm-zip';
import {
  getDefaultDestination,
  DEFAULT_SETTINGS,
  inspectBackup,
  getDatabaseStats,
  createBackup,
  restoreBackup,
} from './index';
import { initDatabase, rawClient } from '../../../db';

describe('Backup Submodules Isolated Tests (IMP-T05)', () => {
  const testDir = path.join(os.tmpdir(), `wsf-backup-modules-test-${Date.now()}`);

  beforeAll(async () => {
    fs.mkdirSync(testDir, { recursive: true });
    await initDatabase();
  });

  afterAll(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  const uniqueThumbprint = `THUMB_SUBMOD_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  describe('backup.types & destination', () => {
    it('returns default destination path and valid default settings', () => {
      const dest = getDefaultDestination();
      expect(dest).toBeDefined();
      expect(typeof dest).toBe('string');
      expect(dest.length).toBeGreaterThan(0);

      expect(DEFAULT_SETTINGS.enabled).toBe(true);
      expect(DEFAULT_SETTINGS.intervalDays).toBe(7);
      expect(DEFAULT_SETTINGS.retentionCount).toBe(30);
      expect(DEFAULT_SETTINGS.destination).toBeDefined();
    });
  });

  describe('backup-inspector', () => {
    it('returns invalid for non-existent file path', async () => {
      const res = await inspectBackup('C:/non-existent-path/file.wfb');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('não encontrado');
    });

    it('returns invalid for a directory path', async () => {
      const res = await inspectBackup(process.cwd());
      expect(res.valid).toBe(false);
      expect(res.error).toContain('diretório');
    });
  });

  describe('backup-stats with BUSCADOR', () => {
    it('returns valid DatabaseStats structure with BUSCADOR metrics', async () => {
      const stats = await getDatabaseStats();
      expect(stats).toBeDefined();
      expect(stats.nfView).toBeDefined();
      expect(typeof stats.nfView.documents).toBe('number');
      expect(typeof stats.nfView.storageXmlFiles).toBe('number');
      expect(stats.depreciation).toBeDefined();
      expect(typeof stats.depreciation.companies).toBe('number');
      expect(stats.settings).toBeDefined();
      expect(typeof stats.settings.count).toBe('number');

      // BUSCADOR metrics assertion
      expect(stats.buscador).toBeDefined();
      expect(typeof stats.buscador.documents).toBe('number');
      expect(typeof stats.buscador.certificates).toBe('number');
      expect(typeof stats.buscador.events).toBe('number');
      expect(typeof stats.buscador.distributionStates).toBe('number');
      expect(typeof stats.buscador.storageXmlFiles).toBe('number');
    });

    it('accurately tracks inserted certificate and buscador metrics', async () => {
      const compId = `comp_bm_${Date.now()}`;
      const uniqueNum = Math.floor(100000 + Math.random() * 800000);
      const cnpj = `88${Date.now().toString().slice(-12)}`;

      await rawClient.execute({
        sql: 'INSERT INTO "companies" (id, numeric_id, name, cnpj) VALUES (?, ?, ?, ?);',
        args: [compId, uniqueNum, 'Empresa Teste Submodulos', cnpj],
      });

      await rawClient.execute({
        sql: `INSERT INTO "certificates" (company_id, subject, issuer, thumbprint, valid_from, valid_to, provider, has_private_key)
              VALUES (?, 'Cert Teste Submodulos', 'AC Raiz', ?, '2026-01-01', '2027-01-01', 'windows_store', 1);`,
        args: [uniqueNum, uniqueThumbprint],
      });

      const stats = await getDatabaseStats();
      expect(stats.buscador.certificates).toBeGreaterThanOrEqual(1);
    });
  });

  describe('backup-creator & inspector & restorer with BUSCADOR', () => {
    let createdBackupPath: string;

    it('creates a valid .wfb backup archive containing the BUSCADOR module', async () => {
      const backupFilename = `backup_buscador_submodule_${Date.now()}.wfb`;
      const result = await createBackup(
        {
          modules: ['BUSCADOR'],
          customDestination: testDir,
          customFilename: backupFilename,
        },
        DEFAULT_SETTINGS
      );

      createdBackupPath = result.path;
      expect(fs.existsSync(createdBackupPath)).toBe(true);
      expect(result.manifest.format).toBe('workspace-fiscal-backup');
      expect(result.manifest.modules).toEqual(['BUSCADOR']);
      expect(result.manifest.checksums).toBeDefined();
      expect(result.manifest.checksums!['data/buscador.json']).toMatch(/^sha256:[a-f0-9]{64}$/);

      // Verify physical entries inside zip
      const zip = new AdmZip(createdBackupPath);
      expect(zip.getEntry('manifest.json')).not.toBeNull();
      expect(zip.getEntry('data/buscador.json')).not.toBeNull();
    });

    it('inspects BUSCADOR backup and confirms SHA-256 integrity and module list', async () => {
      const inspection = await inspectBackup(createdBackupPath);
      expect(inspection.valid).toBe(true);
      expect(inspection.isLegacy).toBe(false);
      expect(inspection.format).toBe('wfb');
      expect(inspection.modules).toContain('BUSCADOR');
      expect(inspection.stats).toBeDefined();
    });

    it('detects SHA-256 tampering in data/buscador.json and fails inspection', async () => {
      const tamperedPath = path.join(testDir, `tampered_buscador_${Date.now()}.wfb`);
      fs.copyFileSync(createdBackupPath, tamperedPath);

      // Tamper data/buscador.json inside archive without updating manifest checksum
      const zip = new AdmZip(tamperedPath);
      zip.deleteFile('data/buscador.json');
      zip.addFile('data/buscador.json', Buffer.from(JSON.stringify({ tampered: true }), 'utf-8'));
      zip.writeZip(tamperedPath);

      const inspection = await inspectBackup(tamperedPath);
      expect(inspection.valid).toBe(false);
      expect(inspection.error).toContain('checksum SHA-256 divergente no arquivo data/buscador.json');
    });

    it('restores BUSCADOR module data into database', async () => {
      const mockSafetyFn = async () => {
        const dummyPath = path.join(testDir, `safety_${Date.now()}.wfb`);
        fs.writeFileSync(dummyPath, 'safety-content');
        return { filename: path.basename(dummyPath), path: dummyPath, sizeBytes: 14 };
      };

      const restoreResult = await restoreBackup(
        {
          filePath: createdBackupPath,
          modulesToRestore: ['BUSCADOR'],
        },
        mockSafetyFn,
        inspectBackup
      );

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restoredModules).toContain('BUSCADOR');

      // Verify certificate remains present after restoration
      const certRows = await rawClient.execute({
        sql: 'SELECT * FROM "certificates" WHERE thumbprint = ?;',
        args: [uniqueThumbprint],
      });
      expect(certRows.rows.length).toBe(1);
    });
  });
});

