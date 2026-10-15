import { Router } from 'express';
import { db } from '../../db';
import { applicationSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { validateDedupePolicy, validateSeenVersion } from '../validators';

const router = Router();

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
    const validation = validateDedupePolicy(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.errors[0], details: validation.errors });
    }
    const { policy } = validation.data;
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

router.get('/seen-version', async (_req, res) => {
  try {
    const row = await db.query.applicationSettings.findFirst({
      where: eq(applicationSettings.key, 'seen_app_version'),
    });
    res.json({ version: row?.value || null });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar versão visualizada' });
  }
});

router.post('/seen-version', async (req, res) => {
  try {
    const validation = validateSeenVersion(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.errors[0], details: validation.errors });
    }
    const { version } = validation.data;
    const existing = await db.query.applicationSettings.findFirst({
      where: eq(applicationSettings.key, 'seen_app_version'),
    });
    if (existing) {
      await db
        .update(applicationSettings)
        .set({ value: version, updatedAt: new Date() })
        .where(eq(applicationSettings.key, 'seen_app_version'));
    } else {
      await db.insert(applicationSettings).values({
        key: 'seen_app_version',
        value: version,
        updatedAt: new Date(),
      });
    }
    res.json({ success: true, version });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar versão visualizada' });
  }
});

export default router;