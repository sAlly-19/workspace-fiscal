import { Router } from 'express';
import { workspaceRepository } from '../repositories/workspace.repository';
import crypto from 'crypto';

const router = Router();

// Get the full generic workspace hierarchy
router.get('/', async (req, res) => {
  try {
    const hierarchy = await workspaceRepository.getHierarchy();
    res.json(hierarchy);
  } catch (error) {
    console.error('[WorkspaceRoute] Error fetching workspace:', error);
    res.status(500).json({ error: 'Erro ao carregar a árvore de pastas do workspace.' });
  }
});

// Create a new folder (Root or Child)
router.post('/folders', async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome da pasta é obrigatório.' });
    }
    const id = crypto.randomUUID();
    const [folder] = await workspaceRepository.createFolder(id, name.trim(), parentId || null);
    res.status(201).json(folder);
  } catch (error) {
    console.error('[WorkspaceRoute] Error creating folder:', error);
    res.status(500).json({ error: 'Erro ao criar pasta no workspace.' });
  }
});

// Rename a folder
router.patch('/folders/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O novo nome da pasta é obrigatório.' });
    }
    const [updated] = await workspaceRepository.updateFolder(req.params.id, name.trim());
    if (!updated) {
      return res.status(404).json({ error: 'Pasta não encontrada.' });
    }
    res.json(updated);
  } catch (error) {
    console.error('[WorkspaceRoute] Error updating folder:', error);
    res.status(500).json({ error: 'Erro ao renomear pasta.' });
  }
});

// Delete a folder and its children
router.delete('/folders/:id', async (req, res) => {
  try {
    const result = await workspaceRepository.deleteFolder(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[WorkspaceRoute] Error deleting folder:', error);
    res.status(500).json({ error: 'Erro ao excluir pasta do workspace.' });
  }
});

// Reset / Clear entire workspace database
router.post('/reset', async (req, res) => {
  try {
    await workspaceRepository.resetDatabase();
    res.json({ success: true, message: 'Banco de dados e workspace resetados com sucesso.' });
  } catch (error) {
    console.error('[WorkspaceRoute] Error resetting workspace database:', error);
    res.status(500).json({ error: 'Erro ao limpar banco de dados do workspace.' });
  }
});

export default router;
