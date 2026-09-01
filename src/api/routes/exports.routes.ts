import { Router } from 'express';
import { db } from '../../db';
import { depreciationExports } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId obrigatório' });
    const list = await db.query.depreciationExports.findMany({
      where: eq(depreciationExports.companyId, companyId as string),
      orderBy: (e, { desc }) => [desc(e.competence)],
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar exportações' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const exp = await db.query.depreciationExports.findFirst({ where: eq(depreciationExports.id, req.params.id) });
    if (!exp) return res.status(404).json({ error: 'Exportação não encontrada' });
    res.json(exp);
  } catch (e) {
    res.status(500).json({ error: 'Erro' });
  }
});

export default router;
