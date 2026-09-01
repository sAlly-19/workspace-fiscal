import { Router } from 'express';
import { categoriesRepository } from '../repositories/categories.repository';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query;
    const list = await categoriesRepository.findAll(companyId as string | undefined);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, defaultRate, companyId } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
    if (defaultRate === undefined || isNaN(Number(defaultRate)) || Number(defaultRate) <=0 || Number(defaultRate) >100) {
      return res.status(400).json({ error: 'Taxa padrão inválida (0-100)' });
    }
    const created = await categoriesRepository.create({ name, defaultRate: Number(defaultRate), companyId });
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updated = await categoriesRepository.update(req.params.id, { name: req.body.name, defaultRate: req.body.defaultRate ? Number(req.body.defaultRate) : undefined });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await categoriesRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
});

export default router;
