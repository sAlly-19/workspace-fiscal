import { db } from '../../db';
import { folders, batches, documents, documentItems, documentTaxes, importJobs, folderWatchFiles } from '../../db/schema';
import { eq, inArray, or } from 'drizzle-orm';

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  children: FolderNode[];
  documentCount?: number;
  watchPath?: string | null;
  watchRecursive?: boolean;
  watchMode?: 'off' | 'prompt';
}

export class WorkspaceRepository {
  // Create a new folder at root (parentId = null) or as a subfolder
  async createFolder(
    id: string,
    name: string,
    parentId?: string | null,
    watchConfig?: {
      watchPath?: string | null;
      watchRecursive?: boolean;
      watchMode?: 'off' | 'prompt';
    }
  ) {
    return db.insert(folders).values({
      id,
      name,
      parentId: parentId || null,
      watchPath: watchConfig?.watchPath || null,
      watchRecursive: Boolean(watchConfig?.watchRecursive),
      watchMode: watchConfig?.watchMode === 'prompt' ? 'prompt' : 'off',
    }).returning();
  }

  // Rename a folder or update its watch configuration
  async updateFolder(
    id: string,
    data: {
      name?: string;
      watchPath?: string | null;
      watchRecursive?: boolean;
      watchMode?: 'off' | 'prompt';
    } | string
  ) {
    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (typeof data === 'string') {
      updatePayload.name = data;
    } else {
      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.watchPath !== undefined) updatePayload.watchPath = data.watchPath;
      if (data.watchRecursive !== undefined) updatePayload.watchRecursive = data.watchRecursive;
      if (data.watchMode !== undefined) updatePayload.watchMode = data.watchMode;
    }

    return db.update(folders).set(updatePayload).where(eq(folders.id, id)).returning();
  }

  // Get a single folder by ID
  async getFolderById(id: string) {
    return db.query.folders.findFirst({
      where: eq(folders.id, id),
    });
  }

  // Get all folders with active watch mode ('prompt')
  async getActiveWatchedFolders() {
    const list = await db.query.folders.findMany();
    return list.filter(
      (f) =>
        (f.watchMode === 'prompt' || (f.watchMode as any) === 'auto') &&
        Boolean(f.watchPath && f.watchPath.trim())
    );
  }

  // Gather all descendant folder IDs recursively for a given folder
  async getFolderDescendantIds(folderId: string): Promise<string[]> {
    const allFolders = await db.query.folders.findMany({
      columns: { id: true, parentId: true },
    });

    const getDescendants = (parentId: string): string[] => {
      const children = allFolders.filter((f) => f.parentId === parentId);
      const list: string[] = [];
      for (const child of children) {
        list.push(child.id);
        list.push(...getDescendants(child.id));
      }
      return list;
    };

    return getDescendants(folderId);
  }

  // Monitored Folder File Tracking (Persistence across restarts)
  async getWatchFiles(folderId: string): Promise<Array<{ filePath: string; status: 'imported' | 'ignored' }>> {
    try {
      const rows = await db.query.folderWatchFiles.findMany({
        where: eq(folderWatchFiles.folderId, folderId),
      });
      return rows.map((r) => ({
        filePath: r.filePath,
        status: r.status as 'imported' | 'ignored',
      }));
    } catch {
      return [];
    }
  }

  async recordWatchFile(folderId: string, filePath: string, status: 'imported' | 'ignored' = 'imported'): Promise<void> {
    try {
      await db.insert(folderWatchFiles)
        .values({
          folderId,
          filePath,
          status,
        })
        .onConflictDoUpdate({
          target: [folderWatchFiles.folderId, folderWatchFiles.filePath],
          set: { status },
        });
    } catch {
      // Ignore conflict / transient errors
    }
  }

  async recordWatchFilesBatch(
    folderId: string,
    files: Array<{ filePath: string; status: 'imported' | 'ignored' }>
  ): Promise<void> {
    if (files.length === 0) return;
    try {
      for (const f of files) {
        await this.recordWatchFile(folderId, f.filePath, f.status);
      }
    } catch {
      // Ignore errors
    }
  }

  async getExistingAccessKeysForFolder(folderId: string): Promise<Set<string>> {
    try {
      const docs = await db.query.documents.findMany({
        where: eq(documents.batchId, folderId),
        columns: { accessKey: true },
      });
      const keys = new Set<string>();
      for (const d of docs) {
        if (d.accessKey) keys.add(d.accessKey);
      }
      return keys;
    } catch {
      return new Set();
    }
  }

  // Delete a folder and recursively its subfolders & unassign or delete documents
  async deleteFolder(id: string) {
    // 1. Find all folders
    const allFolders = await db.query.folders.findMany();
    
    // Gather all descendants recursively (children first, then parents)
    const getDescendantsBottomUp = (folderId: string): string[] => {
      const children = allFolders.filter(f => f.parentId === folderId);
      let list: string[] = [];
      for (const child of children) {
        list = [...list, ...getDescendantsBottomUp(child.id as string)];
        list.push(child.id as string);
      }
      return list;
    };

    const targetFolderIds = [...getDescendantsBottomUp(id), id];

    if (targetFolderIds.length > 0) {
      // Unassign all documents from these folders
      for (const fId of targetFolderIds) {
        await db.update(documents).set({ batchId: null }).where(eq(documents.batchId, fId));
        await db.delete(batches).where(eq(batches.folderId, fId));
        await db.delete(folderWatchFiles).where(eq(folderWatchFiles.folderId, fId));
      }

      // Delete folders in reverse order (leaf folders first)
      for (const fId of targetFolderIds) {
        await db.delete(folders).where(eq(folders.id, fId));
      }
    }

    return { deletedFolderIds: targetFolderIds };
  }

  // Get full nested recursive tree of folders
  async getHierarchy(): Promise<FolderNode[]> {
    const allFolders = await db.query.folders.findMany({
      orderBy: (f, { asc }) => [asc(f.name)],
    });

    const allDocs = await db.query.documents.findMany({
      columns: { id: true, batchId: true },
    });

    // Count documents per folder (using batchId as folderId)
    const docCounts: Record<string, number> = {};
    for (const doc of allDocs) {
      if (doc.batchId) {
        docCounts[doc.batchId] = (docCounts[doc.batchId] || 0) + 1;
      }
    }

    // Build hierarchy
    const map = new Map<string, FolderNode>();
    allFolders.forEach(f => {
      map.set(f.id, {
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        children: [],
        documentCount: docCounts[f.id] || 0,
        watchPath: f.watchPath ?? null,
        watchRecursive: Boolean(f.watchRecursive),
        watchMode: f.watchMode === 'prompt' || (f.watchMode as any) === 'auto' ? 'prompt' : 'off',
      });
    });

    const rootFolders: FolderNode[] = [];
    allFolders.forEach(f => {
      const node = map.get(f.id)!;
      if (f.parentId && map.has(f.parentId)) {
        map.get(f.parentId)!.children.push(node);
      } else {
        rootFolders.push(node);
      }
    });

    // Rollup document counts from leaves up to roots
    const rollupCounts = (node: FolderNode): number => {
      let total = node.documentCount || 0;
      for (const child of node.children) {
        total += rollupCounts(child);
      }
      node.documentCount = total;
      return total;
    };
    rootFolders.forEach(rollupCounts);

    return rootFolders;
  }

  async resetDatabase() {
    // Primeiro coleta todos os rawXmlPath para limpar arquivos físicos
    const allDocs = await db.query.documents.findMany({ columns: { rawXmlPath: true } });
    // Delete in cascade order (transacionalmente na medida do possível)
    await db.delete(documentItems);
    await db.delete(documentTaxes);
    await db.delete(documents);
    await db.delete(batches);
    await db.delete(folderWatchFiles);
    await db.delete(folders);
    await db.delete(importJobs);

    // Limpa arquivos físicos (não bloqueia reset se falhar)
    try {
      const { storageService } = await import('../services/storage.service');
      await storageService.clearAll();
      // Fallback: tenta deletar individualmente se clearAll não cobrir paths absolutos antigos
      for (const d of allDocs) {
        if (d.rawXmlPath) {
          await storageService.deleteXml(d.rawXmlPath).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[WorkspaceRepository] reset storage cleanup failed', e);
    }
    return { success: true };
  }
}

export const workspaceRepository = new WorkspaceRepository();
