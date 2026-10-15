import { describe, it, expect } from 'vitest';
import { getFolderAndDescendantIds } from './workspace.utils';
import { FolderNode } from './workspace.types';

describe('getFolderAndDescendantIds', () => {
  const sampleTree: FolderNode[] = [
    {
      id: 'f-2026',
      name: 'Exercício Fiscal 2026',
      parentId: null,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      documentCount: 4,
      children: [
        {
          id: 'f-cte',
          name: 'CT-e Conhecimentos',
          parentId: 'f-2026',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          documentCount: 1,
          children: [
            {
              id: 'f-cte-sub',
              name: 'Sub-CTe',
              parentId: 'f-cte',
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
              documentCount: 1,
              children: [],
            },
          ],
        },
        {
          id: 'f-nfe',
          name: 'NF-e Mercadorias',
          parentId: 'f-2026',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          documentCount: 2,
          children: [],
        },
      ],
    },
    {
      id: 'f-other',
      name: 'Outra Pasta',
      parentId: null,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      documentCount: 10,
      children: [],
    },
  ];

  it('returns null when folderId is null or "all"', () => {
    expect(getFolderAndDescendantIds(null, sampleTree)).toBeNull();
    expect(getFolderAndDescendantIds('all', sampleTree)).toBeNull();
  });

  it('returns the parent ID and all nested descendant IDs', () => {
    const result = getFolderAndDescendantIds('f-2026', sampleTree);
    expect(result).not.toBeNull();
    expect(Array.from(result!).sort()).toEqual(['f-2026', 'f-cte', 'f-cte-sub', 'f-nfe'].sort());
  });

  it('returns only the folder and its children when selecting an intermediate node', () => {
    const result = getFolderAndDescendantIds('f-cte', sampleTree);
    expect(result).not.toBeNull();
    expect(Array.from(result!).sort()).toEqual(['f-cte', 'f-cte-sub'].sort());
  });

  it('returns only the leaf ID when selecting a leaf folder without children', () => {
    const result = getFolderAndDescendantIds('f-nfe', sampleTree);
    expect(result).not.toBeNull();
    expect(Array.from(result!)).toEqual(['f-nfe']);
  });
});

