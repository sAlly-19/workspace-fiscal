import { describe, it, expect, beforeEach } from 'vitest';
import { workspaceRepository } from './workspace.repository';
import { documentsRepository } from './documents.repository';
import { db, rawClient, initDatabase } from '../../db';
import { folders, documents } from '../../db/schema';

describe('WorkspaceRepository & Recursive Subfolders (TDD)', () => {
  beforeEach(async () => {
    await initDatabase();
    await rawClient.execute('DELETE FROM "documents";');
    await rawClient.execute('DELETE FROM "batches";');
    await rawClient.execute('DELETE FROM "folders";');
  });

  it('resolves all descendant folder IDs recursively', async () => {
    // Root: 'f-root'
    //   -> Child: 'f-child-1'
    //        -> Grandchild: 'f-grandchild-1'
    //   -> Child: 'f-child-2'
    await workspaceRepository.createFolder('f-root', 'Exercício Fiscal 2026', null);
    await workspaceRepository.createFolder('f-child-1', 'CT-e', 'f-root');
    await workspaceRepository.createFolder('f-grandchild-1', 'CT-e Janeiro', 'f-child-1');
    await workspaceRepository.createFolder('f-child-2', 'NF-e', 'f-root');
    await workspaceRepository.createFolder('f-other-root', 'Outro Ano', null);

    const rootDescendants = await workspaceRepository.getFolderDescendantIds('f-root');
    expect(rootDescendants.sort()).toEqual(['f-child-1', 'f-child-2', 'f-grandchild-1'].sort());

    const child1Descendants = await workspaceRepository.getFolderDescendantIds('f-child-1');
    expect(child1Descendants).toEqual(['f-grandchild-1']);

    const leafDescendants = await workspaceRepository.getFolderDescendantIds('f-child-2');
    expect(leafDescendants).toEqual([]);
  });

  it('rolls up document counts from subfolders in getHierarchy', async () => {
    await workspaceRepository.createFolder('f-parent', 'Exercício Fiscal 2026', null);
    await workspaceRepository.createFolder('f-sub1', 'CT-e', 'f-parent');
    await workspaceRepository.createFolder('f-sub2', 'NF-e', 'f-parent');

    // 1 doc in sub1, 2 docs in sub2, 0 docs directly in f-parent
    await documentsRepository.create({
      id: 'doc-1',
      type: 'CTE',
      rawXmlPath: '/tmp/cte1.xml',
      batchId: 'f-sub1',
      status: 'VALID',
    });
    await documentsRepository.create({
      id: 'doc-2',
      type: 'NFE',
      rawXmlPath: '/tmp/nfe1.xml',
      batchId: 'f-sub2',
      status: 'VALID',
    });
    await documentsRepository.create({
      id: 'doc-3',
      type: 'NFE',
      rawXmlPath: '/tmp/nfe2.xml',
      batchId: 'f-sub2',
      status: 'VALID',
    });

    const hierarchy = await workspaceRepository.getHierarchy();
    expect(hierarchy).toHaveLength(1);
    const parentNode = hierarchy[0];
    expect(parentNode.id).toBe('f-parent');
    // Parent folder documentCount should be rolled up: 0 direct + 1 in sub1 + 2 in sub2 = 3
    expect(parentNode.documentCount).toBe(3);

    const sub1 = parentNode.children.find((c) => c.id === 'f-sub1');
    const sub2 = parentNode.children.find((c) => c.id === 'f-sub2');
    expect(sub1?.documentCount).toBe(1);
    expect(sub2?.documentCount).toBe(2);
  });

  it('returns documents from subfolders when findAll is called with parent folder ID', async () => {
    await workspaceRepository.createFolder('f-parent', 'Exercício Fiscal 2026', null);
    await workspaceRepository.createFolder('f-sub1', 'CT-e', 'f-parent');
    await workspaceRepository.createFolder('f-sub2', 'NF-e', 'f-parent');
    await workspaceRepository.createFolder('f-other', 'Outra Pasta', null);

    await documentsRepository.create({
      id: 'doc-1',
      type: 'CTE',
      rawXmlPath: '/tmp/cte1.xml',
      batchId: 'f-sub1',
      status: 'VALID',
    });
    await documentsRepository.create({
      id: 'doc-2',
      type: 'NFE',
      rawXmlPath: '/tmp/nfe1.xml',
      batchId: 'f-sub2',
      status: 'VALID',
    });
    await documentsRepository.create({
      id: 'doc-unrelated',
      type: 'NFE',
      rawXmlPath: '/tmp/unrelated.xml',
      batchId: 'f-other',
      status: 'VALID',
    });

    // Querying by parent folder should return both doc-1 and doc-2, but not doc-unrelated
    const docs = await documentsRepository.findAll('f-parent');
    const ids = docs.map((d) => d.id).sort();
    expect(ids).toEqual(['doc-1', 'doc-2'].sort());
  });
});

