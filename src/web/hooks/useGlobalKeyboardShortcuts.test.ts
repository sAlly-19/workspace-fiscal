import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isEditableTarget,
  hasOpenModal,
  handleGlobalShortcutKeyDown,
  GlobalKeyboardShortcutsOptions,
} from './useGlobalKeyboardShortcuts';

describe('useGlobalKeyboardShortcuts (IMP-023)', () => {
  let callbacks: Required<GlobalKeyboardShortcutsOptions>;
  let originalDocument: any;

  beforeEach(() => {
    callbacks = {
      onNavigateHome: vi.fn(),
      onNavigateNfView: vi.fn(),
      onNavigateDepreciation: vi.fn(),
      onNavigateBuscador: vi.fn(),
      onOpenSettings: vi.fn(),
      onOpenHelp: vi.fn(),
      enabled: true,
    };
    originalDocument = (globalThis as any).document;
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
  });

  describe('isEditableTarget', () => {
    it('returns true for input, textarea and select', () => {
      expect(isEditableTarget({ tagName: 'INPUT' } as any)).toBe(true);
      expect(isEditableTarget({ tagName: 'TEXTAREA' } as any)).toBe(true);
      expect(isEditableTarget({ tagName: 'SELECT' } as any)).toBe(true);
    });

    it('returns true for contenteditable elements', () => {
      expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true } as any)).toBe(true);
      expect(isEditableTarget({ tagName: 'DIV', getAttribute: (k: string) => k === 'contenteditable' ? 'true' : null } as any)).toBe(true);
    });

    it('returns false for non-editable elements', () => {
      expect(isEditableTarget({ tagName: 'DIV' } as any)).toBe(false);
      expect(isEditableTarget({ tagName: 'BODY' } as any)).toBe(false);
      expect(isEditableTarget(null)).toBe(false);
    });
  });

  describe('hasOpenModal (Safeguard 3)', () => {
    it('detects when an accessible dialog is open', () => {
      (globalThis as any).document = {
        querySelector: vi.fn((sel: string) => {
          if (sel === '[role="dialog"][aria-modal="true"]') return {} as any;
          return null;
        }),
      };

      expect(hasOpenModal()).toBe(true);
    });

    it('returns false when no dialog is open', () => {
      (globalThis as any).document = {
        querySelector: vi.fn(() => null),
      };

      expect(hasOpenModal()).toBe(false);
    });
  });

  describe('Navigation shortcuts and modal protection', () => {
    it('navigates to modules on Ctrl+1..4 when no modal is open', () => {
      (globalThis as any).document = { querySelector: () => null };

      const event1 = { key: '1', ctrlKey: true, preventDefault: vi.fn(), target: { tagName: 'DIV' } };
      handleGlobalShortcutKeyDown(event1 as any, callbacks);
      expect(callbacks.onNavigateHome).toHaveBeenCalled();

      const event2 = { key: '2', ctrlKey: true, preventDefault: vi.fn(), target: { tagName: 'DIV' } };
      handleGlobalShortcutKeyDown(event2 as any, callbacks);
      expect(callbacks.onNavigateNfView).toHaveBeenCalled();

      const event3 = { key: '3', ctrlKey: true, preventDefault: vi.fn(), target: { tagName: 'DIV' } };
      handleGlobalShortcutKeyDown(event3 as any, callbacks);
      expect(callbacks.onNavigateDepreciation).toHaveBeenCalled();

      const event4 = { key: '4', ctrlKey: true, preventDefault: vi.fn(), target: { tagName: 'DIV' } };
      handleGlobalShortcutKeyDown(event4 as any, callbacks);
      expect(callbacks.onNavigateBuscador).toHaveBeenCalled();
    });

    it('BLOCKS module switching shortcuts when a modal is open in the DOM (Safeguard 3)', () => {
      (globalThis as any).document = {
        querySelector: (sel: string) => (sel === '[role="dialog"][aria-modal="true"]' ? {} : null),
      };

      const event = { key: '1', ctrlKey: true, preventDefault: vi.fn(), target: { tagName: 'INPUT' } };
      handleGlobalShortcutKeyDown(event as any, callbacks);

      // Não deve navegar e não deve prevenir default para não travar o input do modal
      expect(callbacks.onNavigateHome).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('triggers settings on Ctrl+,', () => {
      (globalThis as any).document = { querySelector: () => null };
      const event = { key: ',', ctrlKey: true, preventDefault: vi.fn(), target: { tagName: 'DIV' } };
      handleGlobalShortcutKeyDown(event as any, callbacks);
      expect(callbacks.onOpenSettings).toHaveBeenCalled();
    });

    it('triggers help on F1 only when not typing in an editable target', () => {
      (globalThis as any).document = { querySelector: () => null };

      // Typing in input -> F1 ignored
      const typingEvent = { key: 'F1', preventDefault: vi.fn(), target: { tagName: 'INPUT' } };
      handleGlobalShortcutKeyDown(typingEvent as any, callbacks);
      expect(callbacks.onOpenHelp).not.toHaveBeenCalled();

      // Normal target -> F1 opens help
      const normalEvent = { key: 'F1', preventDefault: vi.fn(), target: { tagName: 'BODY' } };
      handleGlobalShortcutKeyDown(normalEvent as any, callbacks);
      expect(callbacks.onOpenHelp).toHaveBeenCalled();
    });
  });
});
