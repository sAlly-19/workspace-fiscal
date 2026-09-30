import { Archive, Ban } from 'lucide-react';

export interface DisposeModalProps {
  isLight: boolean;
  target: any;
  disposeDate: string;
  setDisposeDate: (date: string) => void;
  disposeReason: string;
  setDisposeReason: (reason: string) => void;
  isDisposing: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function DisposeModal({
  isLight,
  target,
  disposeDate,
  setDisposeDate,
  disposeReason,
  setDisposeReason,
  isDisposing,
  onClose,
  onConfirm,
}: DisposeModalProps) {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
        <div className={`px-5 py-4 border-b flex items-center gap-3 ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'}`}>
          <Archive className="w-5 h-5 text-amber-600" />
          <div>
            <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Dar Baixa no Bem</div>
            <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>NF {target.documentNumber} • {target.description}</div>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Data da baixa *</label>
            <input
              type="date"
              value={disposeDate}
              onChange={(e) => setDisposeDate(e.target.value)}
              className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm cursor-pointer ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`}
            />
            <p className={`text-[11px] mt-1 ${isLight ? 'text-[#94a3b8]' : 'text-[#71717a]'}`}>Depreciação será calculada até esta competência (inclusive).</p>
          </div>
          <div>
            <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Motivo (opcional)</label>
            <textarea
              value={disposeReason}
              onChange={(e) => setDisposeReason(e.target.value)}
              rows={2}
              placeholder="Venda, obsolescência, perda..."
              className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm resize-none ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`}
            />
          </div>
          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
            <Ban className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Após a baixa, o bem não entrará mais nos cálculos mensais e seu histórico será truncado. Você poderá reativar depois.</span>
          </div>
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <button
            onClick={onClose}
            disabled={isDisposing}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0] text-[#475569]' : 'bg-[#27272a] border-[#3f3f46] text-white'}`}
          >
            Cancelar
          </button>
          <button
            disabled={isDisposing || !disposeDate}
            onClick={onConfirm}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {isDisposing ? 'Baixando...' : 'Confirmar Baixa'}
          </button>
        </div>
      </div>
    </div>
  );
}
