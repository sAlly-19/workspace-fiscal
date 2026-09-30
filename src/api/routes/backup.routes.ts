import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { backupService, BackupModule } from '../services/backup.service';

const router = Router();

const upload = multer({
  dest: path.join(os.tmpdir(), 'wsf-backup-uploads'),
  limits: { fileSize: 500 * 1024 * 1024 },
});

router.get('/settings', (_req, res) => {
  res.json(backupService.getSettings());
});

router.patch('/settings', (req, res) => {
  try {
    const { enabled, intervalDays, retentionCount, destination } = req.body;
    const updates: Record<string, unknown> = {};
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (typeof intervalDays === 'number' && intervalDays >= 1 && intervalDays <= 365) updates.intervalDays = intervalDays;
    if (typeof retentionCount === 'number' && retentionCount >= 1 && retentionCount <= 365) updates.retentionCount = retentionCount;
    if (typeof destination === 'string' && destination.trim().length > 0) updates.destination = destination.trim();
    res.json(backupService.updateSettings(updates));
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar configurações de backup' });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const stats = await backupService.getDatabaseStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get('/list', async (_req, res) => {
  try {
    const list = await backupService.listBackups();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar backups' });
  }
});

router.post('/create', async (req, res) => {
  try {
    const { modules, destination, filename } = req.body as {
      modules?: BackupModule[];
      destination?: string;
      filename?: string;
    };
    const result = await backupService.createBackup({
      modules: Array.isArray(modules) && modules.length > 0 ? modules : ['NF_VIEW', 'DEPRECIATION', 'SETTINGS'],
      customDestination: destination,
      customFilename: filename,
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/inspect', upload.single('file'), async (req, res) => {
  let targetPath = (req.body?.filePath as string) || '';
  const isUploaded = Boolean(req.file?.path);

  if (req.file?.path) {
    targetPath = req.file.path;
  }

  if (!targetPath) {
    return res.status(400).json({ error: 'Nenhum caminho ou arquivo de backup fornecido.' });
  }

  try {
    const inspection = await backupService.inspectBackup(targetPath);
    res.json(inspection);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  } finally {
    if (isUploaded && targetPath && fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch {}
    }
  }
});

router.post('/restore', upload.single('file'), async (req, res) => {
  let targetPath = (req.body?.filePath as string) || '';
  const isUploaded = Boolean(req.file?.path);

  if (req.file?.path) {
    targetPath = req.file.path;
  }

  if (!targetPath) {
    return res.status(400).json({ error: 'Nenhum caminho ou arquivo de backup fornecido.' });
  }

  let modulesToRestore: BackupModule[] = ['NF_VIEW', 'DEPRECIATION', 'SETTINGS'];
  if (req.body?.modules) {
    try {
      const parsed = typeof req.body.modules === 'string' ? JSON.parse(req.body.modules) : req.body.modules;
      if (Array.isArray(parsed) && parsed.length > 0) {
        modulesToRestore = parsed as BackupModule[];
      }
    } catch {}
  }

  try {
    const result = await backupService.restoreBackup({
      filePath: targetPath,
      modulesToRestore,
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  } finally {
    if (isUploaded && targetPath && fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch {}
    }
  }
});

// Legado: aciona backup rápido
router.post('/run', async (_req, res) => {
  try {
    const result = await backupService.runBackup();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/maybe-run', async (_req, res) => {
  try {
    const result = await backupService.maybeRunIfDue();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;