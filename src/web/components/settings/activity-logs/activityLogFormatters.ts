import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ActivityLogItem {
  id: string;
  timestamp: string | Date;
  level: 'SUCCESS' | 'ERROR' | 'WARN' | 'INFO';
  module: 'BUSCADOR' | 'NFVIEW' | 'DEPRECIATION' | 'BACKUP' | 'CERTIFICATES' | 'COMPANIES' | 'SYSTEM';
  action: string;
  message: string;
  details?: any;
  durationMs?: number | null;
  createdAt?: string | Date;
}

export interface ActivityLogStats {
  total: number;
  successCount: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
}

export interface LevelBadge {
  icon: LucideIcon;
  color: string;
  label: string;
}

// Formatação de data/hora
export function formatLogDate(val: string | Date | undefined): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return String(val);
  }
}

// Badges e Estilos
export function getLevelBadge(level: string): LevelBadge {
  switch (level) {
    case 'SUCCESS':
      return {
        icon: CheckCircle2,
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        label: 'Sucesso',
      };
    case 'ERROR':
      return {
        icon: AlertCircle,
        color: 'text-red-400 bg-red-500/10 border-red-500/30',
        label: 'Erro',
      };
    case 'WARN':
      return {
        icon: AlertTriangle,
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        label: 'Aviso',
      };
    default:
      return {
        icon: Info,
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        label: 'Info',
      };
  }
}

export function getModuleBadgeColor(module: string, isLight: boolean): string {
  switch (module) {
    case 'BUSCADOR':
      return isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    case 'NFVIEW':
      return isLight ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    case 'DEPRECIATION':
      return isLight ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    case 'BACKUP':
      return isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'CERTIFICATES':
      return isLight ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-teal-500/15 text-teal-300 border-teal-500/30';
    case 'COMPANIES':
      return isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    default:
      return isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40';
  }
}

