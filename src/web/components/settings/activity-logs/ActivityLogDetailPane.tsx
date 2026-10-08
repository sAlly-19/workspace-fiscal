import {
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { ActivityLogItem, formatLogDate } from './activityLogFormatters';

export interface ActivityLogDetailPaneProps {
  isLight: boolean;
  selectedLog: ActivityLogItem;
  copied: boolean;
  onCopyJson: (details: any) => void;
  onClose: () => void;
}

export function ActivityLogDetailPane({
  isLight,
  selectedLog,
  copied,
  onCopyJson,
  onClose,
}: ActivityLogDetailPaneProps) {
  return (
    <div
      className={`p-4 rounded-xl border space-y-2 animate-in fade-in duration-150 ${
        isLight
          ? 'bg-slate-50 border-blue-200 text-slate-900 shadow-sm'
          : 'bg-zinc-950 border-blue-500/30 text-white shadow-xl'
      }`}
    >
      <div className="flex items-center justify-between border-b pb-2 border-border/40">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-blue-400">
            DETALHES DO EVENTO · {selectedLog.action}
          </span>
          <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
            {formatLogDate(selectedLog.timestamp)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedLog.details && (
            <button
              onClick={() => onCopyJson(selectedLog.details)}
              className={`px-2 py-1 rounded text-[11px] font-semibold border flex items-center gap-1 transition cursor-pointer ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              }`}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer px-1.5 py-0.5"
          >
            ✕ Fechar
          </button>
        </div>
      </div>

      <div className="text-xs space-y-1">
        <div className="font-medium text-slate-700 dark:text-zinc-300">
          {selectedLog.message}
        </div>

        {selectedLog.details ? (
          <pre className="p-3 rounded-lg bg-black/85 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48 leading-relaxed border border-zinc-800 select-text">
            {typeof selectedLog.details === 'string'
              ? selectedLog.details
              : JSON.stringify(selectedLog.details, null, 2)}
          </pre>
        ) : (
          <div className="text-[11px] italic text-muted-foreground pt-1">
            Nenhum detalhe adicional registrado para este evento.
          </div>
        )}
      </div>
    </div>
  );
}

