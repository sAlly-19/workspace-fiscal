import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, Package, TrendingDown, FileText, Download, Plus, Search, Edit2, Trash2, X, Check, AlertTriangle,
  ChevronLeft, Calendar, ArrowRight, Eye, Layers, Settings2, BarChart3, Home, LogOut, Save, Tag, Sun, Moon, Archive, ArchiveRestore, Ban
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useDepreciationStore } from '../../stores/depreciation.store';
import { apiFetch } from '../../lib/api';
import { TitleBar } from '../../components/TitleBar';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ToastHost, toast } from '../../components/Toast';
import { SettingsModal } from '../../components/SettingsModal';
import { CompetencePicker } from '../../components/CompetencePicker';
import { RetroactiveBatchModal } from './RetroactiveBatchModal';
import { AssetXmlDropZone } from './AssetXmlDropZone';
import { DepreciationSplashScreen } from './DepreciationSplashScreen';

type Tab = 'dashboard' | 'assets' | 'companies' | 'categories';

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatCentsBRL(cents: number): string {
  return `R$ ${formatCents(cents)}`;
}
const MONTHS_PT_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function competenceLabel(comp: string): string {
  const [y, m] = comp.split('-');
  const idx = Number(m)-1;
  return `${MONTHS_PT_FULL[idx]} ${y}`;
}
function formatDateBR(d: string | Date): string {
  const date = new Date(d);
  return date.toLocaleDateString('pt-BR');
}
function cnpjMask(v: string): string {
  const digits = v.replace(/\D/g,'').slice(0,14);
  if (digits.length <= 11) return digits.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  return digits.replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d)/,'$1-$2');
}

export function DepreciationApp({ onBackToHome }: { onBackToHome?: () => void }) {
  const { settings, updateSettings } = useWorkspaceStore();
  const currentTheme = settings.theme || 'dark';
  const isLight = currentTheme === 'light';
  const {
    companies, selectedCompanyId, categories, assets, competence,
    fetchCompanies, selectCompany, createCompany, updateCompany, deleteCompany,
    fetchCategories, createCategory, deleteCategory,
    fetchAssets, createAsset, updateAsset, deleteAsset, disposeAsset, reactivateAsset, setCompetence
  } = useDepreciationStore();

  const [tab, setTab] = useState<Tab>('dashboard');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchAssets, setSearchAssets] = useState('');
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

  const selectedCompany = useMemo(() => companies.find(c=> c.id===selectedCompanyId) || null, [companies, selectedCompanyId]);

  function getLastClosedCompetence(): string {
    const now = new Date();
    const firstOfCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastClosed = new Date(firstOfCurrent.getFullYear(), firstOfCurrent.getMonth() - 1, 1);
    return `${lastClosed.getFullYear()}-${String(lastClosed.getMonth()+1).padStart(2,'0')}`;
  }
  function competenceFromDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }

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
  async function handleGenerate(force=false) {
    if (!selectedCompanyId) return;
    setIsGenerating(true);
    try {
      const res = await apiFetch('/api/depreciation/export', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ companyId: selectedCompanyId, competence, separator: ';', numericFormat: 'RAW', force })
      });
      if (res.status===409) {
        const data = await res.json();
        setExportConflict(data);
        setIsGenerating(false);
        return;
      }
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      // Download CSV
      const csvRes = await apiFetch(`/api/depreciation/export/csv?companyId=${selectedCompanyId}&competence=${competence}`);
      if (csvRes.ok) {
        const blob = await csvRes.blob();
        // Electron save dialog
        if ((window as any).api?.saveFileDialog) {
          const save = await (window as any).api.saveFileDialog({ defaultPath: data.filename, filters: [{ name:'CSV', extensions:['csv'] }] });
          if (!save.canceled && save.filePath) {
            const text = await blob.text();
            await (window as any).api.writeFile(save.filePath, text);
          }
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = data.filename; a.click();
          URL.revokeObjectURL(url);
        }
      }
      setExportConflict(null);
      fetchMonthly();
      fetchDashboard();
    } catch (e:any) {
      toast.error('Erro', e.message);
    } finally { setIsGenerating(false); }
  }

  async function openAssetHistory(asset:any) {
    setSelectedAsset(asset);
    try {
      const res = await apiFetch(`/api/depreciation/asset/${asset.id}/history`);
      if (res.ok) setAssetHistory(await res.json());
    } catch {}
  }

  const filteredAssets = assets.filter(a => {
    if (!searchAssets) return true;
    const q = searchAssets.toLowerCase();
    return a.supplier.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.documentNumber.toLowerCase().includes(q);
  });

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
                onChange={(e)=> selectCompany(e.target.value || null)}
                className={`ml-2 text-xs rounded-md px-2 py-1 border cursor-pointer ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`}
              >
                {companies.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : (
            <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Nenhuma empresa selecionada</div>
          )}
          <div className={`flex items-center p-0.5 rounded-lg border ${isLight ? 'bg-[#f1f5f9] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'}`}>
            <button
              onClick={()=> updateSettings({ theme: 'light' })}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${isLight ? 'bg-white text-amber-500 shadow-xs' : 'text-[#a1a1aa] hover:text-white'}`}
              title="Light"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={()=> updateSettings({ theme: 'dark' })}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${!isLight ? 'bg-[#27272a] text-blue-400 shadow-xs' : 'text-[#a1a1aa] hover:text-[#0f172a]'}`}
              title="Dark"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={()=> setIsSettingsOpen(true)} className={`p-2 rounded-lg border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0] hover:bg-[#f1f5f9]' : 'bg-[#18181b] border-[#27272a] hover:bg-[#27272a]'}`} title="Configurações do Sistema">
            <Settings2 className="w-4 h-4 text-[#71717a]" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`w-[200px] border-r flex flex-col shrink-0 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#0d0d10] border-[#27272a]'}`}>
          <nav className="flex-1 p-2 space-y-1">
            {[
              { id:'dashboard', label:'Início', icon: Home },
              { id:'assets', label:'Bens', icon: Package },
              { id:'companies', label:'Empresas', icon: Building2 },
              { id:'categories', label:'Categorias', icon: Tag },
            ].map(item => (
              <button
                key={item.id}
                onClick={()=> setTab(item.id as Tab)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                  tab===item.id ? (isLight ? 'bg-blue-600 text-white shadow' : 'bg-blue-600 text-white') : (isLight ? 'text-[#475569] hover:bg-white hover:shadow-sm' : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-white')
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

        {/* Main */}
        <main className={`flex-1 overflow-y-auto ${isLight ? 'bg-[#eef2f7]' : 'bg-[#09090b]'}`}>
          {!selectedCompany && tab!=='companies' ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <Building2 className={`w-12 h-12 mb-3 ${isLight ? 'text-[#cbd5e1]' : 'text-[#3f3f46]'}`} />
              <h3 className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Nenhuma empresa cadastrada</h3>
              <p className={`text-xs mt-1 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Crie uma empresa para começar a cadastrar bens.</p>
              <button onClick={()=> setTab('companies')} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer">+ Nova empresa</button>
            </div>
          ) : (
            <>
              {tab==='dashboard' && (
                <div className="p-6 max-w-6xl mx-auto space-y-4">
                  {/* Competência */}
                  <div className={`flex items-center justify-between p-4 rounded-xl border ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className={`text-xs font-bold uppercase tracking-widest ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Competência</div>
                        <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{competenceLabel(competence)}</div>
                      </div>
                    </div>
                    <CompetencePicker
                      value={competence}
                      onChange={setCompetence}
                      isLight={isLight}
                      label={`${MONTHS_PT_FULL[parseInt(competence.split('-')[1], 10) - 1]} / ${competence.split('-')[0]}`}
                    />
                  </div>

                  {/* Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
                      <div className={`text-[11px] font-bold uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Bens cadastrados</div>
                      <div className={`text-2xl font-black mt-1 ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{dashboard?.totalAssets ?? assets.length}</div>
                      <div className={`text-xs ${isLight ? 'text-[#94a3b8]' : 'text-[#52525b]'}`}>{dashboard?.fullyDepreciated ?? 0} totalmente depreciados</div>
                    </div>
                    <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
                      <div className={`text-[11px] font-bold uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Depreciação do mês</div>
                      <div className="text-2xl font-black mt-1 text-blue-500">{formatCentsBRL(monthly?.total ?? 0)}</div>
                      <div className={`text-xs ${isLight ? 'text-[#94a3b8]' : 'text-[#52525b]'}`}>{monthly?.count ?? 0} bens nesta competência</div>
                    </div>
                    <div className={`p-4 rounded-xl border flex flex-col justify-between ${monthly?.isExported ? (isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/30') : (isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]')}`}>
                      <div>
                        <div className={`text-[11px] font-bold uppercase ${monthly?.isExported ? 'text-emerald-700' : (isLight ? 'text-[#64748b]' : 'text-[#71717a]')}`}>Valor contábil</div>
                        <div className={`text-2xl font-black mt-1 ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{formatCentsBRL(dashboard?.totalCurrent ?? 0)}</div>
                      </div>
                      {monthly?.isExported && <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> EXPORTADO</div>}
                    </div>
                  </div>

                  {/* Tabela */}
                  <div className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
                    <div className={`px-4 py-3 border-b flex items-center justify-between ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#0d0d10] border-[#27272a]'}`}>
                      <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Depreciação — {competenceLabel(competence)}</span>
                      <button
                        onClick={()=> handleGenerate(false)}
                        disabled={isGenerating || !monthly || monthly.count===0}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> {isGenerating ? 'Gerando...' : 'Gerar CSV da competência'}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className={`${isLight ? 'bg-[#f1f5f9] text-[#475569]' : 'bg-[#18181b] text-[#a1a1aa]'}`}>
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold">Fornecedor</th>
                            <th className="text-left px-3 py-2 font-semibold">NF</th>
                            <th className="text-left px-3 py-2 font-semibold">Categoria</th>
                            <th className="text-right px-3 py-2 font-semibold">Depreciação</th>
                            <th className="text-center px-3 py-2 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isLight ? 'divide-[#e2e8f0]' : 'divide-[#27272a]'}`}>
                          {monthly?.rows?.length ? monthly.rows.map((r:any)=>(
                            <tr key={r.assetId} className={`${r.exported ? (isLight ? 'bg-emerald-50/50' : 'bg-emerald-500/5') : ''} ${isLight ? 'hover:bg-[#f8fafc]' : 'hover:bg-white/[0.02]'}`}>
                              <td className="px-3 py-2 font-medium">{r.supplier}</td>
                              <td className="px-3 py-2 font-mono">{r.documentNumber}</td>
                              <td className="px-3 py-2">{r.categoryName || '—'}</td>
                              <td className="px-3 py-2 text-right font-bold">{formatCentsBRL(r.depreciationValue)}</td>
                              <td className="px-3 py-2 text-center">
                                {r.exported ? <span className="inline-flex items-center gap-1 text-emerald-600 font-bold"><Check className="w-3 h-3" /> ✓</span> : r.status === 'current' ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white">ATUAL</span> : r.status === 'not_issued' ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 border border-amber-500/30">NÃO LANÇADO</span> : <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isLight ? 'bg-[#e2e8f0] text-[#475569]' : 'bg-[#27272a] text-[#71717a]'}`}>FUTURO</span>}
                              </td>
                            </tr>
                          )) : (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-[#71717a]">Nenhum bem para esta competência</td></tr>
                          )}
                        </tbody>
                        {monthly?.rows?.length ? (
                          <tfoot className={`${isLight ? 'bg-[#f8fafc] border-t border-[#e2e8f0]' : 'bg-[#0d0d10] border-t border-[#27272a]'} font-bold`}>
                            <tr>
                              <td colSpan={3} className="px-3 py-2 text-right">Total do mês:</td>
                              <td className="px-3 py-2 text-right text-blue-500">{formatCentsBRL(monthly.total)}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        ) : null}
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {tab==='assets' && (
                <div className="p-6 max-w-6xl mx-auto space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-sm font-black ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Bens / Notas Fiscais</h2>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-[#94a3b8]' : 'text-[#71717a]'}`} />
                        <input value={searchAssets} onChange={(e)=> setSearchAssets(e.target.value)} placeholder="Buscar..." className={`pl-8 pr-3 py-1.5 rounded-lg border text-xs w-56 ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#18181b] border-[#3f3f46] text-white'}`} />
                      </div>
                      {selectedAssetIds.size > 0 && (
                        <button onClick={()=> setShowRetroBatchModal(true)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95">
                          <Calendar className="w-3.5 h-3.5" /> Depreciar Retroativa ({selectedAssetIds.size})
                        </button>
                      )}
                      <button onClick={()=> { setEditingAsset(null); setShowAssetModal(true); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Novo bem</button>
                    </div>
                  </div>

                  <div className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
                    <table className="w-full text-xs">
                      <thead className={`${isLight ? 'bg-[#f1f5f9] text-[#475569]' : 'bg-[#18181b] text-[#a1a1aa]'}`}>
                        <tr>
                          <th className="px-3 py-2 w-8">
                            <input
                              type="checkbox"
                              checked={filteredAssets.length > 0 && filteredAssets.every((a:any) => selectedAssetIds.has(a.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAssetIds(new Set(filteredAssets.map((a:any) => a.id)));
                                } else {
                                  setSelectedAssetIds(new Set());
                                }
                              }}
                              className="w-3.5 h-3.5 cursor-pointer"
                            />
                          </th>
                          <th className="text-left px-3 py-2">Fornecedor</th>
                          <th className="text-left px-3 py-2">NF / Descrição</th>
                          <th className="text-left px-3 py-2">Categoria</th>
                          <th className="text-right px-3 py-2">Valor</th>
                          <th className="text-center px-3 py-2">Taxa</th>
                          <th className="text-right px-3 py-2">Ações</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? 'divide-[#e2e8f0]' : 'divide-[#27272a]'}`}>
                        {filteredAssets.map(a=> (
                          <tr key={a.id} className={`${isLight ? 'hover:bg-[#f8fafc]' : 'hover:bg-white/[0.02]'} cursor-pointer`} onClick={()=> openAssetHistory(a)}>
                            <td className="px-3 py-2" onClick={(e)=> e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedAssetIds.has(a.id)}
                                onChange={(e) => {
                                  const next = new Set(selectedAssetIds);
                                  if (e.target.checked) next.add(a.id);
                                  else next.delete(a.id);
                                  setSelectedAssetIds(next);
                                }}
                                className="w-3.5 h-3.5 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2 font-medium">{a.supplier}</td>
                            <td className="px-3 py-2"><div className="font-mono font-bold">NF {a.documentNumber}</div><div className={`text-[11px] truncate max-w-[260px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>{a.description}</div></td>
                            <td className="px-3 py-2">{a.categoryName || '—'}</td>
                            <td className="px-3 py-2 text-right font-bold">{formatCentsBRL(a.acquisitionValue)}</td>
                            <td className="px-3 py-2 text-center">{a.annualRate}%</td>
                            <td className="px-3 py-2 text-right flex justify-end gap-1" onClick={(e)=> e.stopPropagation()}>
                              {a.status === 'DISPOSED' ? (
                                <>
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>Baixado</span>
                                  <button onClick={()=> { setReactivateTarget(a); }} className={`p-1.5 rounded border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0] hover:bg-emerald-50' : 'bg-[#18181b] border-[#3f3f46] hover:bg-emerald-500/10'} text-emerald-600`} title="Reativar"><ArchiveRestore className="w-3 h-3" /></button>
                                </>
                              ) : (
                                <button onClick={()=> { setDisposeTarget(a); setDisposeDate(new Date().toISOString().slice(0,10)); setDisposeReason(''); }} className={`p-1.5 rounded border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0] hover:bg-amber-50' : 'bg-[#18181b] border-[#3f3f46] hover:bg-amber-500/10'} text-amber-600`} title="Dar Baixa"><Archive className="w-3 h-3" /></button>
                              )}
                              <button onClick={()=> { setEditingAsset(a); setShowAssetModal(true); }} className={`p-1.5 rounded border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0] hover:bg-[#f1f5f9]' : 'bg-[#18181b] border-[#3f3f46] hover:bg-[#27272a]'}`}><Edit2 className="w-3 h-3" /></button>
                              <button onClick={()=> setConfirmDelete({type:'asset', id:a.id, name: a.description})} className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                              <button onClick={()=> openAssetHistory(a)} className={`p-1.5 rounded border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#18181b] border-[#3f3f46]'}`}><Eye className="w-3 h-3" /></button>
                            </td>
                          </tr>
                        ))}
                        {filteredAssets.length===0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-[#71717a]">Nenhum bem cadastrado</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab==='companies' && (
                <div className="p-6 max-w-4xl mx-auto space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-sm font-black ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Empresas</h2>
                    <button onClick={()=> { setEditingCompany(null); setShowCompanyModal(true); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Nova empresa</button>
                  </div>
                  <div className="grid gap-3">
                    {companies.map(c=> (
                      <div key={c.id} className={`p-4 rounded-xl border flex items-center justify-between ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'} ${selectedCompanyId===c.id ? 'ring-1 ring-blue-500' : ''}`}>
                        <div>
                          <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{c.name}</div>
                          <div className={`text-xs font-mono ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>CNPJ: {c.cnpj ? cnpjMask(c.cnpj) : c.document || '—'} {c.tradeName ? `• ${c.tradeName}` : ''}</div>
                          <div className={`text-[11px] mt-1 ${isLight ? 'text-[#94a3b8]' : 'text-[#52525b]'}`}>Regra: {c.depreciationRule || 'PROPORTIONAL'} {c.city ? `• ${c.city}/${c.state}` : ''}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {selectedCompanyId===c.id && <span className="text-[11px] font-bold text-blue-500 flex items-center gap-1"><Check className="w-3 h-3" /> Selecionada</span>}
                          <button onClick={()=> selectCompany(c.id)} className={`px-2 py-1 rounded text-xs font-bold border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#18181b] border-[#3f3f46] text-white'}`}>Selecionar</button>
                          <button onClick={()=> { setEditingCompany(c); setShowCompanyModal(true); }} className={`p-1.5 rounded border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#18181b] border-[#3f3f46]'}`}><Edit2 className="w-3 h-3" /></button>
                          <button onClick={()=> setConfirmDelete({type:'company', id:c.id, name:c.name})} className="p-1.5 rounded bg-red-500/10 text-red-500 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                    {companies.length===0 && <div className={`p-8 rounded-xl border border-dashed text-center text-xs ${isLight ? 'border-[#cbd5e1] text-[#64748b] bg-white' : 'border-[#3f3f46] text-[#71717a]'}`}>Nenhuma empresa. Clique em Nova empresa.</div>}
                  </div>
                </div>
              )}

              {tab==='categories' && (
                <div className="p-6 max-w-3xl mx-auto space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-sm font-black ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Categorias</h2>
                    <button onClick={()=> setShowCategoryModal(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer">+ Nova categoria</button>
                  </div>
                  <div className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
                    <table className="w-full text-xs">
                      <thead className={`${isLight ? 'bg-[#f1f5f9]' : 'bg-[#18181b]'}`}><tr><th className="text-left px-3 py-2">Nome</th><th className="text-center px-3 py-2">Taxa padrão</th><th className="text-right px-3 py-2">Ações</th></tr></thead>
                      <tbody className={`divide-y ${isLight ? 'divide-[#e2e8f0]' : 'divide-[#27272a]'}`}>
                        {categories.map(cat=> (
                          <tr key={cat.id}>
                            <td className="px-3 py-2 font-medium">{cat.name}</td>
                            <td className="px-3 py-2 text-center font-bold">{cat.defaultRate}%</td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={()=> setConfirmDelete({type:'category', id:cat.id, name:cat.name})} className="p-1.5 rounded text-red-500 hover:bg-red-500/10 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCompanyModal && (
          <CompanyModal isLight={isLight} editing={editingCompany} onClose={()=> setShowCompanyModal(false)} onSave={async (data)=>{
            if (editingCompany) await updateCompany(editingCompany.id, data);
            else await createCompany(data);
            setShowCompanyModal(false);
          }} />
        )}
        {showAssetModal && (
          <AssetModal isLight={isLight} editing={editingAsset} categories={categories} selectedCompanyId={selectedCompanyId} onClose={()=> setShowAssetModal(false)} onSave={async (data)=>{
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
                  const [y,m] = startComp.split('-').map(Number);
                  const nxt = new Date(y, m, 1);
                  startComp = `${nxt.getFullYear()}-${String(nxt.getMonth()+1).padStart(2,'0')}`;
                }
                if (startComp <= lastClosed) {
                  const [sy, sm] = startComp.split('-').map(Number);
                  const [ey, em] = lastClosed.split('-').map(Number);
                  const count = (ey - sy) * 12 + (em - sm) + 1;
                  setRetroactivePrompt({ asset: created || { description: data.description, documentNumber: data.documentNumber }, startComp, endComp: lastClosed, count });
                }
              } catch {}
            }
          }} />
        )}
        {showCategoryModal && (
          <CategoryModal isLight={isLight} onClose={()=> setShowCategoryModal(false)} onSave={async (data)=>{ await createCategory(data); setShowCategoryModal(false); }} />
        )}
        {selectedAsset && (
          <AssetHistoryModal isLight={isLight} assetHistory={assetHistory} asset={selectedAsset} onClose={()=> { setSelectedAsset(null); setAssetHistory(null); }} />
        )}
      </AnimatePresence>

      {exportConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
            <div className={`p-4 border-b flex items-center gap-3 ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'}`}>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div>
                <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Competência já exportada</div>
                <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>{competenceLabel(competence)} já foi processada.</div>
              </div>
            </div>
            <div className="p-4 text-xs space-y-2">
              <div>Total: <b>{formatCentsBRL(exportConflict.total)}</b> • {exportConflict.count} bens</div>
              <div className={`${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Deseja gerar novamente? Isso substituirá o arquivo anterior.</div>
            </div>
            <div className={`p-3 border-t flex justify-end gap-2 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
              <button onClick={()=> setExportConflict(null)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#27272a] border-[#3f3f46] text-white'}`}>Cancelar</button>
              <button onClick={()=> { setExportConflict(null); handleGenerate(true); }} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer">Gerar novamente</button>
            </div>
          </div>
        </div>
      )}

      {retroactivePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
            <div className={`p-4 border-b flex items-center gap-3 ${isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-500/10 border-blue-500/20'}`}>
              <Calendar className="w-5 h-5 text-blue-500" />
              <div>
                <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Gerar depreciação retroativa?</div>
                <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Bem adquirido antes do último mês fechado</div>
              </div>
            </div>
            <div className="p-4 text-xs space-y-3">
              <p className={`${isLight ? 'text-[#475569]' : 'text-[#d4d4d8]'}`}>
                A nota <b>NF {retroactivePrompt.asset.documentNumber || retroactivePrompt.asset.description}</b> foi emitida em <b>{retroactivePrompt.startComp.split('-').reverse().join('/')}</b>.
              </p>
              <p className={`${isLight ? 'text-[#475569]' : 'text-[#d4d4d8]'}`}>
                Estamos em <b>{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</b>, fechando <b>{retroactivePrompt.endComp.split('-').reverse().join('/')}</b>.
              </p>
              <div className={`p-3 rounded-xl border text-center ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
                <div className={`text-[11px] font-bold uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Período retroativo</div>
                <div className={`text-sm font-black ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{retroactivePrompt.startComp.split('-').reverse().join('/')} até {retroactivePrompt.endComp.split('-').reverse().join('/')} • {retroactivePrompt.count} meses</div>
                <div className={`text-[11px] mt-1 ${isLight ? 'text-[#94a3b8]' : 'text-[#52525b]'}`}>Será gerado um CSV com a depreciação mensal de cada competência.</div>
              </div>
              <p className={`text-[11px] ${isLight ? 'text-[#94a3b8]' : 'text-[#52525b]'}`}>
                Deseja gerar o arquivo agora? Você também poderá gerar depois pela tela de depreciação.
              </p>
            </div>
            <div className={`p-3 border-t flex justify-end gap-2 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
              <button onClick={()=> setRetroactivePrompt(null)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0] text-[#475569]' : 'bg-[#27272a] border-[#3f3f46] text-white'}`}>Agora não</button>
              <button
                disabled={isRetroGenerating}
                onClick={async ()=>{
                  if (!retroactivePrompt || !selectedCompanyId) return;
                  setIsRetroGenerating(true);
                  try {
                    const res = await apiFetch('/api/depreciation/retroactive', {
                      method: 'POST',
                      headers: { 'Content-Type':'application/json' },
                      body: JSON.stringify({ companyId: selectedCompanyId, assetId: retroactivePrompt.asset.id })
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(()=>({error:'Erro'}));
                      throw new Error(err.error || 'Falha ao gerar retroativa');
                    }
                    const data = await res.json();
                    // Download
                    const dlRes = await apiFetch(`/api/depreciation/retroactive/csv?companyId=${selectedCompanyId}&assetId=${retroactivePrompt.asset.id}`);
                    if (dlRes.ok) {
                      const blob = await dlRes.blob();
                      if ((window as any).api?.saveFileDialog) {
                        const save = await (window as any).api.saveFileDialog({ defaultPath: data.filename, filters: [{ name:'CSV', extensions:['csv'] }] });
                        if (!save.canceled && save.filePath) {
                          const text = await blob.text();
                          await (window as any).api.writeFile(save.filePath, text);
                        }
                      } else {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = data.filename; a.click();
                        URL.revokeObjectURL(url);
                      }
                    }
                    setRetroactivePrompt(null);
                    fetchMonthly();
                    fetchDashboard();
                    // Atualiza histórico se aberto
                    if (selectedAsset) openAssetHistory(selectedAsset);
                  } catch (e:any) {
                    toast.error('Erro', e.message);
                  } finally {
                    setIsRetroGenerating(false);
                  }
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isRetroGenerating ? 'Gerando...' : 'Gerar retroativa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {disposeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
            <div className={`px-5 py-4 border-b flex items-center gap-3 ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'}`}>
              <Archive className="w-5 h-5 text-amber-600" />
              <div>
                <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Dar Baixa no Bem</div>
                <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>NF {disposeTarget.documentNumber} • {disposeTarget.description}</div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Data da baixa *</label>
                <input type="date" value={disposeDate} onChange={(e)=> setDisposeDate(e.target.value)} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm cursor-pointer ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} />
                <p className={`text-[11px] mt-1 ${isLight ? 'text-[#94a3b8]' : 'text-[#71717a]'}`}>Depreciação será calculada até esta competência (inclusive).</p>
              </div>
              <div>
                <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Motivo (opcional)</label>
                <textarea value={disposeReason} onChange={(e)=> setDisposeReason(e.target.value)} rows={2} placeholder="Venda, obsolescência, perda..." className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm resize-none ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} />
              </div>
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
                <Ban className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Após a baixa, o bem não entrará mais nos cálculos mensais e seu histórico será truncado. Você poderá reativar depois.</span>
              </div>
            </div>
            <div className={`px-5 py-3 border-t flex justify-end gap-2 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
              <button onClick={()=> setDisposeTarget(null)} disabled={isDisposing} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0] text-[#475569]' : 'bg-[#27272a] border-[#3f3f46] text-white'}`}>Cancelar</button>
              <button
                disabled={isDisposing || !disposeDate}
                onClick={async ()=>{
                  if (!disposeTarget) return;
                  setIsDisposing(true);
                  try {
                    await disposeAsset(disposeTarget.id, disposeDate, disposeReason);
                    setDisposeTarget(null);
                    fetchMonthly();
                    fetchDashboard();
                  } catch (e:any) {
                    toast.error('Erro ao dar baixa', e.message);
                  } finally {
                    setIsDisposing(false);
                  }
                }}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isDisposing ? 'Baixando...' : 'Confirmar Baixa'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={!!confirmDelete} title={confirmDelete ? `Excluir ${confirmDelete.type}` : ''} description={confirmDelete ? `Tem certeza que deseja excluir "${confirmDelete.name}"?` : ''} confirmVariant="danger" onConfirm={async ()=>{
        if (!confirmDelete) return;
        if (confirmDelete.type==='company') await deleteCompany(confirmDelete.id);
        if (confirmDelete.type==='asset') await deleteAsset(confirmDelete.id);
        if (confirmDelete.type==='category') await deleteCategory(confirmDelete.id);
        setConfirmDelete(null);
      }} onCancel={()=> setConfirmDelete(null)} />

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
          } catch (e:any) {
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
          assets={assets.filter((a:any) => selectedAssetIds.has(a.id))}
          lastClosed={getLastClosedCompetence()}
          onClose={() => setShowRetroBatchModal(false)}
          onConfirm={async (startComp: string, endComp: string) => {
            try {
              setIsRetroGenerating(true);
              const ids = Array.from(selectedAssetIds);
              const res = await apiFetch('/api/depreciation/retroactive/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId: selectedCompanyId, assetIds: ids, startCompetence: startComp, endCompetence: endComp }),
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                toast.error('Erro na retroativa', err.error || 'Falha ao processar');
                return;
              }
              const data = await res.json();
              toast.success(
                'Retroativa concluída',
                `${data.processed} bens processados, ${data.entriesCreated} entries geradas.`
              );
              setShowRetroBatchModal(false);
              setSelectedAssetIds(new Set());
              fetchMonthly();
              fetchDashboard();
            } catch (e:any) {
              toast.error('Erro', e.message);
            } finally {
              setIsRetroGenerating(false);
            }
          }}
        />
      )}

      <ToastHost />
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

function CompanyModal({ isLight, editing, onClose, onSave }: any) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    document: editing?.document || editing?.cnpj || '',
  });
  const [saving, setSaving] = useState(false);
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} className={`w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <h3 className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{editing ? 'Editar empresa' : 'Nova empresa'}</h3>
          <button onClick={onClose} className={`p-1.5 rounded-lg cursor-pointer ${isLight ? 'hover:bg-[#e2e8f0]' : 'hover:bg-white/10'}`}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Razão social *</label>
            <input value={form.name} onChange={(e)=> setForm({...form, name: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="ABC Comércio Ltda." />
            <p className={`text-[11px] mt-1 ${isLight ? 'text-[#94a3b8]' : 'text-[#71717a]'}`}>Nome registrado no CNPJ</p>
          </div>
          <div>
            <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>CNPJ *</label>
            <input value={form.document} onChange={(e)=> setForm({...form, document: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm font-mono ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="12.345.678/0001-00" />
            <p className={`text-[11px] mt-1 ${isLight ? 'text-[#94a3b8]' : 'text-[#71717a]'}`}>Apenas números, com ou sem máscara</p>
          </div>
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <button onClick={onClose} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#27272a] border-[#3f3f46] text-white'}`}>Cancelar</button>
          <button disabled={saving || !form.name.trim()} onClick={async ()=> { setSaving(true); try{ await onSave(form);} finally{ setSaving(false);} }} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"><Save className="w-3.5 h-3.5" /> Salvar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AssetModal({ isLight, editing, categories, selectedCompanyId, onClose, onSave }: any) {
  const [form, setForm] = useState({
    supplier: editing?.supplier || '',
    acquisitionDate: editing?.acquisitionDate ? new Date(editing.acquisitionDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
    documentNumber: editing?.documentNumber || '',
    description: editing?.description || '',
    acquisitionValue: editing ? (editing.acquisitionValue/100).toFixed(2).replace('.', ',') : '',
    ncm: editing?.ncm || '',
    categoryId: editing?.categoryId || '',
    annualRate: editing?.annualRate ? String(editing.annualRate) : '',
  });

  useEffect(()=>{
    if (form.categoryId && !form.annualRate) {
      const cat = categories.find((c:any)=> c.id===form.categoryId);
      if (cat) setForm(f=> ({...f, annualRate: String(cat.defaultRate)}));
    }
  }, [form.categoryId]);

  const [saving, setSaving] = useState(false);
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{scale:0.95}} animate={{scale:1}} className={`w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <h3 className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{editing ? 'Editar bem' : 'Novo bem'}</h3>
          <button onClick={onClose} className={`p-1.5 rounded-lg cursor-pointer ${isLight ? 'hover:bg-[#e2e8f0]' : 'hover:bg-white/10'}`}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          {!editing && (
            <AssetXmlDropZone
              onPrefill={(data) => {
                setForm((f) => ({
                  ...f,
                  supplier: data.supplier || f.supplier,
                  documentNumber: data.documentNumber || f.documentNumber,
                  description: data.description || f.description,
                  acquisitionDate: data.acquisitionDate || f.acquisitionDate,
                  acquisitionValue: data.acquisitionValue
                    ? Number(data.acquisitionValue).toFixed(2).replace('.', ',')
                    : f.acquisitionValue,
                  ncm: data.ncm || f.ncm,
                }));
              }}
            />
          )}
          <div>
            <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Fornecedor *</label>
            <input value={form.supplier} onChange={(e)=> setForm({...form, supplier: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="XYZ Informática Ltda." />
          </div>
          <div>
            <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Descrição *</label>
            <input value={form.description} onChange={(e)=> setForm({...form, description: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="Computador Dell Latitude 5550" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Data aquisição *</label>
              <input type="date" value={form.acquisitionDate} onChange={(e)=> setForm({...form, acquisitionDate: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm cursor-pointer ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} />
            </div>
            <div>
              <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Nº Nota *</label>
              <input value={form.documentNumber} onChange={(e)=> setForm({...form, documentNumber: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm font-mono ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="12345" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Valor aquisição *</label>
              <input value={form.acquisitionValue} onChange={(e)=> setForm({...form, acquisitionValue: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="R$ 5.000,00" />
            </div>
            <div>
              <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>NCM</label>
              <input value={form.ncm} onChange={(e)=> setForm({...form, ncm: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm font-mono ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="8471.30.12" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Categoria *</label>
              <select value={form.categoryId} onChange={(e)=> setForm({...form, categoryId: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm cursor-pointer ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`}>
                <option value="">Selecione</option>
                {categories.map((c:any)=> <option key={c.id} value={c.id}>{c.name} ({c.defaultRate}%)</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Depreciação anual % *</label>
              <input type="number" step="0.01" value={form.annualRate} onChange={(e)=> setForm({...form, annualRate: e.target.value})} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="10,00" />
            </div>
          </div>
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <button onClick={onClose} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#27272a] border-[#3f3f46] text-white'}`}>Cancelar</button>
          <button disabled={saving} onClick={async ()=> {
            setSaving(true);
            try {
              await onSave({
                companyId: selectedCompanyId,
                supplier: form.supplier,
                acquisitionDate: form.acquisitionDate,
                documentNumber: form.documentNumber,
                description: form.description,
                acquisitionValue: form.acquisitionValue,
                ncm: form.ncm,
                categoryId: form.categoryId || null,
                annualRate: form.annualRate,
              });
            } finally { setSaving(false); }
          }} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"><Save className="w-3.5 h-3.5" /> Salvar bem</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CategoryModal({ isLight, onClose, onSave }: any) {
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
        <div className={`px-4 py-3 border-b flex justify-between items-center ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <h3 className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Nova categoria</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <input value={name} onChange={(e)=> setName(e.target.value)} placeholder="Nome da categoria" className={`w-full px-3 py-2 rounded-lg border text-sm ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} />
          <input value={rate} onChange={(e)=> setRate(e.target.value)} placeholder="Taxa padrão % (ex: 10)" type="number" className={`w-full px-3 py-2 rounded-lg border text-sm ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} />
        </div>
        <div className={`px-4 py-3 border-t flex justify-end gap-2 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <button onClick={onClose} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#27272a] border-[#3f3f46] text-white'}`}>Cancelar</button>
          <button onClick={()=> onSave({ name, defaultRate: Number(rate) })} disabled={!name || !rate} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer">Criar</button>
        </div>
      </div>
    </motion.div>
  );
}

function AssetHistoryModal({ isLight, assetHistory, asset, onClose }: any) {
  if (!assetHistory) {
    return (
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div initial={{scale:0.97}} animate={{scale:1}} className={`w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
          <div className={`px-5 py-4 border-b flex items-center justify-between ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
            <div>
              <div className={`text-sm font-black ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{asset?.description || 'Carregando...'}</div>
              <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>NF {asset?.documentNumber || '—'} • {asset?.supplier || ''}</div>
            </div>
            <button onClick={onClose} className={`p-1.5 rounded-lg cursor-pointer ${isLight ? 'hover:bg-[#e2e8f0]' : 'hover:bg-white/10'}`}><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <span className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Carregando depreciação...</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }
  const { asset: histAsset, schedule, summary } = assetHistory;
  const displayAsset = histAsset || asset;
  const _assetForHeader = displayAsset;
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{scale:0.97}} animate={{scale:1}} className={`w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <div>
            <div className={`text-sm font-black ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{displayAsset.description}</div>
            <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>NF {displayAsset.documentNumber} • {displayAsset.supplier} • {formatDateBR(displayAsset.acquisitionDate)}</div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg cursor-pointer ${isLight ? 'hover:bg-[#e2e8f0]' : 'hover:bg-white/10'}`}><X className="w-4 h-4" /></button>
        </div>

        <div className={`grid grid-cols-4 gap-3 p-4 border-b ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#0d0d10] border-[#27272a]'}`}>
          <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
            <div className={`text-[10px] font-bold uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Valor aquisição</div>
            <div className={`text-sm font-black ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{formatCentsBRL(summary.acquisitionValue)}</div>
          </div>
          <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
            <div className={`text-[10px] font-bold uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Depreciado</div>
            <div className="text-sm font-black text-blue-500">{formatCentsBRL(summary.depreciated)}</div>
          </div>
          <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
            <div className={`text-[10px] font-bold uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Valor atual</div>
            <div className="text-sm font-black text-emerald-500">{formatCentsBRL(summary.currentValue)}</div>
          </div>
          <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
            <div className={`text-[10px] font-bold uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Término previsto</div>
            <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{summary.endCompetence ? competenceLabel(summary.endCompetence) : '—'}</div>
            <div className={`text-xs ${isLight ? 'text-[#94a3b8]' : 'text-[#52525b]'}`}>{summary.annualRate}% a.a.</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className={`sticky top-0 ${isLight ? 'bg-[#f1f5f9] text-[#475569]' : 'bg-[#18181b] text-[#a1a1aa]'}`}>
              <tr>
                <th className="text-left px-4 py-2">Mês</th>
                <th className="text-right px-4 py-2">Depreciação</th>
                <th className="text-right px-4 py-2">Acumulado</th>
                <th className="text-right px-4 py-2">Valor atual</th>
                <th className="text-center px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-[#e2e8f0]' : 'divide-[#27272a]'}`}>
              {schedule.map((m:any)=> (
                <tr key={m.competence} className={`${m.status==='exported' ? (isLight ? 'bg-emerald-50' : 'bg-emerald-500/10') : m.status==='current' ? (isLight ? 'bg-blue-50' : 'bg-blue-500/10') : m.status==='not_issued' ? (isLight ? 'bg-amber-50' : 'bg-amber-500/10') : ''}`}>
                  <td className="px-4 py-2 font-mono font-medium">{m.competence.slice(0,7).split('-').reverse().join('/')}</td>
                  <td className="px-4 py-2 text-right font-bold">{formatCentsBRL(m.depreciationValue)}{m.isFirstProportional ? ' *' : ''}{m.isLastResidual ? ' †' : ''}</td>
                  <td className="px-4 py-2 text-right">{formatCentsBRL(m.accumulatedValue)}</td>
                  <td className="px-4 py-2 text-right">{formatCentsBRL(m.currentValue)}</td>
                  <td className="px-4 py-2 text-center">
                    {m.status==='exported' ? <span className="text-emerald-600 font-bold text-[11px]">✓ Exportado</span> : m.status==='current' ? <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">ATUAL</span> : m.status==='not_issued' ? <span className="bg-amber-500/20 text-amber-600 border border-amber-500/30 px-1.5 py-0.5 rounded text-[10px] font-bold">NÃO LANÇADO</span> : <span className={`px-1.5 py-0.5 rounded text-[10px] ${isLight ? 'bg-[#e2e8f0] text-[#475569]' : 'bg-[#27272a] text-[#71717a]'}`}>Futuro</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={`px-4 py-2 text-[11px] ${isLight ? 'text-[#94a3b8] bg-[#f8fafc] border-t border-[#e2e8f0]' : 'text-[#71717a] bg-[#111114] border-t border-[#27272a]'}`}>
            * proporcional ao 1º mês • † residual final (ajuste de centavos)
          </div>
        </div>

        <div className={`px-4 py-3 border-t flex justify-end ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <button onClick={onClose} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer">Fechar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
