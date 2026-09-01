import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspace.store';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  isLoading?: boolean;
  /** Quando definido, exige que o usuário digite exatamente este texto para habilitar o botão de confirmação. */
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Excluir',
  confirmVariant = 'danger',
  isLoading = false,
  requireText,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { settings } = useWorkspaceStore();
  const currentTheme = settings.theme || 'dark';
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!isOpen) setTyped('');
  }, [isOpen]);

  if (!isOpen) return null;

  const isLight = currentTheme === 'light';
  const canConfirm = !requireText || typed.trim() === requireText.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none bg-black/75 backdrop-blur-xs">
      <div
        className={`w-full max-w-md rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isLight
            ? 'bg-white border border-[#cbd5e1] text-[#0f172a] shadow-2xl'
            : 'bg-[#18181b] border border-[#3f3f46] text-white shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isLight
              ? 'bg-[#f8fafc] border-[#e2e8f0]'
              : 'bg-[#141418] border-[#27272a]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                confirmVariant === 'danger'
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              }`}
            >
              {confirmVariant === 'danger' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className={`text-sm font-bold tracking-tight ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{title}</h3>
              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Confirmação de ação</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight
                ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className={`p-5 text-xs leading-relaxed ${isLight ? 'text-[#334155]' : 'text-[#d4d4d8]'}`}>
          {description}
          {requireText && (
            <div className="mt-4">
              <label
                className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                  isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'
                }`}
              >
                Digite <span className="font-mono text-red-500 font-bold">{requireText}</span> para confirmar
              </label>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoFocus
                placeholder={requireText}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-none font-mono ${
                  isLight
                    ? 'bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a] focus:border-red-500'
                    : 'bg-[#09090b] border-[#3f3f46] text-white focus:border-red-500'
                }`}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3.5 border-t flex items-center justify-end gap-2.5 ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
          }`}
        >
          <button
            onClick={onCancel}
            disabled={isLoading}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              isLight
                ? 'bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#334155]'
                : 'bg-[#27272a] hover:bg-[#3f3f46] text-white'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || !canConfirm}
            className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-500 active:scale-95'
                : 'bg-blue-600 hover:bg-blue-500 active:scale-95'
            } ${isLoading || !canConfirm ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}