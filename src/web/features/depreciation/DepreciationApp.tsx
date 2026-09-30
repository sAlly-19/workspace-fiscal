import { useEffect, useState, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Building2, Package, TrendingDown, ChevronLeft,
  Settings2, BarChart3, Home, Tag, Sun, Moon,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useDepreciationStore } from '../../stores/depreciation.store';
import { apiFetch } from '../../lib/api';
import { TitleBar } from '../../components/TitleBar';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ToastHost, toast } from '../../components/Toast';
import { SettingsModal } from '../../components/SettingsModal';
import { RetroactiveBatchModal } from './RetroactiveBatchModal';
import { DepreciationSplashScreen } from './DepreciationSplashScreen';
import { CsvLayoutModal, CsvExportOptions, DEFAULT_USER_MAPPING, ALL_FIELDS, ColumnMappingItem } from './CsvLayoutModal';

import {
  formatCentsBRL,
  cnpjMask,
  getLastClosedCompetence,
  competenceFromDate,
} from './utils/formatters';

import {
  CompanyModal,
  AssetModal,
  CategoryModal,
  AssetHistoryModal,
  DisposeModal,
  ExportConflictModal,
  RetroactivePromptModal,
  DashboardTab,
  AssetsTab,
  CompaniesTab,
  CategoriesTab,
  AssetSortField,
  SortDirection,
} from './components';

type Tab = 'dashboard' | 'assets' | 'companies' | 'categories';

export function DepreciationApp({ onBackToHome }: { onBackToHome?: () => void }) {
  const { settings, updateSettings } = useWorkspaceStore();
  const currentTheme = settings.theme || 'dark';
  const isLight = currentTheme === 'light';
  const {
    companies, selectedCompanyId, categories, assets, competence,
    fetchCompanies, selectCompany, createCompany, updateCompany, deleteCompany,
    fetchCategories, createCategory, updateCategory, deleteCategory,
    fetchAssets, createAsset, updateAsset, deleteAsset, disposeAsset, reactivateAsset, setCompetence
  } = useDepreciationStore();

  const [tab, setTab] = useState<Tab>('dashboard');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [searchAssets, setSearchAssets] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISPOSED'>('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sortField, setSortField] = useState<AssetSortField>('acquisitionDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assetHistory, setAssetHistory] = useState<any>(null);
  const [monthly, setMonthly] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportConflict, setExportConflict] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<{type:'company'|'asset'|'category', id:string, name:string} | null>(null);
  const [retroactivePrompt, setRetroactivePrompt] = useState<{asset:any, startComp:string, endComp:string, count:number} | null>(null);
  const [isRetroGenerating, setIsRetroGenerating] = useState(false);
  const [disposeTarget, setDisposeTarget] = useState<any>(null);
  const [disposeDate, setDisposeDate] = useState(new Date().toISOString().slice(0,10));
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

  const selectedCompany = useMemo(() => companies.find(c=> c.id===selectedCompanyId) || null, [companies, selectedCompanyId]);

  // Initial loads
  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);
  useEffect(() => { if (selectedCompanyId) { fetchCategories(); fetchAssets(); } }, [selectedCompanyId, fetchCategories, fetchAssets]);
  useEffect(() => { if (selectedCompanyId) { fetchDashboard(); fetchMonthly(); } }, [selectedCompanyId, competence]);

  async function fetchMonthly() {
    if (!selectedCompanyId) return;
    try {
      const res = await apiFetch(`/api/depreciation/monthly?companyId=${selectedCompanyId}&competence=${competence}`);
      if (res.ok) setMonthly(await res.json());
    } catch (e) { console.error(e); }
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

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    assets.forEach((a: any) => {
      if (a.acquisitionDate) {
        const y = a.acquisitionDate.slice(0, 4);
        if (y && !isNaN(Number(y))) years.add(y);
      }
    });
    return Array.from(years).sort().reverse();
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const list = assets.filter((a: any) => {
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

  function handleResetFilters() {
    setSearchAssets('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setYearFilter('ALL');
  }

  function handleToggleSort(field: AssetSortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function renderSortIndicator(field: AssetSortField) {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-40 ml-1 inline-block" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-500 ml-1 inline-block" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-500 ml-1 inline-block" />
    );
  }

  const isElectron = typeof window !== 'undefined' && (window as any).api;

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans select-none ${isLight ? 'bg-[#f8fafc] text-[#0f172a]' : 'bg-[#09090b] text-white'}`} style={{ paddingTop: isElectron ? 36 : 0 }}>
      <TitleBar />
      {showSplash && <DepreciationSplashScreen onFinish={() => setShowSplash(false)} />}
      
      {/* Top Bar Empresa Selecionada */}
      <div className={`h-[52px] border-b flex items-center px-4 justify-between shrink-0 ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
        <div className="flex items-center gap-3">
          {onBackToHome && (
            <button onClick={onBackToHome} className={`p-1.5 rounded-lg border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0] hover:bg-[#f1f5f9]' : 'bg-[#18181b] border-[#27272a] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white'}`} title="Voltar">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`}>
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-xs font-black tracking-widest uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Depreciação</div>
            <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Controle Patrimonial</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedCompany ? (
            <div className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border ${isLight ? 'bg-[#f1f5f9] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'}`}>
              <Building2 className="w-4 h-4 text-blue-500" />
              <div className="text-left">
                <div className={`text-xs font-bold leading-none ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{selectedCompany.name}</div>
                <div className={`text-[11px] font-mono ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>CNPJ: {selectedCompany.cnpj ? cnpjMask(selectedCompany.cnpj) : selectedCompany.document || '—'}</div>
              </div>
              <select
                value={selectedCompanyId || ''}
                onChange={(e) => selectCompany(e.target.value || null)}
                className={`ml-2 text-xs rounded-md px-2 py-1 border cursor-pointer ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`}
              >
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : (
            <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Nenhuma empresa selecionada</div>
          )}
          <div className={`flex items-center p-0.5 rounded-lg border ${isLight ? 'bg-[#f1f5f9] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'}`}>
            <button
              onClick={() => updateSettings({ theme: 'light' })}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${isLight ? 'bg-white text-amber-500 shadow-xs' : 'text-[#a1a1aa] hover:text-white'}`}
              title="Light"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateSettings({ theme: 'dark' })}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${!isLight ? 'bg-[#27272a] text-blue-400 shadow-xs' : 'text-[#a1a1aa] hover:text-[#0f172a]'}`}
              title="Dark"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className={`p-2 rounded-lg border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0] hover:bg-[#f1f5f9]' : 'bg-[#18181b] border-[#27272a] hover:bg-[#27272a]'}`} title="Configurações do Sistema">
            <Settings2 className="w-4 h-4 text-[#71717a]" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`w-[200px] border-r flex flex-col shrink-0 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#0d0d10] border-[#27272a]'}`}>
          <nav className="flex-1 p-2 space-y-1">
            {[
              { id: 'dashboard', label: 'Início', icon: Home },
              { id: 'assets', label: 'Bens', icon: Package },
              { id: 'companies', label: 'Empresas', icon: Building2 },
              { id: 'categories', label: 'Categorias', icon: Tag },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id as Tab)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                  tab === item.id ? (isLight ? 'bg-blue-600 text-white shadow' : 'bg-blue-600 text-white') : (isLight ? 'text-[#475569] hover:bg-white hover:shadow-sm' : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-white')
                }`}
              >
                <item.icon className="w-4 h-4" /> {item.label}
              </button>
            ))}
          </nav>
          <div className={`p-3 border-t text-[11px] ${isLight ? 'border-[#e2e8f0] text-[#94a3b8]' : 'border-[#27272a] text-[#52525b]'}`}>
            <div className="flex items-center gap-1.5"><BarChart3 className="w-3 h-3" /> Depreciação proporcional</div>
            <div className="mt-1">Cálculo em centavos • UTF-8 CSV</div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto ${isLight ? 'bg-[#eef2f7]' : 'bg-[#09090b]'}`}>
          {!selectedCompany && tab !== 'companies' ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <Building2 className={`w-12 h-12 mb-3 ${isLight ? 'text-[#cbd5e1]' : 'text-[#3f3f46]'}`} />
              <h3 className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Nenhuma empresa cadastrada</h3>
              <p className={`text-xs mt-1 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Crie uma empresa para começar a cadastrar bens.</p>
              <button onClick={() => setTab('companies')} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer">+ Nova empresa</button>
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
                  onOpenNewAsset={() => { setEditingAsset(null); setShowAssetModal(true); }}
                  onOpenRetroBatch={() => setShowRetroBatchModal(true)}
                  onOpenAssetHistory={openAssetHistory}
                  onOpenEditAsset={(a) => { setEditingAsset(a); setShowAssetModal(true); }}
                  onOpenDispose={(a) => { setDisposeTarget(a); setDisposeDate(new Date().toISOString().slice(0, 10)); setDisposeReason(''); }}
                  onOpenReactivate={(a) => setReactivateTarget(a)}
                  onConfirmDelete={(a) => setConfirmDelete({ type: 'asset', id: a.id, name: a.description })}
                />
              )}

              {tab === 'companies' && (
                <CompaniesTab
                  isLight={isLight}
                  companies={companies}
                  selectedCompanyId={selectedCompanyId}
                  onSelectCompany={selectCompany}
                  onOpenNewCompany={() => { setEditingCompany(null); setShowCompanyModal(true); }}
                  onOpenEditCompany={(c) => { setEditingCompany(c); setShowCompanyModal(true); }}
                  onConfirmDeleteCompany={(c) => setConfirmDelete({ type: 'company', id: c.id, name: c.name })}
                />
              )}

              {tab === 'categories' && (
                <CategoriesTab
                  isLight={isLight}
                  categories={categories}
                  onOpenNewCategory={() => { setEditingCategory(null); setShowCategoryModal(true); }}
                  onOpenEditCategory={(cat) => { setEditingCategory(cat); setShowCategoryModal(true); }}
                  onConfirmDeleteCategory={(cat) => setConfirmDelete({ type: 'category', id: cat.id, name: cat.name })}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modais */}
      <AnimatePresence>
        {showCompanyModal && (
          <CompanyModal
            isLight={isLight}
            editing={editingCompany}
            onClose={() => setShowCompanyModal(false)}
            onSave={async (data) => {
              if (editingCompany) await updateCompany(editingCompany.id, data);
              else await createCompany(data);
              setShowCompanyModal(false);
            }}
          />
        )}
        {showAssetModal && (
          <AssetModal
            isLight={isLight}
            editing={editingAsset}
            categories={categories}
            selectedCompanyId={selectedCompanyId}
            onClose={() => setShowAssetModal(false)}
            onSave={async (data) => {
              if (editingAsset) {
                await updateAsset(editingAsset.id, data);
                setShowAssetModal(false);
              } else {
                const created = await createAsset(data) as any;
                setShowAssetModal(false);
                // Verifica retroativa: se aquisição <= último mês fechado, oferece geração
                try {
                  const lastClosed = getLastClosedCompetence();
                  let startComp = competenceFromDate(data.acquisitionDate);
                  // Ajusta para regra NEXT_MONTH
                  if (selectedCompany?.depreciationRule === 'NEXT_MONTH') {
                    const [y, m] = startComp.split('-').map(Number);
                    const nxt = new Date(y, m, 1);
                    startComp = `${nxt.getFullYear()}-${String(nxt.getMonth() + 1).padStart(2, '0')}`;
                  }
                  if (startComp <= lastClosed) {
                    const [sy, sm] = startComp.split('-').map(Number);
                    const [ey, em] = lastClosed.split('-').map(Number);
                    const count = (ey - sy) * 12 + (em - sm) + 1;
                    setRetroactivePrompt({ asset: created || { description: data.description, documentNumber: data.documentNumber }, startComp, endComp: lastClosed, count });
                  }
                } catch {}
              }
            }}
          />
        )}
        {showCategoryModal && (
          <CategoryModal
            isLight={isLight}
            editing={editingCategory}
            onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }}
            onSave={async (data: any) => {
              if (editingCategory) {
                await updateCategory(editingCategory.id, data);
              } else {
                await createCategory(data);
              }
              setShowCategoryModal(false);
              setEditingCategory(null);
            }}
          />
        )}
        {selectedAsset && (
          <AssetHistoryModal
            isLight={isLight}
            assetHistory={assetHistory}
            asset={selectedAsset}
            onClose={() => { setSelectedAsset(null); setAssetHistory(null); }}
          />
        )}
      </AnimatePresence>

      <ExportConflictModal
        isLight={isLight}
        exportConflict={exportConflict}
        competence={competence}
        onCancel={() => setExportConflict(null)}
        onConfirm={() => {
          const opts = pendingExportOptions;
          setExportConflict(null);
          if (opts) {
            handleExportWithOptions(opts, true);
          } else {
            setShowCsvLayoutModal(true);
          }
        }}
      />

      <RetroactivePromptModal
        isLight={isLight}
        prompt={retroactivePrompt}
        isGenerating={isRetroGenerating}
        onClose={() => setRetroactivePrompt(null)}
        onConfirm={async () => {
          if (!retroactivePrompt || !selectedCompanyId) return;
          setIsRetroGenerating(true);
          try {
            const res = await apiFetch('/api/depreciation/retroactive', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ companyId: selectedCompanyId, assetId: retroactivePrompt.asset.id })
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: 'Erro' }));
              throw new Error(err.error || 'Falha ao gerar retroativa');
            }
            const data = await res.json();
            // Download
            const dlRes = await apiFetch(`/api/depreciation/retroactive/csv?companyId=${selectedCompanyId}&assetId=${retroactivePrompt.asset.id}`);
            if (dlRes.ok) {
              const blob = await dlRes.blob();
              const rawText = await blob.text();
              const csvText = rawText.startsWith('\uFEFF') ? rawText : '\uFEFF' + rawText;
              if ((window as any).api?.saveFileDialog) {
                const save = await (window as any).api.saveFileDialog({ defaultPath: data.filename, filters: [{ name: 'CSV', extensions: ['csv'] }] });
                if (!save.canceled && save.filePath) {
                  await (window as any).api.writeFile(save.filePath, csvText);
                }
              } else {
                const csvBlob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(csvBlob);
                const a = document.createElement('a');
                a.href = url; a.download = data.filename; a.click();
                URL.revokeObjectURL(url);
              }
            }
            setRetroactivePrompt(null);
            await fetchMonthly();
            await fetchDashboard();
            if (selectedAsset) openAssetHistory(selectedAsset);
          } catch (e: any) {
            toast.error('Erro', e.message);
          } finally {
            setIsRetroGenerating(false);
          }
        }}
      />

      <DisposeModal
        isLight={isLight}
        target={disposeTarget}
        disposeDate={disposeDate}
        setDisposeDate={setDisposeDate}
        disposeReason={disposeReason}
        setDisposeReason={setDisposeReason}
        isDisposing={isDisposing}
        onClose={() => setDisposeTarget(null)}
        onConfirm={async () => {
          if (!disposeTarget) return;
          setIsDisposing(true);
          try {
            await disposeAsset(disposeTarget.id, disposeDate, disposeReason);
            setDisposeTarget(null);
            fetchMonthly();
            fetchDashboard();
          } catch (e: any) {
            toast.error('Erro ao dar baixa', e.message);
          } finally {
            setIsDisposing(false);
          }
        }}
      />

      <ConfirmModal
        isOpen={!!confirmDelete}
        title={confirmDelete ? `Excluir ${confirmDelete.type}` : ''}
        description={confirmDelete ? `Tem certeza que deseja excluir "${confirmDelete.name}"?` : ''}
        confirmVariant="danger"
        onConfirm={async () => {
          if (!confirmDelete) return;
          if (confirmDelete.type === 'company') await deleteCompany(confirmDelete.id);
          if (confirmDelete.type === 'asset') await deleteAsset(confirmDelete.id);
          if (confirmDelete.type === 'category') await deleteCategory(confirmDelete.id);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmModal
        isOpen={!!reactivateTarget}
        title="Reativar Bem"
        description={`Deseja reativar o bem "${reactivateTarget?.supplier} - NF ${reactivateTarget?.documentNumber}"? Lançamentos não-exportados serão removidos.`}
        confirmLabel="Reativar"
        isLoading={isReactivating}
        onConfirm={async () => {
          if (!reactivateTarget) return;
          try {
            setIsReactivating(true);
            await reactivateAsset(reactivateTarget.id);
            toast.success('Bem reativado', 'Lançamentos pendentes foram removidos.');
            setReactivateTarget(null);
            fetchMonthly();
            fetchDashboard();
            if (selectedAsset) openAssetHistory(selectedAsset);
          } catch (e: any) {
            toast.error('Erro ao reativar', e.message);
          } finally {
            setIsReactivating(false);
          }
        }}
        onCancel={() => setReactivateTarget(null)}
      />

      {/* F8: Modal de depreciação retroativa em lote */}
      {showRetroBatchModal && (
        <RetroactiveBatchModal
          isLight={isLight}
          assets={assets.filter((a: any) => selectedAssetIds.has(a.id))}
          lastClosed={getLastClosedCompetence()}
          depreciationRule={selectedCompany?.depreciationRule || 'PROPORTIONAL'}
          onClose={() => setShowRetroBatchModal(false)}
          onConfirm={async (startComp: string, endComp: string) => {
            try {
              setIsRetroGenerating(true);
              const ids = Array.from(selectedAssetIds);

              let exportOptions: any = {};
              try {
                const savedOptions = localStorage.getItem('depreciation_csv_column_mapping_v1');
                if (savedOptions) {
                  exportOptions = JSON.parse(savedOptions);
                }
              } catch (e) {
                console.warn('Erro ao carregar mapeamento salvo', e);
              }

              const res = await apiFetch('/api/depreciation/retroactive/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  companyId: selectedCompanyId,
                  assetIds: ids,
                  startCompetence: startComp,
                  endCompetence: endComp,
                  ...exportOptions,
                }),
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Erro ao gerar retroativa em lote' }));
                toast.error('Erro na retroativa', err.error || 'Falha ao processar');
                return;
              }
              const data = await res.json();

              if (data.csv) {
                const rawText = data.csv;
                const csvText = rawText.startsWith('\uFEFF') ? rawText : '\uFEFF' + rawText;
                if ((window as any).api?.saveFileDialog) {
                  const save = await (window as any).api.saveFileDialog({
                    defaultPath: data.filename || `retroativa_lote_${startComp}_a_${endComp}.csv`,
                    filters: [{ name: 'CSV (Valores separados por vírgula/ponto e vírgula)', extensions: ['csv'] }],
                  });
                  if (!save.canceled && save.filePath) {
                    await (window as any).api.writeFile(save.filePath, csvText);
                    toast.success(
                      'Arquivo CSV salvo com sucesso!',
                      `${data.entriesCreated} lançamentos exportados em ${save.filePath}`
                    );
                  } else {
                    toast.info('Lançamentos gravados', 'O salvamento do arquivo CSV foi cancelado pelo usuário.');
                  }
                } else {
                  const csvBlob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(csvBlob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = data.filename || `retroativa_lote_${startComp}_a_${endComp}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success(
                    'Retroativa concluída',
                    `${data.processed} bens processados, ${data.entriesCreated} lançamentos gerados.`
                  );
                }
              } else {
                toast.success(
                  'Retroativa concluída',
                  `${data.processed} bens processados, ${data.entriesCreated} lançamentos gerados.`
                );
              }

              setShowRetroBatchModal(false);
              setSelectedAssetIds(new Set());
              fetchMonthly();
              fetchDashboard();
            } catch (e: any) {
              toast.error('Erro', e.message);
            } finally {
              setIsRetroGenerating(false);
            }
          }}
        />
      )}

      <CsvLayoutModal
        isOpen={showCsvLayoutModal}
        onClose={() => setShowCsvLayoutModal(false)}
        onExport={(opts) => handleExportWithOptions(opts, false)}
        isGenerating={isGenerating}
        competence={competence}
        totalRows={monthly?.count || 0}
        theme={currentTheme}
      />

      <ToastHost />
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

