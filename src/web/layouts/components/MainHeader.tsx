import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  FileText,
  Search,
  X,
  Sun,
  Moon,
  Plus,
  FolderOpen,
  Settings,
  AlertCircle,
  ChevronDown,
  Hash,
  Layers,
  Building2,
  Calendar,
  DollarSign,
  Check,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { SearchType } from '../../stores/workspace/workspace.types';

export interface MainHeaderProps {
  onBackToHome?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchType?: SearchType;
  setSearchType?: (type: SearchType) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  currentTheme: string;
  onUpdateTheme: (theme: 'light' | 'dark') => void;
  selectedFolderId: string | null;
  selectedFolderName: string;
  isUploading: boolean;
  onTriggerUploadXml: () => void;
  onImportDirectory: () => void;
  onOpenSettings: () => void;
  uploadError: string | null;
  onDismissUploadError: () => void;
}

interface SearchOption {
  id: SearchType;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
}

const SEARCH_OPTIONS: SearchOption[] = [
  { id: 'all', label: 'Todos os campos', shortLabel: 'Todos', icon: Search, placeholder: 'Buscar notas fiscais... (Ctrl+K ou /)' },
  { id: 'number', label: 'Nº da Nota', shortLabel: 'Nº Nota', icon: Hash, placeholder: 'Buscar por número da nota...' },
  { id: 'type', label: 'Tipo de Documento', shortLabel: 'Tipo', icon: Layers, placeholder: 'Selecione o tipo...' },
  { id: 'issuer', label: 'Fornecedor / Emitente', shortLabel: 'Fornecedor', icon: Building2, placeholder: 'Buscar por fornecedor...' },
  { id: 'date', label: 'Data de Emissão', shortLabel: 'Data', icon: Calendar, placeholder: 'DD/MM/AAAA ou MM/AAAA...' },
  { id: 'value', label: 'Valor da Nota', shortLabel: 'Valor', icon: DollarSign, placeholder: 'Ex: 150,00 ou 1500' },
];

const DOC_TYPES = [
  { id: 'NFE', label: 'NF-e' },
  { id: 'NFCE', label: 'NFC-e' },
  { id: 'NFSE', label: 'NFS-e' },
  { id: 'CTE', label: 'CT-e' },
];

export function MainHeader({
  onBackToHome,
  searchQuery,
  setSearchQuery,
  searchType = 'all',
  setSearchType,
  searchInputRef,
  currentTheme,
  onUpdateTheme,
  selectedFolderId,
  selectedFolderName,
  isUploading,
  onTriggerUploadXml,
  onImportDirectory,
  onOpenSettings,
  uploadError,
  onDismissUploadError,
}: MainHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLInputElement>(null);

  const activeOption = SEARCH_OPTIONS.find((opt) => opt.id === searchType) || SEARCH_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectSearchType = (type: SearchType) => {
    if (type !== searchType) {
      setSearchQuery('');
      setSearchType?.(type);
    }
    setIsDropdownOpen(false);
  };

  const handleDateChange = (val: string) => {
    if (!val) {
      setSearchQuery('');
      return;
    }
    const clean = val.replace(/[^\d/]/g, '');
    const digitsOnly = val.replace(/\D/g, '');
    if (clean.length > val.length || (clean.indexOf('/') === -1 && digitsOnly.length > 2)) {
      if (digitsOnly.length <= 2) {
        setSearchQuery(digitsOnly);
      } else if (digitsOnly.length <= 4) {
        setSearchQuery(`${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`);
      } else {
        setSearchQuery(`${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`);
      }
      return;
    }
    setSearchQuery(clean.slice(0, 10));
  };

  const handleOpenDatePicker = () => {
    try {
      if (datePickerRef.current) {
        if (typeof datePickerRef.current.showPicker === 'function') {
          datePickerRef.current.showPicker();
        } else {
          datePickerRef.current.focus();
        }
      }
    } catch {
      // Ignore unsupported browser environments
    }
  };

  const handleValueChange = (val: string) => {
    const clean = val.replace(/[^\d,\.]/g, '');
    setSearchQuery(clean);
  };

  return (
    <>
      <header className="h-14 border-b border-[var(--border-subtle)] bg-[var(--surface-header)] flex items-center px-4 justify-between z-20 shrink-0 print:hidden gap-4 select-none shadow-xs">
        {/* Brand + Back to Home */}
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
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs shrink-0 bg-red-600 text-white"
            title="Visualizador DANFE / PDF"
          >
            <FileText className="w-4 h-4" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-[var(--text-primary)]">NFView</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              NF-e • NFC-e • CT-e
            </div>
          </div>
        </div>

        {/* Search Bar with Integrated Type Filter */}
        <div className="flex-1 max-w-lg relative" ref={dropdownContainerRef}>
          <div className="relative flex items-center h-9 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all">
            {/* Search Type Selector Trigger */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 h-full px-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-r border-[var(--border-default)] rounded-l-lg transition-colors cursor-pointer select-none shrink-0"
              title="Filtrar por tipo de busca"
              aria-label="Filtrar por tipo de busca"
              aria-haspopup="true"
              aria-expanded={isDropdownOpen}
            >
              <ActiveIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="hidden sm:inline font-semibold text-[11px] text-[var(--text-primary)]">
                {activeOption.shortLabel}
              </span>
              <motion.div
                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center text-[var(--text-muted)]"
              >
                <ChevronDown className="w-3 h-3" />
              </motion.div>
            </button>

            {/* Dynamic Content: Document Type Pills vs Input Field */}
            {searchType === 'type' ? (
              <div className="flex-1 flex items-center gap-1.5 px-2.5 overflow-x-auto no-scrollbar">
                <span className="text-[11px] text-[var(--text-muted)] shrink-0 hidden md:inline">
                  Tipo:
                </span>
                {DOC_TYPES.map((t) => {
                  const isSelected = searchQuery.toUpperCase() === t.id;
                  return (
                    <motion.button
                      key={t.id}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSearchQuery(isSelected ? '' : t.id)}
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      {t.label}
                    </motion.button>
                  );
                })}
              </div>
            ) : searchType === 'date' ? (
              <div className="relative flex-1 flex items-center h-full">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full h-full bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] pl-2.5 pr-8 text-xs focus:outline-none"
                  placeholder={activeOption.placeholder}
                  maxLength={10}
                />
                <input
                  ref={datePickerRef}
                  type="date"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m, d] = e.target.value.split('-');
                      setSearchQuery(`${d}/${m}/${y}`);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleOpenDatePicker}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-blue-500 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer mr-1"
                  title="Abrir calendário"
                  aria-label="Abrir calendário"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : searchType === 'value' ? (
              <div className="relative flex-1 flex items-center h-full">
                <span className="pl-2.5 text-xs font-bold text-[var(--text-muted)] select-none">
                  R$
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleValueChange(e.target.value)}
                  className="w-full h-full bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] pl-1.5 pr-8 text-xs focus:outline-none font-medium"
                  placeholder={activeOption.placeholder}
                />
              </div>
            ) : (
              <div className="relative flex-1 flex items-center h-full">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-full bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] pl-2.5 pr-8 text-xs focus:outline-none"
                  placeholder={activeOption.placeholder}
                />
              </div>
            )}

            {/* Clear Button or Keyboard Shortcut hints */}
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 mr-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
                title="Limpar busca"
                aria-label="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : searchType !== 'type' ? (
              <div className="flex items-center gap-1 mr-2.5 pointer-events-none select-none shrink-0">
                <kbd className="text-[9px] px-1 py-0.5 rounded border border-[var(--border-default)] bg-[var(--surface-inset)] text-[var(--text-muted)] font-mono">
                  Ctrl+K
                </kbd>
                <kbd className="text-[9px] px-1 py-0.5 rounded border border-[var(--border-default)] bg-[var(--surface-inset)] text-[var(--text-muted)] font-mono">
                  /
                </kbd>
              </div>
            ) : null}
          </div>

          {/* Animated Dropdown Menu */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute left-0 top-[calc(100%+6px)] w-56 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-2xl p-1.5 z-50 backdrop-blur-md"
                role="menu"
                aria-label="Filtrar busca por tipo"
              >
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] select-none">
                  Filtrar busca por
                </div>
                <div className="space-y-0.5">
                  {SEARCH_OPTIONS.map((opt) => {
                    const isSelected = searchType === opt.id;
                    const Icon = opt.icon;
                    return (
                      <motion.button
                        key={opt.id}
                        type="button"
                        role="menuitem"
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectSearchType(opt.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 font-semibold'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`w-3.5 h-3.5 ${
                              isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--text-muted)]'
                            }`}
                          />
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Actions: Theme Selector, Primary Single Import & Settings */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Theme Switcher Pill */}
          <div className="flex items-center p-0.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-inset)] shrink-0">
            <button
              type="button"
              onClick={() => onUpdateTheme('light')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                currentTheme === 'light'
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
                currentTheme === 'dark'
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
            onClick={onTriggerUploadXml}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer shrink-0"
            title={selectedFolderId ? `Importar XML na pasta "${selectedFolderName}"` : 'Importar arquivos XML'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Importar XML</span>
          </button>

          {typeof window !== 'undefined' && (window as any).api?.openDirectory && (
            <button
              type="button"
              onClick={onImportDirectory}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer shrink-0"
              title="Importar todos os XMLs de uma pasta"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Importar Pasta</span>
            </button>
          )}

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

      {/* Error alert if any */}
      {uploadError && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between text-xs text-red-300 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{uploadError}</span>
          </div>
          <button onClick={onDismissUploadError} className="text-red-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
