import { Router } from 'express';
import { categoriesRepository } from '../repositories/categories.repository';
import { validateCreateCategory, validateUpdateCategory } from '../validators';

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
    const validation = validateCreateCategory(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Dados de entrada inválidos', details: validation.errors });
    }
    const created = await categoriesRepository.create(validation.data);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const validation = validateUpdateCategory(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Dados de entrada inválidos', details: validation.errors });
    }
    const updated = await categoriesRepository.update(req.params.id, validation.data);
    if (!updated) return res.status(404).json({ error: 'Categoria não encontrada' });
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
