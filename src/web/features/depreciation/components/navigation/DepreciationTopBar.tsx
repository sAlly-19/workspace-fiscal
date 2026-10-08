import React from 'react';
import {
  ArrowLeft,
  TrendingDown,
  Building2,
  Sun,
  Moon,
  Settings,
} from 'lucide-react';
import { cnpjMask } from '../../utils/formatters';

export interface DepreciationTopBarProps {
  onBackToHome?: () => void;
  selectedCompany: any;
  companies: any[];
  selectedCompanyId: string | null;
  onSelectCompany: (id: string | null) => void;
  isLight: boolean;
  onUpdateTheme: (theme: 'light' | 'dark') => void;
  onOpenSettings: () => void;
}

export function DepreciationTopBar({
  onBackToHome,
  selectedCompany,
  companies,
  selectedCompanyId,
  onSelectCompany,
  isLight,
  onUpdateTheme,
  onOpenSettings,
}: DepreciationTopBarProps) {
  return (
    <header className="h-14 border-b border-[var(--border-subtle)] bg-[var(--surface-header)] flex items-center px-4 justify-between shrink-0 select-none shadow-xs gap-3">
      <div className="flex items-center gap-2.5 shrink-0 select-none">
        {onBackToHome && (
          <button
            type="button"
            onClick={onBackToHome}
            className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:scale-95 transition cursor-pointer shrink-0"
            title="Voltar ao Hub Fiscal"
            aria-label="Voltar ao Hub Fiscal"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 text-white shadow-xs shrink-0">
          <TrendingDown className="w-4 h-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight text-[var(--text-primary)]">Controle Patrimonial</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            DEPRECIAÇÃO FISCAL
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {selectedCompany ? (
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-inset)]">
            <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="text-left min-w-0">
              <div className="text-xs font-bold leading-none text-[var(--text-primary)] truncate max-w-[220px]">{selectedCompany.name}</div>
              <div className="text-[11px] font-mono text-[var(--text-muted)]">CNPJ: {selectedCompany.cnpj ? cnpjMask(selectedCompany.cnpj) : selectedCompany.document || '—'}</div>
            </div>
            <select
              value={selectedCompanyId || ''}
              onChange={(e) => onSelectCompany(e.target.value || null)}
              className="ml-2 text-xs rounded-md px-2 py-1 border border-[var(--border-default)] bg-[var(--surface-input)] text-[var(--text-primary)] cursor-pointer"
            >
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        ) : (
          <div className="text-xs text-[var(--text-muted)]">Nenhuma empresa selecionada</div>
        )}

        {/* Quick Theme Switcher Pill */}
        <div className="flex items-center p-0.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-inset)] shrink-0">
          <button
            type="button"
            onClick={() => onUpdateTheme('light')}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              isLight
                ? 'bg-white text-amber-500 shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="Tema Claro"
            aria-label="Ativar tema claro"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onUpdateTheme('dark')}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              !isLight
                ? 'bg-[#27272a] text-blue-400 shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="Tema Escuro"
            aria-label="Ativar tema escuro"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:scale-95 transition cursor-pointer shrink-0"
          title="Configurações do Sistema"
          aria-label="Configurações do Sistema"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
