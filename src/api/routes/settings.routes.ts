import { Router } from 'express';
import { db } from '../../db';
import { applicationSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

const VALID = ['IGNORE', 'OVERWRITE', 'CREATE_VERSION'] as const;
type DedupePolicy = typeof VALID[number];

router.get('/dedupe-policy', async (_req, res) => {
  try {
    const row = await db.query.applicationSettings.findFirst({
      where: eq(applicationSettings.key, 'import_dedupe_policy'),
    });
    if (!row) {
      res.json({ policy: 'IGNORE', updatedAt: null });
      return;
    }
    const parsed = JSON.parse(row.value);
    res.json({ policy: parsed.policy, updatedAt: row.updatedAt });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar política de deduplicação' });
  }
});

router.put('/dedupe-policy', async (req, res) => {
  try {
    const { policy } = req.body as { policy?: string };
    if (!policy || !VALID.includes(policy as DedupePolicy)) {
      res.status(400).json({ error: 'Política inválida. Use IGNORE, OVERWRITE ou CREATE_VERSION.' });
      return;
    }
    const value = JSON.stringify({ policy });
    const existing = await db.query.applicationSettings.findFirst({
      where: eq(applicationSettings.key, 'import_dedupe_policy'),
    });
    if (existing) {
      await db
        .update(applicationSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(applicationSettings.key, 'import_dedupe_policy'));
    } else {
      await db.insert(applicationSettings).values({
        key: 'import_dedupe_policy',
        value,
        updatedAt: new Date(),
      });
    }
    logger.info({ policy }, 'dedupe_policy_updated');
    res.json({ policy, updatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar política de deduplicação' });
  }
});

export default router;