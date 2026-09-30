import React from 'react';
import {
  LayoutTemplate,
  Copy,
  Database,
  Download,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { AppSettings, DocumentItem, FolderNode } from '../../stores/workspace.store';

export interface DedupePolicy {
  policy: 'IGNORE' | 'OVERWRITE' | 'CREATE_VERSION';
  updatedAt: string | null;
}

interface NfViewSettingsTabProps {
  isLight: boolean;
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  dedupePolicy: DedupePolicy | null;
  saveDedupePolicy: (policy: DedupePolicy['policy']) => Promise<void>;
  dedupeSaving: boolean;
  documents: DocumentItem[];
  folders: FolderNode[];
  exportCsv: () => void;
  onOpenResetConfirm: () => void;
}

export function NfViewSettingsTab({
  isLight,
  settings,
  updateSettings,
  dedupePolicy,
  saveDedupePolicy,
  dedupeSaving,
  documents,
  folders,
  exportCsv,
  onOpenResetConfirm,
}: NfViewSettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* 1. Preferências do DANFE */}
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
                Inclui a seção de canhoto e assinatura no topo da página ao imprimir
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.showReceiptStub}
              onChange={(e) => updateSettings({ showReceiptStub: e.target.checked })}
              className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer pt-2.5 border-t border-white/10">
            <div>
              <div className={`font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Abrir Diálogo de Impressão Automaticamente</div>
              <div className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                Dispara o comando de impressão do sistema imediatamente ao visualizar um documento
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoOpenPrint}
              onChange={(e) => updateSettings({ autoOpenPrint: e.target.checked })}
              className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>

          <div
            className={`pt-2.5 border-t flex items-center justify-between ${
              isLight ? 'border-[#e2e8f0]' : 'border-white/10'
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

      {/* 2. Política de Deduplicação */}
      <div>
        <div className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
          <Copy className="w-4 h-4 text-amber-400" />
          <span>Política de Deduplicação na Importação</span>
        </div>

        <div
          className={`rounded-xl p-4 space-y-3 border ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
          }`}
        >
          <p className={`text-[11px] leading-relaxed ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            Define a ação automática quando você importa um XML cuja chave de acesso já existe no banco.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(['IGNORE', 'OVERWRITE', 'CREATE_VERSION'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => saveDedupePolicy(p)}
                disabled={dedupeSaving || dedupePolicy?.policy === p}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer disabled:cursor-not-allowed ${
                  dedupePolicy?.policy === p
                    ? 'border-blue-500 bg-blue-500/15 text-blue-400 shadow-sm ring-1 ring-blue-500/30'
                    : isLight
                      ? 'border-[#cbd5e1] bg-white text-[#475569] hover:border-blue-400 hover:text-blue-700'
                      : 'border-[#27272a] bg-[#18181b] text-[#a1a1aa] hover:border-blue-500/60 hover:text-white'
                }`}
              >
                {p === 'IGNORE' && 'Ignorar'}
                {p === 'OVERWRITE' && 'Sobrescrever'}
                {p === 'CREATE_VERSION' && 'Versionar'}
              </button>
            ))}
          </div>
          <p className={`text-[10px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
            Atual: <strong className="font-mono">{dedupePolicy?.policy ?? 'IGNORE'}</strong>
            {dedupePolicy?.updatedAt && (
              <> · salvo em {new Date(dedupePolicy.updatedAt).toLocaleString('pt-BR')}</>
            )}
          </p>
        </div>
      </div>

      {/* 3. Armazenamento e Estatísticas do NF View */}
      <div>
        <div className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
          <Database className="w-4 h-4 text-green-400" />
          <span>Estatísticas de Documentos</span>
        </div>

        <div
          className={`rounded-xl p-4 space-y-3 border ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className={isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}>Total de Documentos no Banco:</span>
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
              Exportar Lista (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* 4. Zona de Limpeza de Documentos */}
      <div>
        <div className="flex items-center gap-2 mb-3 text-red-400 font-bold text-xs uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4" />
          <span>Zona de Limpeza (Reset do Módulo NF View)</span>
        </div>

        <div
          className={`border rounded-xl p-4 flex items-center justify-between gap-4 ${
            isLight ? 'bg-red-50 border-red-200' : 'bg-red-500/10 border-red-500/30'
          }`}
        >
          <div>
            <div className={`font-semibold ${isLight ? 'text-red-900' : 'text-red-200'}`}>Limpar Documentos do NF View</div>
            <div className={`text-[11px] mt-0.5 ${isLight ? 'text-red-700' : 'text-red-200/80'}`}>
              Apaga exclusivamente todos os documentos fiscais (XML/PDF), pastas e histórico de importações. Seus dados de depreciação serão preservados.
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenResetConfirm}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold text-xs rounded-lg shadow-md flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar Notas
          </button>
        </div>
      </div>
    </div>
  );
}

