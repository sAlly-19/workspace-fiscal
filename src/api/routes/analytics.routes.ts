import { Router } from 'express';
import { analyticsRepository } from '../repositories/analytics.repository';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { batchId } = req.query;
    const stats = await analyticsRepository.getDashboardStats(batchId as string | undefined);
    res.json(stats);
  } catch (error) {
    console.error('[AnalyticsRoute] Error fetching stats:', error);
    res.status(500).json({ error: 'Erro ao carregar estatísticas.' });
  }
});

export default router;
