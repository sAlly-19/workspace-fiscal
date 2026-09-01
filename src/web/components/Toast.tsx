import { create } from 'zustand';
import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  durationMs?: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ kind: 'success', title, description }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ kind: 'error', title, description }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ kind: 'info', title, description }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().push({ kind: 'warning', title, description }),
};

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const COLORS = {
  success: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
  },
  error: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
  },
  info: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
  },
  warning: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
  },
};

export function ToastHost() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = ICONS[t.kind];
  const colors = COLORS[t.kind];
  useEffect(() => {
    const ms = t.durationMs ?? (t.kind === 'error' ? 6000 : 3500);
    const timer = setTimeout(onDismiss, ms);
    return () => clearTimeout(timer);
  }, [t.id, t.kind, t.durationMs, onDismiss]);

  return (
    <div
      role="alert"
      className={`pointer-events-auto min-w-[280px] max-w-sm rounded-xl shadow-2xl border bg-[#18181b] text-white flex items-start gap-3 p-3 animate-in fade-in slide-in-from-right-2 ${colors.border}`}
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colors.bg}`}>
        <Icon className={`w-4 h-4 ${colors.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{t.title}</p>
        {t.description && (
          <p className="text-[11px] text-[#a1a1aa] mt-0.5 leading-snug">{t.description}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded text-[#71717a] hover:text-white hover:bg-white/10 transition-colors shrink-0"
        aria-label="Fechar notificação"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}