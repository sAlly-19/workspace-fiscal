import { db } from '../../db';
import { folders, batches, documents, documentItems, documentTaxes, importJobs } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  children: FolderNode[];
  documentCount?: number;
}

export class WorkspaceRepository {
  // Create a new folder at root (parentId = null) or as a subfolder
  async createFolder(id: string, name: string, parentId?: string | null) {
    return db.insert(folders).values({
      id,
      name,
      parentId: parentId || null,
    }).returning();
  }

  // Rename a folder
  async updateFolder(id: string, name: string) {
    return db.update(folders).set({
      name,
      updatedAt: new Date(),
    }).where(eq(folders.id, id)).returning();
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
