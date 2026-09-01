import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Calendar, Loader2, FileText } from 'lucide-react';
import { CompetencePicker } from '../../components/CompetencePicker';

interface Asset {
  id: string;
  supplier: string;
  documentNumber: string;
  description?: string;
  acquisitionDate: string;
  acquisitionValue: number;
}

interface Props {
  isLight: boolean;
  assets: Asset[];
  lastClosed: string;
  onClose: () => void;
  onConfirm: (startCompetence: string, endCompetence: string) => Promise<void> | void;
}

function parseComp(comp: string): { year: number; month: number } {
  const [y, m] = comp.split('-').map(Number);
  return { year: y, month: m };
}

function formatComp(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + n, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function getCompetenceRange(start: string, end: string): string[] {
  const result: string[] = [];
  let { year, month } = parseComp(start);
  const e = parseComp(end);
  while (year < e.year || (year === e.year && month <= e.month)) {
    result.push(formatComp(year, month));
    const n = addMonths(year, month, 1);
    year = n.year;
    month = n.month;
  }
  return result;
}

function defaultStartForAsset(asset: Asset): string {
  const d = new Date(asset.acquisitionDate);
  return formatComp(d.getFullYear(), d.getMonth() + 1);
}

export function RetroactiveBatchModal({ isLight, assets, lastClosed, onClose, onConfirm }: Props) {
  // Sugere o range baseado nos bens selecionados
  const suggestedStart = useMemo(() => {
    if (assets.length === 0) return lastClosed;
    const starts = assets.map((a) => defaultStartForAsset(a));
    return starts.sort()[0]; // menor competência entre os bens
  }, [assets]);

  const [startComp, setStartComp] = useState(suggestedStart);
  const [endComp, setEndComp] = useState(lastClosed);
  const [saving, setSaving] = useState(false);

  const competences = useMemo(() => getCompetenceRange(startComp, endComp), [startComp, endComp]);
  const totalEstimate = assets.reduce((sum, a) => sum + (a.acquisitionValue || 0), 0);

  const handleConfirm = async () => {
    if (assets.length === 0) return;
    if (competences.length === 0) {
      return;
    }
    try {
      setSaving(true);
      await onConfirm(startComp, endComp);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${
          isLight ? 'bg-white border border-[#cbd5e1]' : 'bg-[#18181b] border border-[#3f3f46]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#141418] border-[#27272a]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-sm font-bold tracking-tight ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                Depreciação Retroativa em Lote
              </h3>
              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                {assets.length} {assets.length === 1 ? 'bem selecionado' : 'bens selecionados'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Bens selecionados */}
          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
              Bens incluídos
            </label>
            <div
              className={`rounded-lg border p-2 max-h-40 overflow-y-auto ${
                isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
              }`}
            >
              {assets.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-2 px-2 py-1.5 text-[11px] ${
                    isLight ? 'text-[#334155]' : 'text-[#d4d4d8]'
                  }`}
                >
                  <FileText className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="font-semibold truncate">{a.supplier}</span>
                  <span className={`opacity-70 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>· NF {a.documentNumber}</span>
                  <span className={`ml-auto font-mono ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                    {(a.acquisitionValue / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Range de competências */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                Competência inicial
              </label>
              <CompetencePicker
                value={startComp}
                onChange={setStartComp}
                isLight={isLight}
                max={endComp}
              />
            </div>
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                Competência final
              </label>
              <CompetencePicker
                value={endComp}
                onChange={setEndComp}
                isLight={isLight}
                max={lastClosed}
              />
            </div>
          </div>

          {/* Resumo */}
          <div
            className={`rounded-lg border p-3 grid grid-cols-3 gap-3 text-center ${
              isLight ? 'bg-blue-50/50 border-blue-200' : 'bg-blue-500/10 border-blue-500/30'
            }`}
          >
            <div>
              <p className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                Competências
              </p>
              <p className={`text-base font-black mt-0.5 ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                {competences.length}
              </p>
            </div>
            <div>
              <p className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                Bens
              </p>
              <p className={`text-base font-black mt-0.5 ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                {assets.length}
              </p>
            </div>
            <div>
              <p className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                Valor total
              </p>
              <p className={`text-sm font-bold mt-1 ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                {totalEstimate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div
            className={`rounded-lg p-3 text-[11px] leading-relaxed ${
              isLight ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-amber-500/10 border border-amber-500/30 text-amber-200'
            }`}
          >
            Serão gerados lançamentos de depreciação para cada bem em cada competência dentro do intervalo,
            respeitando a regra da empresa e a data de aquisição de cada bem. Entries futuras não serão criadas.
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3.5 border-t flex items-center justify-end gap-2.5 shrink-0 ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
          }`}
        >
          <button
            onClick={onClose}
            disabled={saving}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              isLight ? 'bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#334155]' : 'bg-[#27272a] hover:bg-[#3f3f46] text-white'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || competences.length === 0 || assets.length === 0}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
            Gerar {competences.length * assets.length} Lançamentos
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}