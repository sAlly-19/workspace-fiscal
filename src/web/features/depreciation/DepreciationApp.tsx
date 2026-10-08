import { useEffect, useState, useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useDepreciationStore } from '../../stores/depreciation.store';
import { apiFetch } from '../../lib/api';
import { TitleBar } from '../../components/TitleBar';
import { ToastHost, toast } from '../../components/Toast';
import { SettingsModal } from '../../components/SettingsModal';
import { DepreciationSplashScreen } from './DepreciationSplashScreen';
import {
  CsvExportOptions,
  DEFAULT_USER_MAPPING,
  ALL_FIELDS,
  ColumnMappingItem,
} from './CsvLayoutModal';
import {
  DashboardTab,
  AssetsTab,
  CompaniesTab,
  CategoriesTab,
  DepreciationTopBar,
  DepreciationSidebar,
  DepreciationTab,
  DepreciationModals,
} from './components';
import { useAssetFiltersAndSort } from './hooks/useAssetFiltersAndSort';

export function DepreciationApp({ onBackToHome }: { onBackToHome?: () => void }) {
  const { settings, updateSettings } = useWorkspaceStore();
  const currentTheme = settings.theme || 'dark';
  const isLight = currentTheme === 'light';
  const {
    companies,
    selectedCompanyId,
    categories,
    assets,
    competence,
    fetchCompanies,
    selectCompany,
    createCompany,
    updateCompany,
    deleteCompany,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchAssets,
    createAsset,
    updateAsset,
    deleteAsset,
    disposeAsset,
    reactivateAsset,
    setCompetence,
  } = useDepreciationStore();

  const [tab, setTab] = useState<DepreciationTab>('dashboard');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  // Asset Filters and Sorting Hook
  const {
    searchAssets,
    setSearchAssets,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    yearFilter,
    setYearFilter,
    availableYears,
    filteredAssets,
    filteredTotalValue,
    hasActiveFilters,
    handleResetFilters,
    handleToggleSort,
    renderSortIndicator,
  } = useAssetFiltersAndSort(assets);

  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assetHistory, setAssetHistory] = useState<any>(null);
  const [monthly, setMonthly] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportConflict, setExportConflict] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'company' | 'asset' | 'category';
    id: string;
    name: string;
  } | null>(null);
  const [retroactivePrompt, setRetroactivePrompt] = useState<{
    asset: any;
    startComp: string;
    endComp: string;
    count: number;
  } | null>(null);
  const [isRetroGenerating, setIsRetroGenerating] = useState(false);
  const [disposeTarget, setDisposeTarget] = useState<any>(null);
  const [disposeDate, setDisposeDate] = useState(new Date().toISOString().slice(0, 10));
  const [disposeReason, setDisposeReason] = useState('');
  const [isDisposing, setIsDisposing] = useState(false);
  const [reactivateTarget, setReactivateTarget] = useState<any>(null);
  const [isReactivating, setIsReactivating] = useState(false);
  // F8: Depreciação retroativa em lote
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [showRetroBatchModal, setShowRetroBatchModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showCsvLayoutModal, setShowCsvLayoutModal] = useState(false);
  const [pendingExportOptions, setPendingExportOptions] = useState<CsvExportOptions | null>(null);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  // Initial loads
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);
  useEffect(() => {
    if (selectedCompanyId) {
      fetchCategories();
      fetchAssets();
    }
  }, [selectedCompanyId, fetchCategories, fetchAssets]);
  useEffect(() => {
    if (selectedCompanyId) {
      fetchDashboard();
      fetchMonthly();
    }
  }, [selectedCompanyId, competence]);

  async function fetchMonthly() {
    if (!selectedCompanyId) return;
    try {
      const res = await apiFetch(
        `/api/depreciation/monthly?companyId=${selectedCompanyId}&competence=${competence}`
      );
      if (res.ok) setMonthly(await res.json());
    } catch (e) {
      console.error(e);
    }
  }
  async function fetchDashboard() {
    if (!selectedCompanyId) return;
    try {
      const res = await apiFetch(`/api/depreciation/dashboard?companyId=${selectedCompanyId}`);
      if (res.ok) setDashboard(await res.json());
    } catch {}
  }

  async function handleExportWithOptions(options: CsvExportOptions, force = false) {
    if (!selectedCompanyId) return;
    setIsGenerating(true);
    try {
      const res = await apiFetch('/api/depreciation/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          competence,
          separator: options.separator,
          numericFormat: options.numericFormat,
          dateFormat: options.dateFormat,
          columns: options.columns,
          force,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        setExportConflict(data);
        setPendingExportOptions(options);
        setIsGenerating(false);
        return;
      }

      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();

      // Garante UTF-8 BOM (\uFEFF) para evitar que acentos fiquem corrompidos no Excel
      const csvContent = data.csv.startsWith('\uFEFF') ? data.csv : '\uFEFF' + data.csv;

      // Salva arquivo no Electron ou faz download no navegador
      if ((window as any).api?.saveFileDialog) {
        const save = await (window as any).api.saveFileDialog({
          defaultPath: data.filename,
          filters: [{ name: 'CSV', extensions: ['csv'] }],
        });
        if (!save.canceled && save.filePath) {
          await (window as any).api.writeFile(save.filePath, csvContent);
          toast.success('Arquivo exportado', `Salvo em ${save.filePath}`);
        }
      } else {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Arquivo exportado', `Download de ${data.filename} concluído`);
      }

      setExportConflict(null);
      setPendingExportOptions(null);
      setShowCsvLayoutModal(false);
      fetchMonthly();
      fetchDashboard();
    } catch (e: any) {
      toast.error('Erro na exportação', e.message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleExportDirectly() {
    let exportOptions: CsvExportOptions = {
      separator: ';',
      numericFormat: 'RAW',
      dateFormat: 'DD/MM/YYYY',
      columns: DEFAULT_USER_MAPPING,
    };
    try {
      const saved = localStorage.getItem('depreciation_csv_column_mapping_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        exportOptions = {
          separator: parsed.separator === ',' ? ',' : ';',
          numericFormat: parsed.numericFormat === 'BRL' ? 'BRL' : 'RAW',
          dateFormat: parsed.dateFormat === 'YYYY-MM-DD' ? 'YYYY-MM-DD' : 'DD/MM/YYYY',
          columns: Array.isArray(parsed.mappings)
            ? ALL_FIELDS.map((f) => {
                const match = parsed.mappings.find((m: ColumnMappingItem) => m.id === f.id);
                return match || { id: f.id, column: f.defaultCol, label: f.defaultLabel };
              })
            : DEFAULT_USER_MAPPING,
        };
      }
    } catch (e) {
      console.warn('Erro ao carregar layout salvo:', e);
    }
    await handleExportWithOptions(exportOptions, false);
  }

  async function openAssetHistory(asset: any) {
    setSelectedAsset(asset);
    try {
      const res = await apiFetch(`/api/depreciation/asset/${asset.id}/history`);
      if (res.ok) setAssetHistory(await res.json());
    } catch {}
  }

  const isElectron = typeof window !== 'undefined' && (window as any).api;

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden font-sans select-none theme-${
        isLight ? 'light' : 'dark'
      } ${isLight ? 'bg-[#f8fafc] text-[#0f172a]' : 'bg-[#09090b] text-white'}`}
      style={{ paddingTop: isElectron ? 36 : 0 }}
    >
      <TitleBar />
      {showSplash && <DepreciationSplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Header / TopBar */}
      <DepreciationTopBar
        onBackToHome={onBackToHome}
        selectedCompany={selectedCompany}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={(id) => selectCompany(id)}
        isLight={isLight}
        onUpdateTheme={(theme) => updateSettings({ theme })}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <DepreciationSidebar tab={tab} onSelectTab={setTab} isLight={isLight} />

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto ${isLight ? 'bg-[#eef2f7]' : 'bg-[#09090b]'}`}>
          {!selectedCompany && tab !== 'companies' ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <Building2 className={`w-12 h-12 mb-3 ${isLight ? 'text-[#cbd5e1]' : 'text-[#3f3f46]'}`} />
              <h3 className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                Nenhuma empresa cadastrada
              </h3>
              <p className={`text-xs mt-1 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                Crie uma empresa para começar a cadastrar bens.
              </p>
              <button
                onClick={() => setTab('companies')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                + Nova empresa
              </button>
            </div>
          ) : (
            <>
              {tab === 'dashboard' && (
                <DashboardTab
                  isLight={isLight}
                  competence={competence}
                  setCompetence={setCompetence}
                  dashboard={dashboard}
                  monthly={monthly}
                  totalAssetsCount={assets.length}
                  isGenerating={isGenerating}
                  onOpenCsvLayout={() => setShowCsvLayoutModal(true)}
                  onExportDirectly={handleExportDirectly}
                />
              )}

              {tab === 'assets' && (
                <AssetsTab
                  isLight={isLight}
                  totalAssetsCount={assets.length}
                  filteredAssets={filteredAssets}
                  filteredTotalValue={filteredTotalValue}
                  selectedAssetIds={selectedAssetIds}
                  setSelectedAssetIds={setSelectedAssetIds}
                  searchAssets={searchAssets}
                  setSearchAssets={setSearchAssets}
                  categoryFilter={categoryFilter}
                  setCategoryFilter={setCategoryFilter}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  yearFilter={yearFilter}
                  setYearFilter={setYearFilter}
                  availableYears={availableYears}
                  categories={categories}
                  hasActiveFilters={hasActiveFilters}
                  onResetFilters={handleResetFilters}
                  onToggleSort={handleToggleSort}
                  renderSortIndicator={renderSortIndicator}
                  onOpenNewAsset={() => {
                    setEditingAsset(null);
                    setShowAssetModal(true);
                  }}
                  onOpenRetroBatch={() => setShowRetroBatchModal(true)}
                  onOpenAssetHistory={openAssetHistory}
                  onOpenEditAsset={(a) => {
                    setEditingAsset(a);
                    setShowAssetModal(true);
                  }}
                  onOpenDispose={(a) => {
                    setDisposeTarget(a);
                    setDisposeDate(new Date().toISOString().slice(0, 10));
                    setDisposeReason('');
                  }}
                  onOpenReactivate={(a) => setReactivateTarget(a)}
                  onConfirmDelete={(a) =>
                    setConfirmDelete({ type: 'asset', id: a.id, name: a.description })
                  }
                />
              )}

              {tab === 'companies' && (
                <CompaniesTab
                  isLight={isLight}
                  companies={companies}
                  selectedCompanyId={selectedCompanyId}
                  onSelectCompany={selectCompany}
                  onOpenNewCompany={() => {
                    setEditingCompany(null);
                    setShowCompanyModal(true);
                  }}
                  onOpenEditCompany={(c) => {
                    setEditingCompany(c);
                    setShowCompanyModal(true);
                  }}
                  onConfirmDeleteCompany={(c) =>
                    setConfirmDelete({ type: 'company', id: c.id, name: c.name })
                  }
                />
              )}

              {tab === 'categories' && (
                <CategoriesTab
                  isLight={isLight}
                  categories={categories}
                  onOpenNewCategory={() => {
                    setEditingCategory(null);
                    setShowCategoryModal(true);
                  }}
                  onOpenEditCategory={(cat) => {
                    setEditingCategory(cat);
                    setShowCategoryModal(true);
                  }}
                  onConfirmDeleteCategory={(cat) =>
                    setConfirmDelete({ type: 'category', id: cat.id, name: cat.name })
                  }
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modais Orchestrator */}
      <DepreciationModals
        isLight={isLight}
        currentTheme={currentTheme}
        selectedCompany={selectedCompany}
        selectedCompanyId={selectedCompanyId}
        categories={categories}
        assets={assets}
        competence={competence}
        monthly={monthly}
        showCompanyModal={showCompanyModal}
        setShowCompanyModal={setShowCompanyModal}
        editingCompany={editingCompany}
        updateCompany={updateCompany}
        createCompany={createCompany}
        showAssetModal={showAssetModal}
        setShowAssetModal={setShowAssetModal}
        editingAsset={editingAsset}
        updateAsset={updateAsset}
        createAsset={createAsset}
        showCategoryModal={showCategoryModal}
        setShowCategoryModal={setShowCategoryModal}
        editingCategory={editingCategory}
        setEditingCategory={setEditingCategory}
        updateCategory={updateCategory}
        createCategory={createCategory}
        selectedAsset={selectedAsset}
        setSelectedAsset={setSelectedAsset}
        assetHistory={assetHistory}
        setAssetHistory={setAssetHistory}
        openAssetHistory={openAssetHistory}
        exportConflict={exportConflict}
        setExportConflict={setExportConflict}
        pendingExportOptions={pendingExportOptions}
        handleExportWithOptions={handleExportWithOptions}
        retroactivePrompt={retroactivePrompt}
        setRetroactivePrompt={setRetroactivePrompt}
        isRetroGenerating={isRetroGenerating}
        setIsRetroGenerating={setIsRetroGenerating}
        disposeTarget={disposeTarget}
        setDisposeTarget={setDisposeTarget}
        disposeDate={disposeDate}
        setDisposeDate={setDisposeDate}
        disposeReason={disposeReason}
        setDisposeReason={setDisposeReason}
        isDisposing={isDisposing}
        setIsDisposing={setIsDisposing}
        disposeAsset={disposeAsset}
        confirmDelete={confirmDelete}
        setConfirmDelete={setConfirmDelete}
        deleteCompany={deleteCompany}
        deleteAsset={deleteAsset}
        deleteCategory={deleteCategory}
        reactivateTarget={reactivateTarget}
        setReactivateTarget={setReactivateTarget}
        isReactivating={isReactivating}
        setIsReactivating={setIsReactivating}
        reactivateAsset={reactivateAsset}
        showRetroBatchModal={showRetroBatchModal}
        setShowRetroBatchModal={setShowRetroBatchModal}
        selectedAssetIds={selectedAssetIds}
        setSelectedAssetIds={setSelectedAssetIds}
        showCsvLayoutModal={showCsvLayoutModal}
        setShowCsvLayoutModal={setShowCsvLayoutModal}
        isGenerating={isGenerating}
        fetchMonthly={fetchMonthly}
        fetchDashboard={fetchDashboard}
      />

      <ToastHost />
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
