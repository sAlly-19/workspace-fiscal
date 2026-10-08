import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { useSefazSync, UseSefazSyncOptions } from './useSefazSync';
import type { Company, CertificateInfo } from '@/core/buscador/domain/types';

function renderHook<TProps, TResult>(
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
      const setState = (action: any) => {
        hooks[idx] = typeof action === 'function' ? action(hooks[idx]) : action;
        render();
      };
      return [hooks[idx], setState];
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
    useRef(initial: any) {
      const idx = hookIndex++;
      if (hooks[idx] === undefined) {
        hooks[idx] = { current: initial };
      }
      return hooks[idx];
    },
    useSyncExternalStore(subscribe: any, getSnapshot: () => any) {
      return getSnapshot();
    },
    useDebugValue() {},
    useEffect() {},
    useLayoutEffect() {},
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

  render();

  return {
    result,
    rerender: (newProps?: TProps) => render(newProps),
  };
}

describe('useSefazSync hook', () => {
  const mockCompany: Company = {
    id: 1,
    name: 'Empresa Teste',
    cnpj: '12345678000195',
    uf: 'SP',
    is_active: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const mockCert: CertificateInfo = {
    id: 10,
    company_id: 1,
    subject: 'CN=Empresa Teste',
    issuer: 'Autoridade Certificadora',
    serial_number: '123456',
    thumbprint: 'abcdef',
    valid_from: '2025-01-01',
    valid_to: '2027-01-01',
    provider: 'windows_store',
    has_private_key: true,
    is_expired: false,
  };

  const loadCompanyContext = vi.fn().mockResolvedValue(undefined);
  const onOpenCertModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).window = globalThis;
    (globalThis as any).window.fiscalApi = {
      sefaz: {
        getStatus: vi.fn().mockResolvedValue({ nfeLastNSU: '0', cteLastNSU: '0' }),
        consultDocuments: vi.fn().mockResolvedValue({}),
        cancelQuery: vi.fn().mockResolvedValue(undefined),
        resetNSU: vi.fn().mockResolvedValue(undefined),
        onProgress: vi.fn().mockReturnValue(() => {}),
      },
    };
  });

  it('initializes with default SEFAZ state', () => {
    const { result } = renderHook(() =>
      useSefazSync({
        activeCompany: mockCompany,
        companyCert: mockCert,
        loadCompanyContext,
        onOpenCertModal,
      })
    );

    expect(result.current.isSefazModalOpen).toBe(false);
    expect(result.current.pendingNsuReset).toBeNull();
    expect(result.current.isResettingNsu).toBe(false);
    expect(result.current.synchronizingType).toBeNull();
    expect(result.current.activeConsultType).toBe('NF-e');
  });

  it('triggers cert modal when certificate is missing during sync', async () => {
    const { result } = renderHook(() =>
      useSefazSync({
        activeCompany: mockCompany,
        companyCert: null,
        loadCompanyContext,
        onOpenCertModal,
      })
    );

    await result.current.handleConsultSefaz();

    expect(onOpenCertModal).toHaveBeenCalled();
    expect(result.current.isSefazModalOpen).toBe(false);
  });

  it('sets and clears pending NSU reset', () => {
    const { result } = renderHook(() =>
      useSefazSync({
        activeCompany: mockCompany,
        companyCert: mockCert,
        loadCompanyContext,
        onOpenCertModal,
      })
    );

    result.current.handleResetNSU('CTE');
    expect(result.current.pendingNsuReset).toBe('CTE');

    result.current.setPendingNsuReset(null);
    expect(result.current.pendingNsuReset).toBeNull();
  });

  it('confirms NSU reset and reloads company context', async () => {
    const { result } = renderHook(() =>
      useSefazSync({
        activeCompany: mockCompany,
        companyCert: mockCert,
        loadCompanyContext,
        onOpenCertModal,
      })
    );

    result.current.handleResetNSU('NFE');
    await result.current.handleConfirmResetNSU();

    expect((window as any).fiscalApi.sefaz.resetNSU).toHaveBeenCalledWith(1, 'NFE');
    expect(loadCompanyContext).toHaveBeenCalledWith(mockCompany);
    expect(result.current.pendingNsuReset).toBeNull();
  });
});
