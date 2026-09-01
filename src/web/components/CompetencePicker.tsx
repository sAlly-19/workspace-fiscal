import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface CompetencePickerProps {
  value: string; // YYYY-MM
  onChange: (value: string) => void;
  isLight?: boolean;
  min?: string;
  max?: string;
  label?: string;
}

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function parseComp(comp: string): { year: number; month: number } {
  const [y, m] = comp.split('-').map(Number);
  return { year: y, month: m };
}

function formatComp(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function shift(comp: string, delta: number): string {
  const { year, month } = parseComp(comp);
  const d = new Date(year, month - 1 + delta, 1);
  return formatComp(d.getFullYear(), d.getMonth() + 1);
}

export function CompetencePicker({ value, onChange, isLight = false, min, max, label }: CompetencePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseComp(value).year);
  const ref = useRef<HTMLDivElement>(null);

  const { year: currentYear, month: currentMonth } = parseComp(value);

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const goPrev = () => {
    const prev = shift(value, -1);
    if (min && prev < min) return;
    onChange(prev);
  };
  const goNext = () => {
    const next = shift(value, 1);
    if (max && next > max) return;
    onChange(next);
  };

  const selectMonth = (m: number) => {
    const newComp = formatComp(viewYear, m);
    if (min && newComp < min) return;
    if (max && newComp > max) return;
    onChange(newComp);
    setShowPicker(false);
  };

  const minY = min ? parseInt(min.split('-')[0], 10) : viewYear - 5;
  const maxY = max ? parseInt(max.split('-')[0], 10) : viewYear + 5;

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      <button
        type="button"
        onClick={goPrev}
        aria-label="Competência anterior"
        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
          isLight
            ? 'bg-white border-[#cbd5e1] hover:bg-[#f1f5f9] text-[#475569]'
            : 'bg-[#18181b] border-[#27272a] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white'
        }`}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
            isLight
              ? 'bg-white border-[#cbd5e1] hover:bg-[#f1f5f9] text-[#0f172a]'
              : 'bg-[#18181b] border-[#3f3f46] hover:bg-[#27272a] text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-sm font-bold font-mono tabular-nums">
            {label ?? `${MONTHS_PT[currentMonth - 1].slice(0, 3)}/${currentYear}`}
          </span>
          <CalendarChevronSvg open={showPicker} />
        </button>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className={`absolute top-full mt-1 left-0 z-50 rounded-xl shadow-2xl border p-3 w-[260px] ${
                isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#18181b] border-[#3f3f46]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setViewYear((y) => Math.max(minY, y - 1))}
                  className={`p-1 rounded cursor-pointer ${
                    isLight ? 'hover:bg-[#e2e8f0] text-[#64748b]' : 'hover:bg-white/10 text-[#a1a1aa]'
                  }`}
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  {viewYear}
                </span>
                <button
                  type="button"
                  onClick={() => setViewYear((y) => Math.min(maxY, y + 1))}
                  className={`p-1 rounded cursor-pointer ${
                    isLight ? 'hover:bg-[#e2e8f0] text-[#64748b]' : 'hover:bg-white/10 text-[#a1a1aa]'
                  }`}
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MONTHS_PT.map((m, idx) => {
                  const comp = formatComp(viewYear, idx + 1);
                  const isCurrent = viewYear === currentYear && idx + 1 === currentMonth;
                  const disabled = !!(min && comp < min) || !!(max && comp > max);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectMonth(idx + 1)}
                      disabled={disabled}
                      className={`px-2 py-1.5 text-xs rounded-lg font-semibold transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : isLight
                            ? 'text-[#475569] hover:bg-[#f1f5f9] hover:text-blue-700'
                            : 'text-[#a1a1aa] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={goNext}
        aria-label="Próxima competência"
        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
          isLight
            ? 'bg-white border-[#cbd5e1] hover:bg-[#f1f5f9] text-[#475569]'
            : 'bg-[#18181b] border-[#27272a] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white'
        }`}
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function CalendarChevronSvg({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
    >
      <path
        d="M2.5 3.75L5 6.25L7.5 3.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}