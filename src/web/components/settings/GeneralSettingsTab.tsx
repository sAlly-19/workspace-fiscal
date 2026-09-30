import React from 'react';
import {
  Sparkles,
  Sun,
  Moon,
  Check,
  Keyboard,
  Info,
  RefreshCw,
} from 'lucide-react';
import { AppSettings } from '../../stores/workspace.store';
import { CURRENT_APP_VERSION } from '../WhatsNewModal';

interface GeneralSettingsTabProps {
  isLight: boolean;
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  onShowWhatsNew: () => void;
  onCheckUpdates: () => void;
  checkingUpdates: boolean;
}

export function GeneralSettingsTab({
  isLight,
  settings,
  updateSettings,
  onShowWhatsNew,
  onCheckUpdates,
  checkingUpdates,
}: GeneralSettingsTabProps) {
  const currentTheme = settings.theme || 'dark';

  return (
    <div className="space-y-6">
      {/* 1. Tema da Interface */}
      <div>
        <div className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Tema da Interface</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateSettings({ theme: 'light' })}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
              isLight
                ? 'border-blue-500 bg-blue-50 text-blue-950 shadow-md ring-2 ring-blue-500/20'
                : 'border-[#27272a] bg-[#111114] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white'
            }`}
          >
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
              <Sun className="w-5 h-5" />
            </div>
            <div className="text-center">
              <div className="font-bold text-xs">Modo Claro (Light)</div>
              <div className="text-[10px] opacity-70">Visual limpo para ambientes claros</div>
            </div>
            {isLight && (
              <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Selecionado
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => updateSettings({ theme: 'dark' })}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
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
              <div className="font-bold text-xs">Modo Escuro (Dark)</div>
              <div className="text-[10px] opacity-70">Conforto visual padrão para produtividade</div>
            </div>
            {currentTheme === 'dark' && (
              <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Selecionado
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Atalhos de Teclado */}
      <div>
        <div className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
          <Keyboard className="w-4 h-4 text-purple-400" />
          <span>Atalhos de Teclado Rápidos</span>
        </div>

        <div
          className={`rounded-xl p-4 text-xs space-y-2.5 border ${
            isLight
              ? 'bg-[#f8fafc] border-[#e2e8f0]'
              : 'bg-[#111114] border-[#27272a] text-[#d4d4d8]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}>Focar campo de busca de notas:</span>
            <div className="flex items-center gap-1">
              <kbd className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-white'}`}>Ctrl + F</kbd>
              <span className="text-[11px] text-gray-500">ou</span>
              <kbd className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-white'}`}>/</kbd>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className={isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}>Navegar entre documentos na lista:</span>
            <div className="flex items-center gap-1">
              <kbd className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-white'}`}>↑</kbd>
              <kbd className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-white'}`}>↓</kbd>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className={isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}>Imprimir documento / DANFE em foco:</span>
            <kbd className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-white'}`}>Ctrl + P</kbd>
          </div>
        </div>
      </div>

      {/* 3. Sobre o Sistema */}
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
          <div className="flex items-center justify-between">
            <span>Versão Instalada:</span>
            <span className={`font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>v{CURRENT_APP_VERSION}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Formatos Suportados:</span>
            <span className={`font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>NF-e (55), NFC-e (65), CT-e (57), NFS-e (Sefin & ABRASF)</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Módulos Ativos:</span>
            <span className={`font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>NF View (Visualizador DANFE) + Depreciação Patrimonial</span>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onCheckUpdates}
              disabled={checkingUpdates}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors ${
                isLight
                  ? 'bg-white hover:bg-[#f1f5f9] border-[#cbd5e1] text-[#334155]'
                  : 'bg-[#18181b] hover:bg-[#27272a] border-[#3f3f46] text-[#e4e4e7]'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdates ? 'animate-spin text-blue-500' : ''}`} />
              <span>{checkingUpdates ? 'Verificando...' : 'Verificar Atualizações'}</span>
            </button>

            <button
              type="button"
              onClick={onShowWhatsNew}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Novidades da Versão</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

