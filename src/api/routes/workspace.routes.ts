import { Router } from 'express';
import { workspaceRepository } from '../repositories/workspace.repository';
import { validateCreateFolder, validateUpdateFolder } from '../validators';
import { folderWatcherService } from '../services/folder-watcher.service';
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
    const validation = validateCreateFolder(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.errors[0], details: validation.errors });
    }
    const id = crypto.randomUUID();
    const [folder] = await workspaceRepository.createFolder(
      id,
      validation.data.name,
      validation.data.parentId,
      {
        watchPath: validation.data.watchPath,
        watchRecursive: validation.data.watchRecursive,
        watchMode: validation.data.watchMode,
      }
    );
    setImmediate(() => {
      folderWatcherService.syncWatchers().catch((err) => {
        console.error('[WorkspaceRoute] Background syncWatchers failed on create:', err);
      });
    });
    res.status(201).json(folder);
  } catch (error) {
    console.error('[WorkspaceRoute] Error creating folder:', error);
    res.status(500).json({ error: 'Erro ao criar pasta no workspace.' });
  }
});

// Rename or configure a folder
router.patch('/folders/:id', async (req, res) => {
  try {
    const validation = validateUpdateFolder(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.errors[0], details: validation.errors });
    }
    const [updated] = await workspaceRepository.updateFolder(req.params.id, validation.data);
    if (!updated) {
      return res.status(404).json({ error: 'Pasta não encontrada.' });
    }
    setImmediate(() => {
      folderWatcherService.syncWatchers().catch((err) => {
        console.error('[WorkspaceRoute] Background syncWatchers failed on update:', err);
      });
    });
    res.json(updated);
  } catch (error) {
    console.error('[WorkspaceRoute] Error updating folder:', error);
    res.status(500).json({ error: 'Erro ao atualizar pasta.' });
  }
});

// Delete a folder and its children
router.delete('/folders/:id', async (req, res) => {
  try {
    folderWatcherService.stopWatcher(req.params.id);
    const result = await workspaceRepository.deleteFolder(req.params.id);
    setImmediate(() => {
      folderWatcherService.syncWatchers().catch((err) => {
        console.error('[WorkspaceRoute] Background syncWatchers failed on delete:', err);
      });
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[WorkspaceRoute] Error deleting folder:', error);
    res.status(500).json({ error: 'Erro ao excluir pasta do workspace.' });
  }
});

// Watch folder action: confirm pending import
router.post('/folders/:id/watch/confirm', async (req, res) => {
  try {
    setImmediate(() => {
      folderWatcherService.confirmPendingImport(req.params.id).catch((err) => {
        console.error('[WorkspaceRoute] Background confirmPendingImport failed:', err);
      });
    });
    res.json({ success: true, started: true });
  } catch (error) {
    console.error('[WorkspaceRoute] Error confirming watch import:', error);
    res.status(500).json({ error: 'Erro ao processar importação da pasta monitorada.' });
  }
});

// Watch folder action: dismiss pending import
router.post('/folders/:id/watch/dismiss', async (req, res) => {
  try {
    await folderWatcherService.dismissPendingImport(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[WorkspaceRoute] Error dismissing watch import:', error);
    res.status(500).json({ error: 'Erro ao descartar importação pendente.' });
  }
});

// Watch folder action: get pending files for a folder
router.get('/folders/:id/watch/pending', async (req, res) => {
  try {
    const files = folderWatcherService.getPendingFiles(req.params.id);
    res.json({ folderId: req.params.id, pendingCount: files.length, files });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar arquivos pendentes.' });
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
