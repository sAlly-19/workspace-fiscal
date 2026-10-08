import React, { useState, useMemo, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { AssetSortField, SortDirection } from '../components';

export type { AssetSortField, SortDirection };

export interface UseAssetFiltersAndSortReturn<T = any> {
  searchAssets: string;
  setSearchAssets: React.Dispatch<React.SetStateAction<string>>;
  categoryFilter: string;
  setCategoryFilter: React.Dispatch<React.SetStateAction<string>>;
  statusFilter: 'ALL' | 'ACTIVE' | 'DISPOSED';
  setStatusFilter: React.Dispatch<React.SetStateAction<'ALL' | 'ACTIVE' | 'DISPOSED'>>;
  yearFilter: string;
  setYearFilter: React.Dispatch<React.SetStateAction<string>>;
  sortField: AssetSortField;
  setSortField: React.Dispatch<React.SetStateAction<AssetSortField>>;
  sortDirection: SortDirection;
  setSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
  availableYears: string[];
  filteredAssets: T[];
  filteredTotalValue: number;
  hasActiveFilters: boolean;
  handleResetFilters: () => void;
  handleToggleSort: (field: AssetSortField) => void;
  renderSortIndicator: (field: AssetSortField) => React.ReactNode;
}

export function useAssetFiltersAndSort<T = any>(assets: T[] = []): UseAssetFiltersAndSortReturn<T> {
  const [searchAssets, setSearchAssets] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISPOSED'>('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sortField, setSortField] = useState<AssetSortField>('acquisitionDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    (assets || []).forEach((a: any) => {
      if (a.acquisitionDate) {
        const y = a.acquisitionDate.slice(0, 4);
        if (y && !isNaN(Number(y))) years.add(y);
      }
    });
    return Array.from(years).sort().reverse();
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const list = (assets || []).filter((a: any) => {
      if (searchAssets.trim()) {
        const q = searchAssets.toLowerCase().trim();
        const matchSupplier = a.supplier?.toLowerCase().includes(q);
        const matchDesc = a.description?.toLowerCase().includes(q);
        const matchDoc = a.documentNumber?.toLowerCase().includes(q);
        if (!matchSupplier && !matchDesc && !matchDoc) return false;
      }
      if (categoryFilter !== 'ALL') {
        if (categoryFilter === 'NONE') {
          if (a.categoryId) return false;
        } else if (a.categoryId !== categoryFilter) {
          return false;
        }
      }
      if (statusFilter !== 'ALL') {
        const assetStatus = a.status === 'DISPOSED' ? 'DISPOSED' : 'ACTIVE';
        if (assetStatus !== statusFilter) return false;
      }
      if (yearFilter !== 'ALL') {
        if (!a.acquisitionDate || !a.acquisitionDate.startsWith(yearFilter)) return false;
      }
      return true;
    });

    return [...list].sort((a: any, b: any) => {
      let comparison = 0;
      switch (sortField) {
        case 'supplier':
          comparison = (a.supplier || '').localeCompare(b.supplier || '', 'pt-BR', { sensitivity: 'base' });
          break;
        case 'documentNumber':
          comparison = (a.documentNumber || '').localeCompare(b.documentNumber || '', undefined, { numeric: true });
          break;
        case 'category':
          comparison = (a.categoryName || '').localeCompare(b.categoryName || '', 'pt-BR', { sensitivity: 'base' });
          break;
        case 'acquisitionValue':
          comparison = (a.acquisitionValue || 0) - (b.acquisitionValue || 0);
          break;
        case 'annualRate':
          comparison = (a.annualRate || 0) - (b.annualRate || 0);
          break;
        case 'acquisitionDate':
          comparison = (a.acquisitionDate || '').localeCompare(b.acquisitionDate || '');
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [assets, searchAssets, categoryFilter, statusFilter, yearFilter, sortField, sortDirection]);

  const filteredTotalValue = useMemo(() => {
    return filteredAssets.reduce((acc: number, a: any) => acc + (a.acquisitionValue || 0), 0);
  }, [filteredAssets]);

  const hasActiveFilters = Boolean(
    searchAssets.trim() || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || yearFilter !== 'ALL'
  );

  const handleResetFilters = useCallback(() => {
    setSearchAssets('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setYearFilter('ALL');
  }, []);

  const handleToggleSort = useCallback((field: AssetSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const renderSortIndicator = useCallback((field: AssetSortField) => {
    if (sortField !== field) {
      return React.createElement(ArrowUpDown, { className: 'w-3 h-3 opacity-40 ml-1 inline-block' });
    }
    return sortDirection === 'asc'
      ? React.createElement(ArrowUp, { className: 'w-3 h-3 text-blue-500 ml-1 inline-block' })
      : React.createElement(ArrowDown, { className: 'w-3 h-3 text-blue-500 ml-1 inline-block' });
  }, [sortField, sortDirection]);

  return {
    searchAssets,
    setSearchAssets,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    yearFilter,
    setYearFilter,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    availableYears,
    filteredAssets,
    filteredTotalValue,
    hasActiveFilters,
    handleResetFilters,
    handleToggleSort,
    renderSortIndicator,
  };
}
