import {
  FileText,
  Table,
  Code2,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  Download,
  Printer,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  PackagePlus,
  MoreVertical,
} from 'lucide-react';
import React from 'react';
import { motion } from 'motion/react';
import { resolveFiscalStatus } from './fiscal-status.utils';

export type PreviewMode = 'visualizar' | 'dados' | 'xml';

interface TabItem {
  id: PreviewMode;
  label: string;
  shortLabel?: string;
  icon: typeof FileText;
}

const TABS: TabItem[] = [
  { id: 'visualizar', label: 'DANFE (PDF)', shortLabel: 'DANFE', icon: FileText },
  { id: 'dados', label: 'Dados da Nota', shortLabel: 'Dados', icon: Table },
  { id: 'xml', label: 'XML Original', shortLabel: 'XML', icon: Code2 },
];

export interface MoreActionsDropdownProps {
  currentTheme: string;
  accessKey?: string;
  copiedKey: boolean;
  handleCopyKey: () => void;
  mode: PreviewMode;
  copiedXml: boolean;
  handleCopyXml: () => void;
  handleDownloadXml: () => void;
  onDepreciate?: () => void;
  isOpen?: boolean;
}

export function MoreActionsDropdown({
  currentTheme,
  accessKey,
  copiedKey,
  handleCopyKey,
  mode,
  copiedXml,
  handleCopyXml,
  handleDownloadXml,
  onDepreciate,
  isOpen,
}: MoreActionsDropdownProps) {
  return (
    <details
      className="relative shrink-0 group"
      open={isOpen}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          e.currentTarget.removeAttribute('open');
        }
      }}
    >
      <summary
        title="Mais ações do documento"
        aria-label="Mais ações"
        className={`list-none [&::-webkit-details-marker]:hidden p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center select-none ${
          currentTheme === 'light'
            ? 'bg-white hover:bg-[#f1f5f9] text-[#475569] hover:text-[#0f172a] border-[#cbd5e1] group-open:bg-[#e2e8f0] group-open:border-[#94a3b8] group-open:text-[#0f172a]'
            : 'bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white border-[#27272a] group-open:bg-[#27272a] group-open:border-[#3f3f46] group-open:text-white'
        }`}
      >
        <MoreVertical className="w-4 h-4" />
      </summary>

      <div
        role="menu"
        className={`absolute right-0 top-full mt-1.5 w-56 rounded-xl border p-1 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 ${
          currentTheme === 'light'
            ? 'bg-white border-[#e2e8f0] text-[#0f172a] shadow-slate-300/50'
            : 'bg-[#18181b] border-[#27272a] text-[#fafafa] shadow-black/80'
        }`}
      >
        {accessKey && (
          <button
            type="button"
            role="menuitem"
            onClick={handleCopyKey}
            className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg transition-colors cursor-pointer text-left ${
              currentTheme === 'light'
                ? 'hover:bg-[#f1f5f9] text-[#334155]'
                : 'hover:bg-[#27272a] text-[#d4d4d8]'
            }`}
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey ? 'Chave copiada!' : 'Copiar Chave de Acesso'}</span>
          </button>
        )}

        <button
          type="button"
          role="menuitem"
          onClick={(e) => {
            handleDownloadXml();
            e.currentTarget.closest('details')?.removeAttribute('open');
          }}
          className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg transition-colors cursor-pointer text-left ${
            currentTheme === 'light'
              ? 'hover:bg-[#f1f5f9] text-[#334155]'
              : 'hover:bg-[#27272a] text-[#d4d4d8]'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Baixar Arquivo XML</span>
        </button>

        {mode === 'xml' && (
          <button
            type="button"
            role="menuitem"
            onClick={handleCopyXml}
            className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg transition-colors cursor-pointer text-left ${
              currentTheme === 'light'
                ? 'hover:bg-[#f1f5f9] text-[#334155]'
                : 'hover:bg-[#27272a] text-[#d4d4d8]'
            }`}
          >
            {copiedXml ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedXml ? 'XML copiado!' : 'Copiar Conteúdo XML'}</span>
          </button>
        )}

        {onDepreciate && (
          <>
            <div
              className={`my-1 border-t ${
                currentTheme === 'light' ? 'border-[#e2e8f0]' : 'border-[#27272a]'
              }`}
            />
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                onDepreciate();
                e.currentTarget.closest('details')?.removeAttribute('open');
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left ${
                currentTheme === 'light'
                  ? 'hover:bg-emerald-50 text-emerald-700'
                  : 'hover:bg-emerald-950/40 text-emerald-400'
              }`}
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Depreciar Nota (Imobilizado)</span>
            </button>
          </>
        )}
      </div>
    </details>
  );
}

export interface PreviewToolbarProps {
  currentTheme: string;
  mode: PreviewMode;
  setMode: (mode: PreviewMode) => void;
  onBackToList?: () => void;
  // Zoom
  zoomLevel: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  handleFitWidth: () => void;
  // Ações
  accessKey?: string;
  copiedKey: boolean;
  handleCopyKey: () => void;
  copiedXml: boolean;
  handleCopyXml: () => void;
  handleDownloadXml: () => void;
  handlePrint: () => void;
  onDepreciate?: () => void;
  // Status Fiscal (IMP-019)
  protocolStatus?: string;
  hasAuthorizationProtocol?: boolean;
  documentStatus?: string;
  // Busca Local na Nota
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  searchCurrentIndex?: number;
  searchTotalCount?: number;
  onSearchNext?: () => void;
  onSearchPrev?: () => void;
  onSearchClear?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function PreviewToolbar({
  currentTheme,
  mode,
  setMode,
  onBackToList,
  zoomLevel,
  handleZoomIn,
  handleZoomOut,
  handleZoomReset,
  handleFitWidth,
  accessKey,
  copiedKey,
  handleCopyKey,
  copiedXml,
  handleCopyXml,
  handleDownloadXml,
  handlePrint,
  onDepreciate,
  protocolStatus,
  hasAuthorizationProtocol,
  documentStatus,
  searchTerm,
  setSearchTerm,
  searchCurrentIndex,
  searchTotalCount,
  onSearchNext,
  onSearchPrev,
  onSearchClear,
  searchInputRef,
}: PreviewToolbarProps) {
  const statusInfo = resolveFiscalStatus({
    protocolStatus,
    hasAuthorizationProtocol,
    documentStatus,
  });

  return (
    <div
      className={`min-h-[48px] py-1.5 border-b flex items-center px-3 md:px-4 justify-between shrink-0 print:hidden gap-2 ${
        currentTheme === 'light' ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
      }`}
    >
      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile Back Button */}
        {onBackToList && (
          <button
            onClick={onBackToList}
            className={`lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              currentTheme === 'light'
                ? 'bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] border-[#cbd5e1]'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
            }`}
            title="Voltar à lista de documentos"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Lista</span>
          </button>
        )}

        {/* Mode Switcher with Animated Tab Indicator - 100% UNTOUCHED */}
        <div
          className={`flex items-center gap-1 p-0.5 rounded-xl border relative ${
            currentTheme === 'light' ? 'bg-[#f1f5f9] border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
          }`}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = mode === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={`relative flex items-center gap-1.5 px-2.5 md:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer select-none z-10 ${
                  isActive
                    ? 'text-white'
                    : currentTheme === 'light'
                    ? 'text-[#475569] hover:text-[#0f172a] hover:bg-white/60'
                    : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="previewActiveTabPill"
                    className={`absolute inset-0 rounded-lg shadow-md ${
                      currentTheme === 'light' ? 'bg-blue-600' : 'bg-blue-600 shadow-blue-500/20'
                    }`}
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 32,
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Zoom Controls (Active in Visualizar mode) */}
        {mode === 'visualizar' && (
          <div
            className={`flex items-center gap-0.5 px-1 py-0.5 rounded-xl border select-none ${
              currentTheme === 'light'
                ? 'bg-[#f1f5f9] border-[#e2e8f0] text-[#334155]'
                : 'bg-[#09090b] border-[#27272a] text-[#fafafa]'
            }`}
          >
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
              title="Diminuir Zoom (Ctrl -)"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                currentTheme === 'light'
                  ? 'hover:bg-white text-[#475569]'
                  : 'hover:bg-[#18181b] text-[#a1a1aa] hover:text-white'
              }`}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomReset}
              title="Resetar Zoom para 100% (Ctrl 0)"
              className={`px-1.5 py-1 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer min-w-[48px] text-center ${
                currentTheme === 'light' ? 'hover:bg-white text-blue-600' : 'hover:bg-[#18181b] text-blue-400'
              }`}
            >
              {zoomLevel}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 250}
              title="Aumentar Zoom (Ctrl +)"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                currentTheme === 'light'
                  ? 'hover:bg-white text-[#475569]'
                  : 'hover:bg-[#18181b] text-[#a1a1aa] hover:text-white'
              }`}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div
              className={`w-[1px] h-3.5 mx-0.5 ${
                currentTheme === 'light' ? 'bg-[#cbd5e1]' : 'bg-[#27272a]'
              }`}
            />
            <button
              onClick={handleFitWidth}
              title="Ajustar à largura da janela"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                currentTheme === 'light'
                  ? 'hover:bg-white text-[#475569]'
                  : 'hover:bg-[#18181b] text-[#a1a1aa] hover:text-white'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Right Controls: Search, Status, Print, More Actions Dropdown */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {/* In-Document Search Input */}
        {setSearchTerm && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs transition-all ${
              currentTheme === 'light'
                ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#0f172a] focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20'
                : 'bg-[#09090b] border-[#27272a] text-[#fafafa] focus-within:border-blue-500 focus-within:bg-[#18181b] focus-within:ring-2 focus-within:ring-blue-500/20'
            }`}
          >
            <Search className="w-3.5 h-3.5 opacity-50 shrink-0" />
            <input
              ref={searchInputRef as any}
              type="text"
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) {
                    onSearchPrev?.();
                  } else {
                    onSearchNext?.();
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onSearchClear?.();
                  if (searchInputRef && 'current' in searchInputRef && searchInputRef.current) {
                    searchInputRef.current.blur();
                  }
                }
              }}
              placeholder="Buscar na nota... (Ctrl+F)"
              className="bg-transparent border-none outline-none text-xs w-24 sm:w-32 md:w-40 focus:w-44 transition-all duration-200 placeholder:opacity-50"
            />
            {searchTerm && (
              <div className="flex items-center gap-0.5 shrink-0 ml-1">
                <span
                  className={`text-[10px] font-mono px-1 py-0.5 rounded font-semibold ${
                    searchTotalCount && searchTotalCount > 0
                      ? currentTheme === 'light'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-blue-950 text-blue-300'
                      : currentTheme === 'light'
                      ? 'bg-slate-200 text-slate-500'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {searchTotalCount && searchTotalCount > 0
                    ? `${(searchCurrentIndex ?? 0) + 1}/${searchTotalCount}`
                    : '0/0'}
                </span>
                <button
                  type="button"
                  onClick={onSearchPrev}
                  disabled={!searchTotalCount || searchTotalCount === 0}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  title="Ocorrência Anterior (Shift+Enter / ↑)"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={onSearchNext}
                  disabled={!searchTotalCount || searchTotalCount === 0}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  title="Próxima Ocorrência (Enter / ↓)"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={onSearchClear}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Limpar busca (Esc)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Status Fiscal Pill (IMP-019) */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}
          title={statusInfo.description}
        >
          {statusInfo.category === 'AUTHORIZED' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          {statusInfo.category === 'CANCELLED_DENIED' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
          {statusInfo.category === 'UNAUTHORIZED_OR_DRAFT' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
          <span>{statusInfo.badgeText}</span>
        </div>

        <div
          className={`w-[1px] h-4 mx-0.5 ${
            currentTheme === 'light' ? 'bg-[#cbd5e1]' : 'bg-[#27272a]'
          }`}
        />

        {/* Primary Action Button: Print / PDF */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 md:gap-2 px-3 md:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-medium rounded-lg text-xs shadow-md transition-all cursor-pointer shrink-0"
          title="Imprimir ou Salvar em PDF (A4)"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir / PDF</span>
        </button>

        {/* Secondary Actions Dropdown */}
        <MoreActionsDropdown
          currentTheme={currentTheme}
          accessKey={accessKey}
          copiedKey={copiedKey}
          handleCopyKey={handleCopyKey}
          mode={mode}
          copiedXml={copiedXml}
          handleCopyXml={handleCopyXml}
          handleDownloadXml={handleDownloadXml}
          onDepreciate={onDepreciate}
        />
      </div>
    </div>
  );
}
