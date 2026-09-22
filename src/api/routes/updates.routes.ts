import { Router } from 'express';
import { updateService } from '../services/update.service';

const router = Router();

router.get('/check', async (_req, res) => {
  try {
    const result = await updateService.checkLatestRelease();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Erro ao verificar atualizações' });
  }
});

router.get('/version', (_req, res) => {
  res.json({ version: updateService.getCurrentVersion() });
});

export default router;

