import React, { useEffect, useState } from 'react';
import {
  Settings,
  X,
  Sparkles,
  LayoutTemplate,
  TrendingDown,
  HardDrive,
  Check,
  ClipboardListIcon,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspace.store';
import { ConfirmModal } from './ConfirmModal';
import { toast } from './Toast';
import { apiFetch } from '../lib/api';
import { WhatsNewModal, CURRENT_APP_VERSION } from './WhatsNewModal';
import { GeneralSettingsTab } from './settings/GeneralSettingsTab';
import { NfViewSettingsTab, DedupePolicy } from './settings/NfViewSettingsTab';
import { DepreciationSettingsTab } from './settings/DepreciationSettingsTab';
import { BackupSettingsTab } from './settings/BackupSettingsTab';
import { BuscadorSettingsTab } from './settings/BuscadorSettingsTab';
import { Search } from 'lucide-react';

export type SettingsTabType = 'general' | 'nfview' | 'depreciation' | 'buscador' | 'backup' | 'logs';

export function SettingsModal({ open, onClose, initialTab = 'general' }: { open?: boolean; onClose?: () => void; initialTab?: SettingsTabType } = {}) {
  const {
    isSettingsOpen: storeIsSettingsOpen,
    setIsSettingsOpen,
    settings,
    updateSettings,
    documents,
    folders,
    resetWorkspaceDatabase,
  } = useWorkspaceStore();

  const isOpen = open ?? storeIsSettingsOpen;
  const close = () => {
    if (onClose) onClose();
    setIsSettingsOpen(false);
  };

  const currentTheme = settings.theme || 'dark';
  const isLight = currentTheme === 'light';

  const [activeTab, setActiveTab] = useState<SettingsTabType>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Reset database state
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Dedupe policy state
  const [dedupePolicy, setDedupePolicy] = useState<DedupePolicy | null>(null);
  const [dedupeSaving, setDedupeSaving] = useState(false);

  // Updates & What's new modal state
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    try {
      let res: any = null;
      if (typeof window !== 'undefined' && window.api?.checkForUpdates) {
        res = await window.api.checkForUpdates();
      } else {
        const r = await apiFetch('/api/updates/check');
        if (r.ok) res = await r.json();
      }
      if (res?.hasUpdate) {
        toast.info('Nova versão disponível', `Versão v${res.latestVersion} encontrada no GitHub!`);
      } else {
        toast.success('Você está atualizado', `O Workspace Fiscal já está na versão mais recente (v${CURRENT_APP_VERSION}).`);
      }
    } catch (e: any) {
      toast.error('Erro na verificação', e.message);
    } finally {
      setCheckingUpdates(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const dp = await apiFetch('/api/settings/dedupe-policy').then((r) => (r.ok ? r.json() : null));
        if (dp) setDedupePolicy(dp);
      } catch (e) {
        console.warn('Falha ao carregar dedupe policy:', e);
      }
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  const saveDedupePolicy = async (policy: DedupePolicy['policy']) => {
    try {
      setDedupeSaving(true);
      const res = await apiFetch('/api/settings/dedupe-policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDedupePolicy(updated);
        toast.success('Política atualizada', `Política de deduplicação configurada para ${policy}.`);
      } else {
        toast.error('Política inválida', 'Use IGNORE, OVERWRITE ou CREATE_VERSION.');
      }
    } catch (e: any) {
      toast.error('Erro ao salvar', e.message);
    } finally {
      setDedupeSaving(false);
    }
  };

  const exportCsv = () => {
    if (documents.length === 0) return;
    const headers = ['ID', 'Tipo', 'Numero', 'Serie', 'Data Emissao', 'Emitente', 'Destinatario', 'Valor Total'];
    const rows = documents.map((d) => [
      d.id,
      d.type || 'NF-e',
      d.number || '',
      d.series || '',
      d.issueDate ? new Date(d.issueDate).toLocaleDateString('pt-BR') : '',
      `"${(d.issuerName || '').replace(/"/g, '""')}"`,
      `"${(d.recipientName || '').replace(/"/g, '""')}"`,
      d.totalAmount ? d.totalAmount.toFixed(2) : '0.00',
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_fiscal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetDatabase = async () => {
    try {
      setIsResetting(true);
      await resetWorkspaceDatabase();
      setIsResetConfirmOpen(false);
      toast.success('Notas fiscais limpas', 'O banco de documentos do NF View foi restaurado com sucesso.');
    } catch (error) {
      console.error('Erro ao resetar banco de dados:', error);
      toast.error('Falha ao limpar notas', 'Ocorreu um erro.');
    } finally {
      setIsResetting(false);
    }
  };

  const tabItems: Array<{ id: SettingsTabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'general', label: 'Geral', icon: Sparkles },
    { id: 'nfview', label: 'NF View', icon: LayoutTemplate },
    { id: 'depreciation', label: 'Depreciação', icon: TrendingDown },
    { id: 'buscador', label: 'Buscador NF', icon: Search },
    { id: 'backup', label: 'Backup & Restauração', icon: HardDrive },
    { id: 'logs', label: 'Registros de Atividade', icon: ClipboardListIcon },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none bg-black/75 backdrop-blur-xs">
        <div
          className={`w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 ${
            isLight
              ? 'bg-white border border-[#cbd5e1] text-[#0f172a] shadow-2xl'
              : 'bg-[#18181b] border border-[#3f3f46] text-white shadow-2xl'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#141418] border-[#27272a]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-sm font-bold tracking-tight ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  Configurações do Sistema
                </h3>
                <p className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  Gerencie preferências gerais, regras fiscais, depreciação e cópias de segurança
                </p>
              </div>
            </div>
            <button
              onClick={close}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLight
                  ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body: Sidebar + Tab Content */}
          <div className="flex flex-1 overflow-hidden min-h-[480px]">
            {/* Sidebar Navigation */}
            <div
              className={`w-52 border-r p-3 space-y-1 shrink-0 ${
                isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
              }`}
            >
              <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-[#94a3b8]' : 'text-[#71717a]'}`}>
                Módulos
              </div>
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                      isActive
                        ? isLight
                          ? 'bg-white text-blue-600 shadow-xs border border-[#cbd5e1]'
                          : 'bg-[#27272a] text-white shadow-xs border border-[#3f3f46]'
                        : isLight
                          ? 'text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
                          : 'text-[#a1a1aa] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'opacity-70'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'general' && (
                <GeneralSettingsTab
                  isLight={isLight}
                  settings={settings}
                  updateSettings={updateSettings}
                  onShowWhatsNew={() => setShowWhatsNew(true)}
                  onCheckUpdates={handleCheckUpdates}
                  checkingUpdates={checkingUpdates}
                />
              )}

              {activeTab === 'nfview' && (
                <NfViewSettingsTab
                  isLight={isLight}
                  settings={settings}
                  updateSettings={updateSettings}
                  dedupePolicy={dedupePolicy}
                  saveDedupePolicy={saveDedupePolicy}
                  dedupeSaving={dedupeSaving}
                  documents={documents}
                  folders={folders}
                  exportCsv={exportCsv}
                  onOpenResetConfirm={() => setIsResetConfirmOpen(true)}
                />
              )}

              {activeTab === 'depreciation' && (
                <DepreciationSettingsTab isLight={isLight} />
              )}

              {activeTab === 'buscador' && (
                <BuscadorSettingsTab isLight={isLight} />
              )}

              {activeTab === 'backup' && (
                <BackupSettingsTab isLight={isLight} />
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            className={`px-6 py-3.5 border-t flex items-center justify-between shrink-0 ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#141418] border-[#27272a]'
            }`}
          >
            <div className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
              Workspace Fiscal v{CURRENT_APP_VERSION}
            </div>
            <button
              onClick={close}
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-xs font-semibold text-white rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Concluído
            </button>
          </div>
        </div>
      </div>

      <WhatsNewModal open={showWhatsNew} onClose={() => setShowWhatsNew(false)} />

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Limpar Documentos do NF View?"
        description="Esta ação apagará permanentemente todos os documentos fiscais importados, histórico e pastas do módulo NF View. Os dados da Depreciação continuarão preservados."
        confirmLabel={isResetting ? 'Limpando...' : 'Sim, Limpar Notas'}
        confirmVariant="danger"
        isLoading={isResetting}
        onConfirm={handleResetDatabase}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </>
  );
}

