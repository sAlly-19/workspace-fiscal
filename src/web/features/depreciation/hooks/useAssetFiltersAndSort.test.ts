import { describe, it, expect } from 'vitest';
import React from 'react';
import { useAssetFiltersAndSort } from './useAssetFiltersAndSort';

/**
 * Lightweight hook harness for testing React hooks in a Node test environment
 * without external DOM dependencies.
 */
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
  };

  function render(newProps?: TProps) {
    if (newProps !== undefined) currentProps = newProps;
    hookIndex = 0;
    const prevDispatcher = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?.H;
    (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H = dispatcher;
    try {
      result.current = hookFn(currentProps as TProps);
    } finally {
      (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H = prevDispatcher;
    }
  }

  render();

  return {
    result,
    rerender: (newProps?: TProps) => render(newProps),
  };
}

const mockAssets = [
  {
    id: '1',
    companyId: 'comp-1',
    supplier: 'Dell Computadores',
    acquisitionDate: '2023-05-10',
    documentNumber: 'NF-1001',
    description: 'Notebook Latitude',
    acquisitionValue: 500000, // R$ 5.000,00
    categoryId: 'cat-it',
    categoryName: 'Informática',
    annualRate: 20,
    status: 'ACTIVE' as const,
  },
  {
    id: '2',
    companyId: 'comp-1',
    supplier: 'Herman Miller',
    acquisitionDate: '2022-01-15',
    documentNumber: 'NF-2002',
    description: 'Cadeira Ergonômica',
    acquisitionValue: 250000, // R$ 2.500,00
    categoryId: 'cat-furn',
    categoryName: 'Móveis',
    annualRate: 10,
    status: 'ACTIVE' as const,
  },
  {
    id: '3',
    companyId: 'comp-1',
    supplier: 'Apple Inc',
    acquisitionDate: '2024-11-20',
    documentNumber: 'NF-3003',
    description: 'MacBook Pro',
    acquisitionValue: 1200000, // R$ 12.000,00
    categoryId: null,
    categoryName: null,
    annualRate: 20,
    status: 'DISPOSED' as const,
  },
  {
    id: '4',
    companyId: 'comp-1',
    supplier: 'Auto Mecânica Silva',
    acquisitionDate: '2023-09-01',
    documentNumber: 'NF-4004',
    description: 'Veículo Utilitário',
    acquisitionValue: 8000000, // R$ 80.000,00
    categoryId: 'cat-veh',
    categoryName: 'Veículos',
    annualRate: 25,
    status: 'ACTIVE' as const,
  },
];

describe('useAssetFiltersAndSort', () => {
  it('inicializa com os estados padrão e extrai os anos disponíveis corretamente', () => {
    const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

    expect(result.current.searchAssets).toBe('');
    expect(result.current.categoryFilter).toBe('ALL');
    expect(result.current.statusFilter).toBe('ALL');
    expect(result.current.yearFilter).toBe('ALL');
    expect(result.current.sortField).toBe('acquisitionDate');
    expect(result.current.sortDirection).toBe('desc');
    expect(result.current.hasActiveFilters).toBe(false);

    // Anos únicos ordenados decrescente
    expect(result.current.availableYears).toEqual(['2024', '2023', '2022']);

    // Total de valor somado de todos os bens (500000 + 250000 + 1200000 + 8000000)
    expect(result.current.filteredTotalValue).toBe(9950000);

    // Ordenação padrão: acquisitionDate desc
    expect(result.current.filteredAssets.map((a: any) => a.id)).toEqual(['3', '4', '1', '2']);
  });

  it('lida com lista de bens vazia e valores inválidos de data', () => {
    const assetsWithInvalidDates = [
      { id: '1', acquisitionDate: '' },
      { id: '2', acquisitionDate: 'invalid-date' },
      { id: '3' },
    ];
    const { result } = renderHook(() => useAssetFiltersAndSort(assetsWithInvalidDates as any));

    expect(result.current.availableYears).toEqual([]);
    expect(result.current.filteredAssets).toHaveLength(3);
    expect(result.current.filteredTotalValue).toBe(0);
  });

  describe('Filtro por busca de texto (searchAssets)', () => {
    it('filtra por fornecedor (supplier) ignorando maiúsculas/minúsculas', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setSearchAssets('dell');
      expect(result.current.hasActiveFilters).toBe(true);
      expect(result.current.filteredAssets).toHaveLength(1);
      expect(result.current.filteredAssets[0].id).toBe('1');
      expect(result.current.filteredTotalValue).toBe(500000);
    });

    it('filtra por descrição (description)', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setSearchAssets('cadeira');
      expect(result.current.filteredAssets).toHaveLength(1);
      expect(result.current.filteredAssets[0].id).toBe('2');
    });

    it('filtra por número do documento (documentNumber)', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setSearchAssets('3003');
      expect(result.current.filteredAssets).toHaveLength(1);
      expect(result.current.filteredAssets[0].id).toBe('3');
    });

    it('retorna lista vazia se nenhum bem corresponder à busca', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setSearchAssets('termo inexistente');
      expect(result.current.filteredAssets).toHaveLength(0);
      expect(result.current.filteredTotalValue).toBe(0);
    });
  });

  describe('Filtro por categoria (categoryFilter)', () => {
    it('filtra por id de categoria específico', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setCategoryFilter('cat-it');
      expect(result.current.hasActiveFilters).toBe(true);
      expect(result.current.filteredAssets).toHaveLength(1);
      expect(result.current.filteredAssets[0].id).toBe('1');
    });

    it('filtra bens sem categoria definida (NONE)', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setCategoryFilter('NONE');
      expect(result.current.hasActiveFilters).toBe(true);
      expect(result.current.filteredAssets).toHaveLength(1);
      expect(result.current.filteredAssets[0].id).toBe('3');
    });

    it('retorna todos quando categoryFilter for ALL', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setCategoryFilter('cat-it');
      expect(result.current.filteredAssets).toHaveLength(1);

      result.current.setCategoryFilter('ALL');
      expect(result.current.filteredAssets).toHaveLength(4);
    });
  });

  describe('Filtro por status (statusFilter)', () => {
    it('filtra apenas bens ativos (ACTIVE)', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setStatusFilter('ACTIVE');
      expect(result.current.hasActiveFilters).toBe(true);
      expect(result.current.filteredAssets.map((a: any) => a.id)).toEqual(['4', '1', '2']);
    });

    it('filtra apenas bens baixados (DISPOSED)', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setStatusFilter('DISPOSED');
      expect(result.current.hasActiveFilters).toBe(true);
      expect(result.current.filteredAssets.map((a: any) => a.id)).toEqual(['3']);
      expect(result.current.filteredTotalValue).toBe(1200000);
    });

    it('retorna todos os bens quando statusFilter for ALL', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setStatusFilter('ACTIVE');
      expect(result.current.filteredAssets).toHaveLength(3);

      result.current.setStatusFilter('ALL');
      expect(result.current.filteredAssets).toHaveLength(4);
    });
  });

  describe('Filtro por ano de aquisição (yearFilter)', () => {
    it('filtra bens por ano de aquisição específico', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setYearFilter('2023');
      expect(result.current.hasActiveFilters).toBe(true);
      expect(result.current.filteredAssets.map((a: any) => a.id)).toEqual(['4', '1']);
      expect(result.current.filteredTotalValue).toBe(8500000);
    });

    it('retorna vazio se o ano filtrado não tiver bens', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setYearFilter('2019');
      expect(result.current.filteredAssets).toHaveLength(0);
    });
  });

  describe('Ordenação e alternância de ordenação (sortField, sortDirection, handleToggleSort)', () => {
    it('ordena por acquisitionValue em ordem ascendente e descendente', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setSortField('acquisitionValue');
      result.current.setSortDirection('asc');
      expect(result.current.filteredAssets.map((a: any) => a.id)).toEqual(['2', '1', '3', '4']);

      result.current.setSortDirection('desc');
      expect(result.current.filteredAssets.map((a: any) => a.id)).toEqual(['4', '3', '1', '2']);
    });

    it('ordena por supplier em ordem alfabética asc e desc com pt-BR locale', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setSortField('supplier');
      result.current.setSortDirection('asc');
      expect(result.current.filteredAssets.map((a: any) => a.id)).toEqual(['3', '4', '1', '2']);

      result.current.setSortDirection('desc');
      expect(result.current.filteredAssets.map((a: any) => a.id)).toEqual(['2', '1', '4', '3']);
    });

    it('ordena por documentNumber numericamente asc e desc', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setSortField('documentNumber');
      result.current.setSortDirection('asc');
      expect(result.current.filteredAssets.map((a: any) => a.id)).toEqual(['1', '2', '3', '4']);

      result.current.setSortDirection('desc');
      expect(result.current.filteredAssets.map((a: any) => a.id)).toEqual(['4', '3', '2', '1']);
    });

    it('ordena por category asc e desc', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setSortField('category');
      result.current.setSortDirection('asc');
      // Categorias: null (''), 'Informática', 'Móveis', 'Veículos'
      expect(result.current.filteredAssets.map((a: any) => a.id)).toEqual(['3', '1', '2', '4']);

      result.current.setSortDirection('desc');
      expect(result.current.filteredAssets.map((a: any) => a.id)).toEqual(['4', '2', '1', '3']);
    });

    it('ordena por annualRate asc e desc', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setSortField('annualRate');
      result.current.setSortDirection('asc');
      // Taxas: 10 (id 2), 20 (id 1, 3), 25 (id 4)
      expect(result.current.filteredAssets[0].id).toBe('2');
      expect(result.current.filteredAssets[3].id).toBe('4');

      result.current.setSortDirection('desc');
      expect(result.current.filteredAssets[0].id).toBe('4');
      expect(result.current.filteredAssets[3].id).toBe('2');
    });

    it('alterna ordenação com handleToggleSort', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      // Campo atual é acquisitionDate com desc
      expect(result.current.sortField).toBe('acquisitionDate');
      expect(result.current.sortDirection).toBe('desc');

      // Clicar no mesmo campo inverte a direção para asc
      result.current.handleToggleSort('acquisitionDate');
      expect(result.current.sortField).toBe('acquisitionDate');
      expect(result.current.sortDirection).toBe('asc');

      // Clicar em um campo diferente muda o campo e define asc
      result.current.handleToggleSort('supplier');
      expect(result.current.sortField).toBe('supplier');
      expect(result.current.sortDirection).toBe('asc');

      // Clicar novamente no mesmo campo inverte para desc
      result.current.handleToggleSort('supplier');
      expect(result.current.sortField).toBe('supplier');
      expect(result.current.sortDirection).toBe('desc');
    });

    it('renderiza os indicadores de ordenação com renderSortIndicator', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      // Inicial: acquisitionDate é desc -> indicador deve ser ArrowDown
      const activeDesc = result.current.renderSortIndicator('acquisitionDate') as React.ReactElement<any>;
      expect(activeDesc.props.className).toContain('text-blue-500');

      // Inverte para asc -> indicador deve ser ArrowUp
      result.current.handleToggleSort('acquisitionDate');
      const activeAsc = result.current.renderSortIndicator('acquisitionDate') as React.ReactElement<any>;
      expect(activeAsc.props.className).toContain('text-blue-500');

      // Campo inativo -> indicador deve ser ArrowUpDown (opacity-40)
      const inactive = result.current.renderSortIndicator('supplier') as React.ReactElement<any>;
      expect(inactive.props.className).toContain('opacity-40');
    });
  });

  describe('Resetar filtros (handleResetFilters)', () => {
    it('restaura todos os filtros para os valores padrões', () => {
      const { result } = renderHook(() => useAssetFiltersAndSort(mockAssets));

      result.current.setSearchAssets('Dell');
      result.current.setCategoryFilter('cat-it');
      result.current.setStatusFilter('ACTIVE');
      result.current.setYearFilter('2023');
      expect(result.current.hasActiveFilters).toBe(true);

      result.current.handleResetFilters();

      expect(result.current.searchAssets).toBe('');
      expect(result.current.categoryFilter).toBe('ALL');
      expect(result.current.statusFilter).toBe('ALL');
      expect(result.current.yearFilter).toBe('ALL');
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.filteredAssets).toHaveLength(4);
    });
  });
});
