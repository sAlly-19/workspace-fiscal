import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { useDialogFocus } from './useDialogFocus';

function renderHookWithEffects<TProps, TResult>(
  hookFn: (props: TProps) => TResult,
  options?: { initialProps?: TProps }
) {
  let hookIndex = 0;
  const hooks: any[] = [];
  let currentProps = options?.initialProps;
  const result = { current: undefined as unknown as TResult };

  const dispatcher = {
    useState(initial: any) {
      const idx = hookIndex++;
      if (hooks[idx] === undefined) {
        hooks[idx] = typeof initial === 'function' ? initial() : initial;
      }
      return [hooks[idx], (action: any) => { hooks[idx] = typeof action === 'function' ? action(hooks[idx]) : action; render(); }];
    },
    useMemo(fn: () => any, deps?: any[]) {
      const idx = hookIndex++;
      const prev = hooks[idx];
      if (!prev || !deps || deps.some((d: any, i: number) => !Object.is(d, prev.deps[i]))) {
        const val = fn();
        hooks[idx] = { val, deps };
        return val;
      }
      return prev.val;
    },
    useCallback(fn: any, deps: any[]) {
      return dispatcher.useMemo(() => fn, deps);
    },
    useEffect(effect: () => (() => void) | void, deps?: any[]) {
      const idx = hookIndex++;
      const prev = hooks[idx];
      if (!prev || !deps || deps.some((d: any, i: number) => !Object.is(d, prev.deps[i]))) {
        if (prev?.cleanup && typeof prev.cleanup === 'function') prev.cleanup();
        const cleanup = effect();
        hooks[idx] = { cleanup, deps };
      }
    },
  };

  function render(newProps?: TProps) {
    if (newProps !== undefined) currentProps = newProps;
    hookIndex = 0;
    const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const prevDispatcher = internals?.H;
    if (internals) internals.H = dispatcher;
    try {
      result.current = hookFn(currentProps as TProps);
    } finally {
      if (internals) internals.H = prevDispatcher;
    }
  }

  function unmount() {
    for (const h of hooks) {
      if (h?.cleanup && typeof h.cleanup === 'function') {
        h.cleanup();
      }
    }
  }

  render();

  return { result, rerender: (p?: TProps) => render(p), unmount };
}

describe('useDialogFocus (IMP-021)', () => {
  let listeners: Record<string, (e: any) => void>;
  let originalDocument: any;
  let mockElement1: any;
  let mockElement2: any;
  let mockDialog: any;

  beforeEach(() => {
    listeners = {};
    originalDocument = (globalThis as any).document;

    mockElement1 = {
      focus: vi.fn(() => { (globalThis as any).document.activeElement = mockElement1; }),
    };
    mockElement2 = {
      focus: vi.fn(() => { (globalThis as any).document.activeElement = mockElement2; }),
    };

    mockDialog = {
      focus: vi.fn(() => { (globalThis as any).document.activeElement = mockDialog; }),
      querySelectorAll: vi.fn(() => [mockElement1, mockElement2]),
    };

    (globalThis as any).document = {
      activeElement: null,
      addEventListener: vi.fn((type: string, cb: any) => {
        listeners[type] = cb;
      }),
      removeEventListener: vi.fn((type: string) => {
        delete listeners[type];
      }),
    };
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
  });

  it('sets initial focus on first focusable element when opened', () => {
    const dialogRef = { current: mockDialog };
    const { unmount } = renderHookWithEffects(() => useDialogFocus(true, dialogRef));

    expect(mockElement1.focus).toHaveBeenCalled();
    unmount();
  });

  it('triggers onEscape callback when Escape is pressed', () => {
    const onEscape = vi.fn();
    const dialogRef = { current: mockDialog };
    const { unmount } = renderHookWithEffects(
      (props) => useDialogFocus(props.isOpen, props.dialogRef, undefined, props.onEscape),
      { initialProps: { isOpen: true, dialogRef, onEscape } }
    );

    expect(listeners['keydown']).toBeDefined();

    const preventDefault = vi.fn();
    listeners['keydown']({ key: 'Escape', preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(onEscape).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('does not attach keydown listener when isOpen is false', () => {
    const onEscape = vi.fn();
    const dialogRef = { current: mockDialog };
    const { unmount } = renderHookWithEffects(
      (props) => useDialogFocus(props.isOpen, props.dialogRef, undefined, props.onEscape),
      { initialProps: { isOpen: false, dialogRef, onEscape } }
    );

    expect(listeners['keydown']).toBeUndefined();
    unmount();
  });

  it('cycles focus from last element to first on Tab press', () => {
    const dialogRef = { current: mockDialog };
    const { unmount } = renderHookWithEffects(() => useDialogFocus(true, dialogRef));

    // Active element is the last one
    (globalThis as any).document.activeElement = mockElement2;

    const preventDefault = vi.fn();
    listeners['keydown']({
      key: 'Tab',
      shiftKey: false,
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(mockElement1.focus).toHaveBeenCalled();

    unmount();
  });

  it('cycles focus from first element to last on Shift+Tab press', () => {
    const dialogRef = { current: mockDialog };
    const { unmount } = renderHookWithEffects(() => useDialogFocus(true, dialogRef));

    // Active element is the first one
    (globalThis as any).document.activeElement = mockElement1;

    const preventDefault = vi.fn();
    listeners['keydown']({
      key: 'Tab',
      shiftKey: true,
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(mockElement2.focus).toHaveBeenCalled();

    unmount();
  });
});

