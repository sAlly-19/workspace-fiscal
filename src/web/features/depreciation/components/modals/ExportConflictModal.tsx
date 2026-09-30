import { AlertTriangle } from 'lucide-react';
import { formatCentsBRL, competenceLabel } from '../../utils/formatters';

export interface ExportConflictModalProps {
  isLight: boolean;
  exportConflict: any;
  competence: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ExportConflictModal({
  isLight,
  exportConflict,
  competence,
  onCancel,
  onConfirm,
}: ExportConflictModalProps) {
  if (!exportConflict) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
        <div className={`p-4 border-b flex items-center gap-3 ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'}`}>
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <div>
            <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Competência já exportada</div>
            <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>{competenceLabel(competence)} já foi processada.</div>
          </div>
        </div>
        <div className="p-4 text-xs space-y-2">
          <div>Total: <b>{formatCentsBRL(exportConflict.total)}</b> • {exportConflict.count} bens</div>
          <div className={`${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Deseja gerar novamente? Isso substituirá o arquivo anterior.</div>
        </div>
        <div className={`p-3 border-t flex justify-end gap-2 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <button onClick={onCancel} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#27272a] border-[#3f3f46] text-white'}`}>Cancelar</button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Gerar novamente
          </button>
        </div>
      </div>
    </div>
  );
}
