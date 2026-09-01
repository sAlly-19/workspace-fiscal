import { Router } from 'express';
import { backupService } from '../services/backup.service';

const router = Router();

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

router.get('/list', async (_req, res) => {
  try {
    const list = await backupService.listBackups();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar backups' });
  }
});

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