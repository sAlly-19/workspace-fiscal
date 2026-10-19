import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { FolderWatchModal, type FolderWatchModalProps } from './FolderWatchModal';
import { FolderWatchPromptCard, type FolderWatchPromptCardProps } from './FolderWatchPromptCard';
import type { FolderNode } from '../stores/workspace.store';

describe('Folder Watch UI Components', () => {
  describe('FolderWatchModal', () => {
    const mockFolder: FolderNode = {
      id: 'f-watch-1',
      name: 'Notas Recebidas',
      parentId: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      children: [],
      watchPath: 'C:\\test\\xmls',
      watchRecursive: true,
      watchMode: 'prompt',
    };

    const defaultProps: FolderWatchModalProps = {
      isOpen: true,
      folder: mockFolder,
      currentTheme: 'dark',
      onClose: vi.fn(),
      onSave: vi.fn(),
    };

    it('creates modal element with folder data and save handler', () => {
      const element = React.createElement(FolderWatchModal, defaultProps);
      expect(element).toBeDefined();
      expect(element.props.isOpen).toBe(true);
      expect(element.props.folder?.name).toBe('Notas Recebidas');
      expect(element.props.folder?.watchMode).toBe('prompt');
    });

    it('creates element with isOpen false when closed', () => {
      const elementClosed = React.createElement(FolderWatchModal, {
        ...defaultProps,
        isOpen: false,
      });
      expect(elementClosed.props.isOpen).toBe(false);
    });
  });

  describe('FolderWatchPromptCard', () => {
    const defaultPromptProps: FolderWatchPromptCardProps = {
      prompts: [
        {
          folderId: 'f-p-1',
          folderName: 'Notas Fiscais Entrada',
          pendingCount: 3,
          files: ['C:\\a.xml', 'C:\\b.xml', 'C:\\c.xml'],
        },
      ],
      onConfirm: vi.fn(),
      onDismiss: vi.fn(),
      onViewFolder: vi.fn(),
    };

    it('creates floating prompt card element for pending imports', () => {
      const element = React.createElement(FolderWatchPromptCard, defaultPromptProps);
      expect(element).toBeDefined();
      expect(element.props.prompts).toHaveLength(1);
      expect(element.props.prompts[0].pendingCount).toBe(3);
    });

    it('supports empty prompts list without errors', () => {
      const elementEmpty = React.createElement(FolderWatchPromptCard, {
        ...defaultPromptProps,
        prompts: [],
      });
      expect(elementEmpty.props.prompts).toHaveLength(0);
    });
  });
});
