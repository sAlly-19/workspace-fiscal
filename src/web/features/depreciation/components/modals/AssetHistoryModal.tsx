import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { formatCentsBRL, competenceLabel, formatDateBR } from '../../utils/formatters';

export interface AssetHistoryModalProps {
  isLight: boolean;
  assetHistory: any;
  asset: any;
  onClose: () => void;
}

export function AssetHistoryModal({ isLight, assetHistory, asset, onClose }: AssetHistoryModalProps) {
  if (!assetHistory) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div initial={{ scale: 0.97 }} animate={{ scale: 1 }} className={`w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
          <div className={`px-5 py-4 border-b flex items-center justify-between ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
            <div>
              <div className={`text-sm font-black ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{asset?.description || 'Carregando...'}</div>
              <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>NF {asset?.documentNumber || '—'} • {asset?.supplier || ''}</div>
            </div>
            <button onClick={onClose} className={`p-1.5 rounded-lg cursor-pointer ${isLight ? 'hover:bg-[#e2e8f0]' : 'hover:bg-white/10'}`}><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <span className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Carregando depreciação...</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }
  const { asset: histAsset, schedule, summary } = assetHistory;
  const displayAsset = histAsset || asset;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.97 }} animate={{ scale: 1 }} className={`w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <div>
            <div className={`text-sm font-black ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{displayAsset.description}</div>
            <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>NF {displayAsset.documentNumber} • {displayAsset.supplier} • {formatDateBR(displayAsset.acquisitionDate)}</div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg cursor-pointer ${isLight ? 'hover:bg-[#e2e8f0]' : 'hover:bg-white/10'}`}><X className="w-4 h-4" /></button>
        </div>

        <div className={`grid grid-cols-4 gap-3 p-4 border-b ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#0d0d10] border-[#27272a]'}`}>
          <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
            <div className={`text-[10px] font-bold uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Valor aquisição</div>
            <div className={`text-sm font-black ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{formatCentsBRL(summary.acquisitionValue)}</div>
          </div>
          <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
            <div className={`text-[10px] font-bold uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Depreciado</div>
            <div className="text-sm font-black text-blue-500">{formatCentsBRL(summary.depreciated)}</div>
          </div>
          <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
            <div className={`text-[10px] font-bold uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Valor atual</div>
            <div className="text-sm font-black text-emerald-500">{formatCentsBRL(summary.currentValue)}</div>
          </div>
          <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
            <div className={`text-[10px] font-bold uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Término previsto</div>
            <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{summary.endCompetence ? competenceLabel(summary.endCompetence) : '—'}</div>
            <div className={`text-xs ${isLight ? 'text-[#94a3b8]' : 'text-[#52525b]'}`}>{summary.annualRate}% a.a.</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className={`sticky top-0 ${isLight ? 'bg-[#f1f5f9] text-[#475569]' : 'bg-[#18181b] text-[#a1a1aa]'}`}>
              <tr>
                <th className="text-left px-4 py-2">Mês</th>
                <th className="text-right px-4 py-2">Depreciação</th>
                <th className="text-right px-4 py-2">Acumulado</th>
                <th className="text-right px-4 py-2">Valor atual</th>
                <th className="text-center px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-[#e2e8f0]' : 'divide-[#27272a]'}`}>
              {schedule.map((m: any) => (
                <tr key={m.competence} className={`${m.status === 'exported' ? (isLight ? 'bg-emerald-50' : 'bg-emerald-500/10') : m.status === 'current' ? (isLight ? 'bg-blue-50' : 'bg-blue-500/10') : m.status === 'not_issued' ? (isLight ? 'bg-amber-50' : 'bg-amber-500/10') : ''}`}>
                  <td className="px-4 py-2 font-mono font-medium">{m.competence.slice(0, 7).split('-').reverse().join('/')}</td>
                  <td className="px-4 py-2 text-right font-bold">{formatCentsBRL(m.depreciationValue)}{m.isFirstProportional ? ' *' : ''}{m.isLastResidual ? ' †' : ''}</td>
                  <td className="px-4 py-2 text-right">{formatCentsBRL(m.accumulatedValue)}</td>
                  <td className="px-4 py-2 text-right">{formatCentsBRL(m.currentValue)}</td>
                  <td className="px-4 py-2 text-center">
                    {m.status === 'exported' ? <span className="text-emerald-600 font-bold text-[11px]">✓ Exportado</span> : m.status === 'current' ? <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">ATUAL</span> : m.status === 'not_issued' ? <span className="bg-amber-500/20 text-amber-600 border border-amber-500/30 px-1.5 py-0.5 rounded text-[10px] font-bold">NÃO LANÇADO</span> : <span className={`px-1.5 py-0.5 rounded text-[10px] ${isLight ? 'bg-[#e2e8f0] text-[#475569]' : 'bg-[#27272a] text-[#71717a]'}`}>Futuro</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={`px-4 py-2 text-[11px] ${isLight ? 'text-[#94a3b8] bg-[#f8fafc] border-t border-[#e2e8f0]' : 'text-[#71717a] bg-[#111114] border-t border-[#27272a]'}`}>
            * proporcional ao 1º mês • † residual final (ajuste de centavos)
          </div>
        </div>

        <div className={`px-4 py-3 border-t flex justify-end ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <button onClick={onClose} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer">Fechar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
