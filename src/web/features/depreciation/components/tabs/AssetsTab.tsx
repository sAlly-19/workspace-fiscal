import React from 'react';
import {
  Calendar, Plus, Search, X, RotateCcw,
  ArchiveRestore, Archive, Edit2, Trash2, Eye
} from 'lucide-react';
import { formatCentsBRL, formatDateBR } from '../../utils/formatters';

export type AssetSortField = 'supplier' | 'documentNumber' | 'category' | 'acquisitionValue' | 'annualRate' | 'acquisitionDate';
export type SortDirection = 'asc' | 'desc';

export interface AssetsTabProps {
  isLight: boolean;
  totalAssetsCount: number;
  filteredAssets: any[];
  filteredTotalValue: number;
  selectedAssetIds: Set<string>;
  setSelectedAssetIds: (ids: Set<string>) => void;
  searchAssets: string;
  setSearchAssets: (s: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  statusFilter: 'ALL' | 'ACTIVE' | 'DISPOSED';
  setStatusFilter: (s: 'ALL' | 'ACTIVE' | 'DISPOSED') => void;
  yearFilter: string;
  setYearFilter: (y: string) => void;
  availableYears: string[];
  categories: any[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onToggleSort: (field: AssetSortField) => void;
  renderSortIndicator: (field: AssetSortField) => React.ReactNode;
  onOpenNewAsset: () => void;
  onOpenRetroBatch: () => void;
  onOpenAssetHistory: (asset: any) => void;
  onOpenEditAsset: (asset: any) => void;
  onOpenDispose: (asset: any) => void;
  onOpenReactivate: (asset: any) => void;
  onConfirmDelete: (asset: any) => void;
}

export function AssetsTab({
  isLight,
  totalAssetsCount,
  filteredAssets,
  filteredTotalValue,
  selectedAssetIds,
  setSelectedAssetIds,
  searchAssets,
  setSearchAssets,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  yearFilter,
  setYearFilter,
  availableYears,
  categories,
  hasActiveFilters,
  onResetFilters,
  onToggleSort,
  renderSortIndicator,
  onOpenNewAsset,
  onOpenRetroBatch,
  onOpenAssetHistory,
  onOpenEditAsset,
  onOpenDispose,
  onOpenReactivate,
  onConfirmDelete,
}: AssetsTabProps) {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className={`text-sm font-black ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Bens / Notas Fiscais</h2>
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
            {filteredAssets.length} de {totalAssetsCount} {totalAssetsCount === 1 ? 'bem' : 'bens'}
          </span>
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-semibold border ${isLight ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
            Total: {formatCentsBRL(filteredTotalValue)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedAssetIds.size > 0 && (
            <button onClick={onOpenRetroBatch} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs">
              <Calendar className="w-3.5 h-3.5" /> Depreciar Retroativa ({selectedAssetIds.size})
            </button>
          )}
          <button onClick={onOpenNewAsset} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"><Plus className="w-3.5 h-3.5" /> Novo bem</button>
        </div>
      </div>

      {/* Barra de Filtros e Ordenação */}
      <div className={`p-3 rounded-xl border flex flex-wrap items-center gap-2.5 ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#141418] border-[#27272a]'}`}>
        {/* Campo de Busca com botão de limpar */}
        <div className="relative min-w-[220px] flex-1">
          <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-[#94a3b8]' : 'text-[#71717a]'}`} />
          <input
            value={searchAssets}
            onChange={(e) => setSearchAssets(e.target.value)}
            placeholder="Buscar por fornecedor, NF, descrição..."
            className={`w-full pl-8 pr-7 py-1.5 rounded-lg border text-xs ${isLight ? 'bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`}
          />
          {searchAssets && (
            <button
              onClick={() => setSearchAssets('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtro de Categoria */}
        <div className="flex items-center gap-1">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer ${isLight ? 'bg-white border-[#cbd5e1] text-[#334155]' : 'bg-[#09090b] border-[#3f3f46] text-[#d4d4d8]'}`}
          >
            <option value="ALL">Todas as categorias</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value="NONE">Sem categoria</option>
          </select>
        </div>

        {/* Filtro de Status */}
        <div className="flex items-center gap-1">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer ${isLight ? 'bg-white border-[#cbd5e1] text-[#334155]' : 'bg-[#09090b] border-[#3f3f46] text-[#d4d4d8]'}`}
          >
            <option value="ALL">Todos os status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="DISPOSED">Baixados</option>
          </select>
        </div>

        {/* Filtro de Ano de Aquisição */}
        {availableYears.length > 0 && (
          <div className="flex items-center gap-1">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer ${isLight ? 'bg-white border-[#cbd5e1] text-[#334155]' : 'bg-[#09090b] border-[#3f3f46] text-[#d4d4d8]'}`}
            >
              <option value="ALL">Todos os anos</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {/* Botão Limpar Filtros */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
            }`}
            title="Limpar todos os filtros"
          >
            <RotateCcw className="w-3 h-3" /> Limpar filtros
          </button>
        )}
      </div>

      <div className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
        <table className="w-full text-xs">
          <thead className={`${isLight ? 'bg-[#f1f5f9] text-[#475569]' : 'bg-[#18181b] text-[#a1a1aa]'}`}>
            <tr>
              <th className="px-3 py-2.5 w-8">
                <input
                  type="checkbox"
                  checked={filteredAssets.length > 0 && filteredAssets.every((a: any) => selectedAssetIds.has(a.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAssetIds(new Set(filteredAssets.map((a: any) => a.id)));
                    } else {
                      setSelectedAssetIds(new Set());
                    }
                  }}
                  className="w-3.5 h-3.5 cursor-pointer"
                />
              </th>
              <th
                onClick={() => onToggleSort('supplier')}
                className="text-left px-3 py-2.5 cursor-pointer hover:text-blue-500 transition-colors select-none font-bold"
                title="Ordenar por Fornecedor"
              >
                <span className="inline-flex items-center gap-1">Fornecedor {renderSortIndicator('supplier')}</span>
              </th>
              <th
                onClick={() => onToggleSort('documentNumber')}
                className="text-left px-3 py-2.5 cursor-pointer hover:text-blue-500 transition-colors select-none font-bold"
                title="Ordenar por NF / Descrição"
              >
                <span className="inline-flex items-center gap-1">NF / Descrição {renderSortIndicator('documentNumber')}</span>
              </th>
              <th
                onClick={() => onToggleSort('acquisitionDate')}
                className="text-left px-3 py-2.5 cursor-pointer hover:text-blue-500 transition-colors select-none font-bold"
                title="Ordenar por Data de Aquisição"
              >
                <span className="inline-flex items-center gap-1">Aquisição {renderSortIndicator('acquisitionDate')}</span>
              </th>
              <th
                onClick={() => onToggleSort('category')}
                className="text-left px-3 py-2.5 cursor-pointer hover:text-blue-500 transition-colors select-none font-bold"
                title="Ordenar por Categoria"
              >
                <span className="inline-flex items-center gap-1">Categoria {renderSortIndicator('category')}</span>
              </th>
              <th
                onClick={() => onToggleSort('acquisitionValue')}
                className="text-right px-3 py-2.5 cursor-pointer hover:text-blue-500 transition-colors select-none font-bold"
                title="Ordenar por Valor"
              >
                <span className="inline-flex items-center justify-end gap-1">Valor {renderSortIndicator('acquisitionValue')}</span>
              </th>
              <th
                onClick={() => onToggleSort('annualRate')}
                className="text-center px-3 py-2.5 cursor-pointer hover:text-blue-500 transition-colors select-none font-bold"
                title="Ordenar por Taxa Anual"
              >
                <span className="inline-flex items-center justify-center gap-1">Taxa {renderSortIndicator('annualRate')}</span>
              </th>
              <th className="text-right px-3 py-2.5 font-bold">Ações</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isLight ? 'divide-[#e2e8f0]' : 'divide-[#27272a]'}`}>
            {filteredAssets.map((a: any) => (
              <tr
                key={a.id}
                onClick={() => {
                  setSelectedAssetIds(new Set(
                    selectedAssetIds.has(a.id)
                      ? Array.from(selectedAssetIds).filter((id) => id !== a.id)
                      : [...Array.from(selectedAssetIds), a.id]
                  ));
                }}
                className={`cursor-pointer transition-colors ${
                  selectedAssetIds.has(a.id)
                    ? (isLight ? 'bg-blue-50/80 hover:bg-blue-100/80' : 'bg-blue-950/30 hover:bg-blue-900/40')
                    : (isLight ? 'hover:bg-[#f8fafc]' : 'hover:bg-white/[0.02]')
                }`}
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedAssetIds.has(a.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAssetIds(new Set([...Array.from(selectedAssetIds), a.id]));
                      } else {
                        setSelectedAssetIds(new Set(Array.from(selectedAssetIds).filter((id) => id !== a.id)));
                      }
                    }}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2 font-medium">{a.supplier}</td>
                <td className="px-3 py-2">
                  <div className="font-mono font-bold">NF {a.documentNumber}</div>
                  <div className={`text-[11px] truncate max-w-[240px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>{a.description}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-[11px] font-mono opacity-80">
                  {a.acquisitionDate ? formatDateBR(a.acquisitionDate) : '—'}
                </td>
                <td className="px-3 py-2">{a.categoryName || '—'}</td>
                <td className="px-3 py-2 text-right font-bold font-mono">{formatCentsBRL(a.acquisitionValue)}</td>
                <td className="px-3 py-2 text-center">{a.annualRate}%</td>
                <td className="px-3 py-2 text-right flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  {a.status === 'DISPOSED' ? (
                    <>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>Baixado</span>
                      <button onClick={() => onOpenReactivate(a)} className={`p-1.5 rounded border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0] hover:bg-emerald-50' : 'bg-[#18181b] border-[#3f3f46] hover:bg-emerald-500/10'} text-emerald-600`} title="Reativar"><ArchiveRestore className="w-3 h-3" /></button>
                    </>
                  ) : (
                    <button onClick={() => onOpenDispose(a)} className={`p-1.5 rounded border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0] hover:bg-amber-50' : 'bg-[#18181b] border-[#3f3f46] hover:bg-amber-500/10'} text-amber-600`} title="Dar Baixa"><Archive className="w-3 h-3" /></button>
                  )}
                  <button onClick={() => onOpenEditAsset(a)} className={`p-1.5 rounded border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0] hover:bg-[#f1f5f9]' : 'bg-[#18181b] border-[#3f3f46] hover:bg-[#27272a]'}`} title="Editar bem"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => onConfirmDelete(a)} className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 cursor-pointer" title="Excluir"><Trash2 className="w-3 h-3" /></button>
                  <button onClick={() => onOpenAssetHistory(a)} className={`p-1.5 rounded border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#18181b] border-[#3f3f46]'}`} title="Ver histórico"><Eye className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
            {filteredAssets.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#71717a]">
                  {hasActiveFilters ? (
                    <span>
                      Nenhum bem encontrado para os filtros selecionados.{' '}
                      <button onClick={onResetFilters} className="text-blue-500 underline ml-1 cursor-pointer font-semibold">
                        Limpar filtros
                      </button>
                    </span>
                  ) : (
                    'Nenhum bem cadastrado'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
