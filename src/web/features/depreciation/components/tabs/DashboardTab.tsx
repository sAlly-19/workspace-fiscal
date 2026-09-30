import { Calendar, SlidersHorizontal, Download, Check } from 'lucide-react';
import { CompetencePicker } from '../../../../components/CompetencePicker';
import { formatCentsBRL, competenceLabel, MONTHS_PT_FULL } from '../../utils/formatters';

export interface DashboardTabProps {
  isLight: boolean;
  competence: string;
  setCompetence: (comp: string) => void;
  dashboard: any;
  monthly: any;
  totalAssetsCount: number;
  isGenerating: boolean;
  onOpenCsvLayout: () => void;
  onExportDirectly: () => void;
}

export function DashboardTab({
  isLight,
  competence,
  setCompetence,
  dashboard,
  monthly,
  totalAssetsCount,
  isGenerating,
  onOpenCsvLayout,
  onExportDirectly,
}: DashboardTabProps) {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      {/* Competência */}
      <div className={`flex items-center justify-between p-4 rounded-xl border ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-500" />
          <div>
            <div className={`text-xs font-bold uppercase tracking-widest ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Competência</div>
            <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{competenceLabel(competence)}</div>
          </div>
        </div>
        <CompetencePicker
          value={competence}
          onChange={setCompetence}
          isLight={isLight}
          label={`${MONTHS_PT_FULL[parseInt(competence.split('-')[1], 10) - 1]} / ${competence.split('-')[0]}`}
        />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <div className={`text-[11px] font-bold uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Bens cadastrados</div>
          <div className={`text-2xl font-black mt-1 ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{dashboard?.totalAssets ?? totalAssetsCount}</div>
          <div className={`text-xs ${isLight ? 'text-[#94a3b8]' : 'text-[#52525b]'}`}>{dashboard?.fullyDepreciated ?? 0} totalmente depreciados</div>
        </div>
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <div className={`text-[11px] font-bold uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Depreciação do mês</div>
          <div className="text-2xl font-black mt-1 text-blue-500">{formatCentsBRL(monthly?.total ?? 0)}</div>
          <div className={`text-xs ${isLight ? 'text-[#94a3b8]' : 'text-[#52525b]'}`}>{monthly?.count ?? 0} bens nesta competência</div>
        </div>
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${monthly?.isExported ? (isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/30') : (isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]')}`}>
          <div>
            <div className={`text-[11px] font-bold uppercase ${monthly?.isExported ? 'text-emerald-700' : (isLight ? 'text-[#64748b]' : 'text-[#71717a]')}`}>Valor contábil</div>
            <div className={`text-2xl font-black mt-1 ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{formatCentsBRL(dashboard?.totalCurrent ?? 0)}</div>
          </div>
          {monthly?.isExported && <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> EXPORTADO</div>}
        </div>
      </div>

      {/* Tabela */}
      <div className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#0d0d10] border-[#27272a]'}`}>
          <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Depreciação — {competenceLabel(competence)}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCsvLayout}
              disabled={!monthly || monthly.count === 0}
              title="Personalizar colunas e posições do CSV exportado"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                isLight
                  ? 'bg-white hover:bg-[#f1f5f9] border-[#cbd5e1] text-[#334155]'
                  : 'bg-[#18181b] hover:bg-[#27272a] border-[#3f3f46] text-[#e4e4e7]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
              <span>Colunas do CSV</span>
            </button>
            <button
              onClick={onExportDirectly}
              disabled={isGenerating || !monthly || monthly.count === 0}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" /> {isGenerating ? 'Gerando...' : 'Exportar CSV'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className={`${isLight ? 'bg-[#f1f5f9] text-[#475569]' : 'bg-[#18181b] text-[#a1a1aa]'}`}>
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Fornecedor</th>
                <th className="text-left px-3 py-2 font-semibold">NF</th>
                <th className="text-left px-3 py-2 font-semibold">Categoria</th>
                <th className="text-right px-3 py-2 font-semibold">Depreciação</th>
                <th className="text-center px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-[#e2e8f0]' : 'divide-[#27272a]'}`}>
              {monthly?.rows?.length ? monthly.rows.map((r: any) => (
                <tr key={r.assetId} className={`${r.exported ? (isLight ? 'bg-emerald-50/50' : 'bg-emerald-500/5') : ''} ${isLight ? 'hover:bg-[#f8fafc]' : 'hover:bg-white/[0.02]'}`}>
                  <td className="px-3 py-2 font-medium">{r.supplier}</td>
                  <td className="px-3 py-2 font-mono">{r.documentNumber}</td>
                  <td className="px-3 py-2">{r.categoryName || '—'}</td>
                  <td className="px-3 py-2 text-right font-bold">{formatCentsBRL(r.depreciationValue)}</td>
                  <td className="px-3 py-2 text-center">
                    {r.exported ? <span className="inline-flex items-center gap-1 text-emerald-600 font-bold"><Check className="w-3 h-3" /> ✓</span> : r.status === 'current' ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white">ATUAL</span> : r.status === 'not_issued' ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 border border-amber-500/30">NÃO LANÇADO</span> : <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isLight ? 'bg-[#e2e8f0] text-[#475569]' : 'bg-[#27272a] text-[#71717a]'}`}>FUTURO</span>}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#71717a]">Nenhum bem para esta competência</td></tr>
              )}
            </tbody>
            {monthly?.rows?.length ? (
              <tfoot className={`${isLight ? 'bg-[#f8fafc] border-t border-[#e2e8f0]' : 'bg-[#0d0d10] border-t border-[#27272a]'} font-bold`}>
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right">Total do mês:</td>
                  <td className="px-3 py-2 text-right text-blue-500">{formatCentsBRL(monthly.total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    </div>
  );
}
