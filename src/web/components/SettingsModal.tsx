import { useState } from 'react';
import {
  Settings,
  X,
  Database,
  Info,
  Download,
  Check,
  Moon,
  Sun,
  Sparkles,
  LayoutTemplate,
  Trash2,
  AlertTriangle,
  Keyboard
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspace.store';
import { ConfirmModal } from './ConfirmModal';

export function SettingsModal() {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    updateSettings,
    documents,
    folders,
    resetWorkspaceDatabase
  } = useWorkspaceStore();

  const currentTheme = settings.theme || 'dark';
  const isLight = currentTheme === 'light';

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  if (!isSettingsOpen) return null;

  const exportCsv = () => {
    if (documents.length === 0) return;
    const headers = ['ID', 'Tipo', 'Numero', 'Serie', 'Data Emissao', 'Emitente', 'Destinatario', 'Valor Total'];
    const rows = documents.map(d => [
      d.id,
      d.type || 'NF-e',
      d.number || '',
      d.series || '',
      d.issueDate ? new Date(d.issueDate).toLocaleDateString('pt-BR') : '',
      `"${(d.issuerName || '').replace(/"/g, '""')}"`,
      `"${(d.recipientName || '').replace(/"/g, '""')}"`,
      d.totalAmount ? d.totalAmount.toFixed(2) : '0.00'
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
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
      setIsSettingsOpen(false);
    } catch (error) {
      console.error('Erro ao resetar banco de dados:', error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none bg-black/75 backdrop-blur-xs">
        <div
          className={`w-full max-w-xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 ${
            isLight
              ? 'bg-white border border-[#cbd5e1] text-[#0f172a] shadow-2xl'
              : 'bg-[#18181b] border border-[#3f3f46] text-white shadow-2xl'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#141418] border-[#27272a]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-sm font-bold tracking-tight ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Configurações do Sistema</h3>
                <p className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Temas, preferências de DANFE e banco de dados</p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLight
                  ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">

            {/* Section 1: Tema da Interface */}
            <div>
              <div className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Tema da Interface</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => updateSettings({ theme: 'light' })}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    isLight
                      ? 'border-blue-500 bg-blue-50 text-blue-950 shadow-md ring-2 ring-blue-500/20'
                      : 'border-[#27272a] bg-[#111114] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-xs">Light</div>
                    <div className="text-[10px] opacity-70">Claro e Limpo</div>
                  </div>
                  {isLight && (
                    <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Ativo
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => updateSettings({ theme: 'dark' })}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    currentTheme === 'dark'
                      ? 'border-blue-500 bg-blue-500/15 text-white shadow-md ring-2 ring-blue-500/20'
                      : isLight
                        ? 'border-[#cbd5e1] bg-white text-[#64748b] hover:border-[#94a3b8] hover:text-[#0f172a]'
                        : 'border-[#27272a] bg-[#111114] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-xs">Dark</div>
                    <div className="text-[10px] opacity-70">Escuro Padrão</div>
                  </div>
                  {currentTheme === 'dark' && (
                    <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Ativo
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Section 2: Preferências do DANFE */}
            <div>
              <div className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                <LayoutTemplate className="w-4 h-4 text-blue-400" />
                <span>Layout e Emissão do DANFE</span>
              </div>

              <div
                className={`space-y-3 rounded-xl p-4 border ${
                  isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
                }`}
              >
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className={`font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Exibir Canhoto de Recebimento</div>
                    <div className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                      Inclui a seção de canhoto e assinatura no topo da página
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showReceiptStub}
                    onChange={(e) => updateSettings({ showReceiptStub: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <div
                  className={`pt-2.5 border-t flex items-center justify-between ${
                    isLight ? 'border-[#e2e8f0]' : 'border-[#27272a]'
                  }`}
                >
                  <div>
                    <div className={`font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Formato Padrão de Folha</div>
                    <div className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Dimensão recomendada para emissão</div>
                  </div>
                  <select
                    value={settings.defaultFormat}
                    onChange={(e) => updateSettings({ defaultFormat: e.target.value as 'A4' | 'A5' })}
                    className={`text-xs rounded-md px-2.5 py-1 focus:outline-none focus:border-blue-500 border cursor-pointer ${
                      isLight
                        ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                        : 'bg-[#18181b] border-[#3f3f46] text-white'
                    }`}
                  >
                    <option value="A4" className="bg-[#18181b] text-white">A4 Retrato (210 x 297 mm)</option>
                    <option value="A5" className="bg-[#18181b] text-white">A5 Paisagem</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Dados e Exportação */}
            <div>
              <div className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                <Database className="w-4 h-4 text-green-400" />
                <span>Armazenamento & Exportação</span>
              </div>

              <div
                className={`rounded-xl p-4 space-y-3 border ${
                  isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}>Estatísticas do Workspace:</span>
                    <div className={`font-medium mt-0.5 ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                      <strong className="text-blue-400">{documents.length}</strong> documentos carregados em <strong className="text-blue-400">{folders.length}</strong> pastas
                    </div>
                  </div>
                  <button
                    onClick={exportCsv}
                    disabled={documents.length === 0}
                    className={`px-3 py-1.5 border rounded-md font-medium text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                      isLight
                        ? 'bg-white hover:bg-[#e2e8f0] text-[#0f172a] border-[#cbd5e1]'
                        : 'bg-[#18181b] hover:bg-[#27272a] text-white border-[#3f3f46]'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-green-400" />
                    Exportar CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Section 4: Atalhos de Teclado */}
            <div>
              <div className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                <Keyboard className="w-4 h-4 text-purple-400" />
                <span>Atalhos de Teclado (Power User)</span>
              </div>

              <div
                className={`rounded-xl p-4 text-xs space-y-2.5 border ${
                  isLight
                    ? 'bg-[#f8fafc] border-[#e2e8f0]'
                    : 'bg-[#111114] border-[#27272a] text-[#d4d4d8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}>Focar campo de busca:</span>
                  <div className="flex items-center gap-1">
                    <kbd className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-white'}`}>Ctrl + F</kbd>
                    <span className="text-[11px] text-gray-500">ou</span>
                    <kbd className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-white'}`}>/</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}>Navegar entre as notas na lista:</span>
                  <div className="flex items-center gap-1">
                    <kbd className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-white'}`}>↑</kbd>
                    <kbd className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-white'}`}>↓</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}>Abrir modal de exclusão para notas selecionadas:</span>
                  <kbd className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-white'}`}>Delete</kbd>
                </div>

                <div className="flex items-center justify-between">
                  <span className={isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}>Imprimir DANFE atual:</span>
                  <kbd className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-white'}`}>Ctrl + P</kbd>
                </div>
              </div>
            </div>

            {/* Section 5: Limpeza do Banco de Dados */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-red-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Zona de Limpeza (Reset do BD)</span>
              </div>

              <div
                className={`border rounded-xl p-4 flex items-center justify-between gap-4 ${
                  isLight
                    ? 'bg-red-50 border-red-200'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <div>
                  <div className={`font-semibold ${isLight ? 'text-red-900' : 'text-red-200'}`}>Limpar Todo o Banco de Dados</div>
                  <div className={`text-[11px] mt-0.5 ${isLight ? 'text-red-700' : 'text-red-200/80'}`}>
                    Apaga todos os documentos fiscais (XML/PDF), histórico de importações e pastas criadas.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold text-xs rounded-lg shadow-md flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar BD
                </button>
              </div>
            </div>

            {/* Section 6: Sobre o Sistema */}
            <div>
              <div className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                <Info className="w-4 h-4 text-amber-400" />
                <span>Sobre o Sistema</span>
              </div>

              <div
                className={`rounded-xl p-4 text-[11px] space-y-3 border ${
                  isLight
                    ? 'bg-[#f8fafc] border-[#e2e8f0] text-[#64748b]'
                    : 'bg-[#111114] border-[#27272a] text-[#a1a1aa]'
                }`}
              >
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <img
                    src="/icon.png"
                    alt="Workspace Fiscal"
                    className="w-12 h-12 rounded-xl object-cover shadow-md border border-blue-400/30"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className={`font-bold text-sm ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                      Workspace Fiscal
                    </div>
                    <div className="text-[10px] text-blue-400 font-medium">
                      Hub Fiscal • NF View (DANFE) + Depreciação
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span>Versão do Aplicativo:</span>
                  <span className={`font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>v2.5.0 (Workspace Fiscal Pro)</span>
                </div>
                <div className="flex justify-between">
                  <span>Formatos Suportados:</span>
                  <span className={`font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>NF-e (Mod. 55), NFC-e (Mod. 65), CT-e (Mod. 57), NFS-e (Sefin & ABRASF)</span>
                </div>
                <div className="flex justify-between">
                  <span>Layout de Impressão:</span>
                  <span className={`font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Padrão Nacional SEFAZ (A4 / PDF)</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span>Desenvolvimento:</span>
                  <span className="font-bold text-blue-400">Café - Sistemas & Softwares</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className={`px-5 py-3.5 border-t flex items-center justify-end shrink-0 ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#141418] border-[#27272a]'
            }`}
          >
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-xs font-semibold text-white rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Concluído
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Limpar Banco de Dados Completo?"
        description="Esta ação é permanente e irreversível. Todos os documentos fiscais importados, pastas e vínculos serão apagados do sistema."
        confirmLabel={isResetting ? "Limpando..." : "Sim, Limpar Tudo"}
        confirmVariant="danger"
        isLoading={isResetting}
        onConfirm={handleResetDatabase}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </>
  );
}
