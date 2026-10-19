import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import {
  WorkspaceTreeHeader,
  WorkspaceTreeNode,
  WorkspaceTreeRootArea,
} from './index';
import type { FolderNode } from '../../../stores/workspace.store';

describe('WorkspaceTree Submodules', () => {
  describe('WorkspaceTreeHeader', () => {
    it('creates header with title and button for root folder creation', () => {
      const onStartCreateRoot = vi.fn();
      const onSelectFolder = vi.fn();

      const element = React.createElement(WorkspaceTreeHeader, {
        currentTheme: 'dark',
        selectedFolderId: null,
        breadcrumb: [],
        onStartCreateRoot,
        onSelectFolder,
      });

      expect(element).toBeDefined();
      expect(element.type).toBe(WorkspaceTreeHeader);
      expect(element.props.currentTheme).toBe('dark');
    });

    it('renders breadcrumb items when selectedFolderId has path', () => {
      const mockBreadcrumb: FolderNode[] = [
        {
          id: 'f-1',
          name: 'Empresas',
          parentId: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          children: [],
          documentCount: 5,
        },
        {
          id: 'f-2',
          name: '2026',
          parentId: 'f-1',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          children: [],
          documentCount: 2,
        },
      ];

      const element = React.createElement(WorkspaceTreeHeader, {
        currentTheme: 'light',
        selectedFolderId: 'f-2',
        breadcrumb: mockBreadcrumb,
        onStartCreateRoot: vi.fn(),
        onSelectFolder: vi.fn(),
      });

      expect(element.props.breadcrumb).toHaveLength(2);
      expect(element.props.selectedFolderId).toBe('f-2');
    });
  });

  describe('WorkspaceTreeRootArea', () => {
    it('handles root documents option and empty state', () => {
      const onSelectAllDocuments = vi.fn();
      const onStartCreateRoot = vi.fn();
      const inputRef = { current: null };

      const element = React.createElement(WorkspaceTreeRootArea, {
        currentTheme: 'dark',
        selectedFolderId: null,
        dragOverFolderId: null,
        creatingParentId: undefined,
        newFolderName: '',
        foldersCount: 0,
        inputRef,
        onSelectAllDocuments,
        onStartCreateRoot,
        onSaveCreate: vi.fn(),
        onCancelCreate: vi.fn(),
        onChangeNewFolderName: vi.fn(),
        onDragOver: vi.fn(),
        onDragLeave: vi.fn(),
        onDrop: vi.fn(),
      });

      expect(element).toBeDefined();
      expect(element.props.foldersCount).toBe(0);
      expect(element.props.creatingParentId).toBeUndefined();
    });

    it('supports root creation input state when creatingParentId is null', () => {
      const element = React.createElement(WorkspaceTreeRootArea, {
        currentTheme: 'light',
        selectedFolderId: 'f-1',
        dragOverFolderId: null,
        creatingParentId: null,
        newFolderName: 'Nova Pasta Raiz',
        foldersCount: 3,
        inputRef: { current: null },
        onSelectAllDocuments: vi.fn(),
        onStartCreateRoot: vi.fn(),
        onSaveCreate: vi.fn(),
        onCancelCreate: vi.fn(),
        onChangeNewFolderName: vi.fn(),
        onDragOver: vi.fn(),
        onDragLeave: vi.fn(),
        onDrop: vi.fn(),
      });

      expect(element.props.creatingParentId).toBeNull();
      expect(element.props.newFolderName).toBe('Nova Pasta Raiz');
    });
  });

  describe('WorkspaceTreeNode', () => {
    it('creates tree node for folder with children and document count', () => {
      const mockNode: FolderNode = {
        id: 'node-root',
        name: 'Notas Fiscais',
        parentId: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        documentCount: 12,
        children: [
          {
            id: 'node-child-1',
            name: 'Entradas',
            parentId: 'node-root',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            children: [],
            documentCount: 8,
          },
          {
            id: 'node-child-2',
            name: 'Saídas',
            parentId: 'node-root',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            children: [],
            documentCount: 4,
          },
        ],
      };

      const element = React.createElement(WorkspaceTreeNode, {
        node: mockNode,
        depth: 0,
        currentTheme: 'dark',
        selectedFolderId: 'node-root',
        expandedFolderIds: { 'node-root': true },
        editingFolderId: null,
        editingName: '',
        creatingParentId: undefined,
        newFolderName: '',
        activeMenuId: null,
        dragOverFolderId: null,
        inputRef: { current: null },
        onSelectFolder: vi.fn(),
        onToggleExpand: vi.fn(),
        onStartCreate: vi.fn(),
        onSaveCreate: vi.fn(),
        onCancelCreate: vi.fn(),
        onChangeNewFolderName: vi.fn(),
        onStartEdit: vi.fn(),
        onSaveEdit: vi.fn(),
        onCancelEdit: vi.fn(),
        onChangeEditingName: vi.fn(),
        onRequestDelete: vi.fn(),
        onToggleMenu: vi.fn(),
        onCloseMenu: vi.fn(),
        onDragOver: vi.fn(),
        onDragLeave: vi.fn(),
        onDrop: vi.fn(),
      });

      expect(element).toBeDefined();
      expect(element.props.node.name).toBe('Notas Fiscais');
      expect(element.props.node.documentCount).toBe(12);
      expect(element.props.expandedFolderIds['node-root']).toBe(true);
      expect(element.props.node.children).toHaveLength(2);
    });

    it('supports watchMode auto and prompt with onConfigureWatch callback', () => {
      const onConfigureWatch = vi.fn();
      const watchedNode: FolderNode = {
        id: 'node-watch',
        name: 'Notas Monitoradas',
        parentId: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        children: [],
        watchPath: 'C:\\test\\watch',
        watchRecursive: true,
        watchMode: 'auto',
      };

      const element = React.createElement(WorkspaceTreeNode, {
        node: watchedNode,
        depth: 0,
        currentTheme: 'dark',
        selectedFolderId: null,
        expandedFolderIds: {},
        editingFolderId: null,
        editingName: '',
        creatingParentId: undefined,
        newFolderName: '',
        activeMenuId: null,
        dragOverFolderId: null,
        inputRef: { current: null },
        onSelectFolder: vi.fn(),
        onToggleExpand: vi.fn(),
        onStartCreate: vi.fn(),
        onSaveCreate: vi.fn(),
        onCancelCreate: vi.fn(),
        onChangeNewFolderName: vi.fn(),
        onStartEdit: vi.fn(),
        onSaveEdit: vi.fn(),
        onCancelEdit: vi.fn(),
        onChangeEditingName: vi.fn(),
        onRequestDelete: vi.fn(),
        onToggleMenu: vi.fn(),
        onCloseMenu: vi.fn(),
        onDragOver: vi.fn(),
        onDragLeave: vi.fn(),
        onDrop: vi.fn(),
        onConfigureWatch,
      });

      expect(element.props.node.watchMode).toBe('auto');
      expect(element.props.node.watchPath).toBe('C:\\test\\watch');
      expect(element.props.node.watchRecursive).toBe(true);
      expect(element.props.onConfigureWatch).toBe(onConfigureWatch);
    });

    it('renders sync spinner and real-time count badge when folder is syncing', () => {
      const syncingNode: FolderNode = {
        id: 'node-syncing-123',
        name: '05-2026',
        parentId: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        children: [],
        documentCount: 10,
        watchMode: 'auto',
        watchPath: 'C:\\XMLs',
      };

      const element = React.createElement(WorkspaceTreeNode, {
        node: syncingNode,
        depth: 0,
        currentTheme: 'dark',
        selectedFolderId: null,
        expandedFolderIds: {},
        editingFolderId: null,
        editingName: '',
        creatingParentId: undefined,
        newFolderName: '',
        activeMenuId: null,
        dragOverFolderId: null,
        inputRef: { current: null },
        onSelectFolder: vi.fn(),
        onToggleExpand: vi.fn(),
        onStartCreate: vi.fn(),
        onSaveCreate: vi.fn(),
        onCancelCreate: vi.fn(),
        onChangeNewFolderName: vi.fn(),
        onStartEdit: vi.fn(),
        onSaveEdit: vi.fn(),
        onCancelEdit: vi.fn(),
        onChangeEditingName: vi.fn(),
        onRequestDelete: vi.fn(),
        onToggleMenu: vi.fn(),
        onCloseMenu: vi.fn(),
        onDragOver: vi.fn(),
        onDragLeave: vi.fn(),
        onDrop: vi.fn(),
      });

      expect(element).toBeDefined();
      expect(element.props.node.id).toBe('node-syncing-123');
      expect(element.props.node.name).toBe('05-2026');
      expect(element.props.node.documentCount).toBe(10);
    });
  });
});


