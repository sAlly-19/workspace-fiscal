import { AnimatePresence } from 'motion/react';
import { apiFetch } from '../../../../lib/api';
import { toast } from '../../../../components/Toast';
import { ConfirmModal } from '../../../../components/ConfirmModal';
import { RetroactiveBatchModal } from '../../RetroactiveBatchModal';
import { CsvLayoutModal, type CsvExportOptions } from '../../CsvLayoutModal';
import { getLastClosedCompetence, competenceFromDate } from '../../utils/formatters';
import { CompanyModal } from './CompanyModal';
import { AssetModal } from './AssetModal';
import { CategoryModal } from './CategoryModal';
import { AssetHistoryModal } from './AssetHistoryModal';
import { DisposeModal } from './DisposeModal';
import { ExportConflictModal } from './ExportConflictModal';
import { RetroactivePromptModal } from './RetroactivePromptModal';

export interface DepreciationModalsProps {
  isLight: boolean;
  currentTheme: string;
  selectedCompany: any;
  selectedCompanyId: string | null;
  categories: any[];
  assets: any[];
  competence: string;
  monthly: any;

  showCompanyModal: boolean;
  setShowCompanyModal: (show: boolean) => void;
  editingCompany: any;
  updateCompany: (id: string, data: any) => Promise<any>;
  createCompany: (data: any) => Promise<any>;

  showAssetModal: boolean;
  setShowAssetModal: (show: boolean) => void;
  editingAsset: any;
  updateAsset: (id: string, data: any) => Promise<any>;
  createAsset: (data: any) => Promise<any>;

  showCategoryModal: boolean;
  setShowCategoryModal: (show: boolean) => void;
  editingCategory: any;
  setEditingCategory: (cat: any) => void;
  updateCategory: (id: string, data: any) => Promise<any>;
  createCategory: (data: any) => Promise<any>;

  selectedAsset: any;
  setSelectedAsset: (asset: any) => void;
  assetHistory: any;
  setAssetHistory: (history: any) => void;
  openAssetHistory: (asset: any) => Promise<void>;

  exportConflict: any;
  setExportConflict: (conflict: any) => void;
  pendingExportOptions: CsvExportOptions | null;
  handleExportWithOptions: (options: CsvExportOptions, force?: boolean) => Promise<void>;

  retroactivePrompt: { asset: any; startComp: string; endComp: string; count: number } | null;
  setRetroactivePrompt: (prompt: any) => void;
  isRetroGenerating: boolean;
  setIsRetroGenerating: (val: boolean) => void;

  disposeTarget: any;
  setDisposeTarget: (target: any) => void;
  disposeDate: string;
  setDisposeDate: (date: string) => void;
  disposeReason: string;
  setDisposeReason: (reason: string) => void;
  isDisposing: boolean;
  setIsDisposing: (val: boolean) => void;
  disposeAsset: (id: string, date: string, reason: string) => Promise<any>;

  confirmDelete: { type: 'company' | 'asset' | 'category'; id: string; name: string } | null;
  setConfirmDelete: (val: any) => void;
  deleteCompany: (id: string) => Promise<any>;
  deleteAsset: (id: string) => Promise<any>;
  deleteCategory: (id: string) => Promise<any>;

  reactivateTarget: any;
  setReactivateTarget: (target: any) => void;
  isReactivating: boolean;
  setIsReactivating: (val: boolean) => void;
  reactivateAsset: (id: string) => Promise<any>;

  showRetroBatchModal: boolean;
  setShowRetroBatchModal: (show: boolean) => void;
  selectedAssetIds: Set<string>;
  setSelectedAssetIds: (ids: Set<string>) => void;

  showCsvLayoutModal: boolean;
  setShowCsvLayoutModal: (show: boolean) => void;
  isGenerating: boolean;

  fetchMonthly: () => Promise<void>;
  fetchDashboard: () => Promise<void>;
}

export function DepreciationModals({
  isLight,
  currentTheme,
  selectedCompany,
  selectedCompanyId,
  categories,
  assets,
  competence,
  monthly,
  showCompanyModal,
  setShowCompanyModal,
  editingCompany,
  updateCompany,
  createCompany,
  showAssetModal,
  setShowAssetModal,
  editingAsset,
  updateAsset,
  createAsset,
  showCategoryModal,
  setShowCategoryModal,
  editingCategory,
  setEditingCategory,
  updateCategory,
  createCategory,
  selectedAsset,
  setSelectedAsset,
  assetHistory,
  setAssetHistory,
  openAssetHistory,
  exportConflict,
  setExportConflict,
  pendingExportOptions,
  handleExportWithOptions,
  retroactivePrompt,
  setRetroactivePrompt,
  isRetroGenerating,
  setIsRetroGenerating,
  disposeTarget,
  setDisposeTarget,
  disposeDate,
  setDisposeDate,
  disposeReason,
  setDisposeReason,
  isDisposing,
  setIsDisposing,
  disposeAsset,
  confirmDelete,
  setConfirmDelete,
  deleteCompany,
  deleteAsset,
  deleteCategory,
  reactivateTarget,
  setReactivateTarget,
  isReactivating,
  setIsReactivating,
  reactivateAsset,
  showRetroBatchModal,
  setShowRetroBatchModal,
  selectedAssetIds,
  setSelectedAssetIds,
  showCsvLayoutModal,
  setShowCsvLayoutModal,
  isGenerating,
  fetchMonthly,
  fetchDashboard,
}: DepreciationModalsProps) {
  return (
    <>
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
                const created = (await createAsset(data)) as any;
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
                    setRetroactivePrompt({
                      asset: created || { description: data.description, documentNumber: data.documentNumber },
                      startComp,
                      endComp: lastClosed,
                      count,
                    });
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
            onClose={() => {
              setShowCategoryModal(false);
              setEditingCategory(null);
            }}
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
            onClose={() => {
              setSelectedAsset(null);
              setAssetHistory(null);
            }}
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
              body: JSON.stringify({ companyId: selectedCompanyId, assetId: retroactivePrompt.asset.id }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: 'Erro' }));
              throw new Error(err.error || 'Falha ao gerar retroativa');
            }
            const data = await res.json();
            // Download
            const dlRes = await apiFetch(
              `/api/depreciation/retroactive/csv?companyId=${selectedCompanyId}&assetId=${retroactivePrompt.asset.id}`
            );
            if (dlRes.ok) {
              const blob = await dlRes.blob();
              const rawText = await blob.text();
              const csvText = rawText.startsWith('\uFEFF') ? rawText : '\uFEFF' + rawText;
              if ((window as any).api?.saveFileDialog) {
                const save = await (window as any).api.saveFileDialog({
                  defaultPath: data.filename,
                  filters: [{ name: 'CSV', extensions: ['csv'] }],
                });
                if (!save.canceled && save.filePath) {
                  await (window as any).api.writeFile(save.filePath, csvText);
                }
              } else {
                const csvBlob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(csvBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = data.filename;
                a.click();
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
    </>
  );
}

