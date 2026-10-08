import {
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import type { ActivityLogStats } from './activityLogFormatters';

export interface ActivityLogsHeaderProps {
  isLight: boolean;
  loading: boolean;
  stats: ActivityLogStats;
  clearingDays: number;
  setClearingDays: (days: number) => void;
  onReload: () => void;
  onExportCsv: () => void;
  onOpenClearModal: () => void;
}

export function ActivityLogsHeader({
  isLight,
  loading,
  stats,
  clearingDays,
  setClearingDays,
  onReload,
  onExportCsv,
  onOpenClearModal,
}: ActivityLogsHeaderProps) {
  return (
    <>
      {/* Header & Ações Globais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" />
            <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Auditoria de Eventos e Registros
            </h4>
          </div>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Histórico completo de sincronizações, consultas SEFAZ/NFS-e, backups, exclusões e rotinas do sistema.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onReload}
            disabled={loading}
            title="Atualizar lista de registros"
            className={`p-1.5 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span className="hidden sm:inline">Recarregar</span>
          </button>

          <button
            onClick={onExportCsv}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700 shadow-xs'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Exportar CSV</span>
          </button>

          <div className="flex items-center gap-1">
            <select
              value={clearingDays}
              onChange={(e) => setClearingDays(Number(e.target.value))}
              title="Período de retenção para limpeza"
              className={`px-2 py-1.5 rounded-lg border text-xs font-medium focus:outline-none cursor-pointer ${
                isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-zinc-800 border-zinc-700 text-zinc-300'
              }`}
            >
              <option value={15}>&gt; 15 dias</option>
              <option value={30}>&gt; 30 dias</option>
              <option value={60}>&gt; 60 dias</option>
              <option value={90}>&gt; 90 dias</option>
            </select>

            <button
              onClick={onOpenClearModal}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                isLight
                  ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Antigos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Total */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'
          }`}
        >
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Total Registros
            </span>
            <div className={`text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {stats.total.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ClipboardList className="w-4 h-4" />
          </div>
        </div>

        {/* Sucessos */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between ${
            isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-zinc-900/80 border-zinc-800'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
              Sucessos
            </span>
            <div className="text-base font-black text-emerald-400">
              {stats.successCount.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Falhas / Erros */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between ${
            isLight ? 'bg-red-50/50 border-red-200' : 'bg-zinc-900/80 border-zinc-800'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
              Falhas / Erros
            </span>
            <div className="text-base font-black text-red-400">
              {stats.errorCount.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        {/* Avisos */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between ${
            isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-zinc-900/80 border-zinc-800'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
              Avisos
            </span>
            <div className="text-base font-black text-amber-400">
              {stats.warnCount.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </div>
    </>
  );
}

