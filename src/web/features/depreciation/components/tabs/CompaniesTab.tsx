import { Plus, Check, Edit2, Trash2 } from 'lucide-react';
import { cnpjMask } from '../../utils/formatters';

export interface CompaniesTabProps {
  isLight: boolean;
  companies: any[];
  selectedCompanyId: string | null;
  onSelectCompany: (id: string) => void;
  onOpenNewCompany: () => void;
  onOpenEditCompany: (company: any) => void;
  onConfirmDeleteCompany: (company: any) => void;
}

export function CompaniesTab({
  isLight,
  companies,
  selectedCompanyId,
  onSelectCompany,
  onOpenNewCompany,
  onOpenEditCompany,
  onConfirmDeleteCompany,
}: CompaniesTabProps) {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={`text-sm font-black ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Empresas</h2>
        <button onClick={onOpenNewCompany} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Nova empresa</button>
      </div>
      <div className="grid gap-3">
        {companies.map((c) => (
          <div key={c.id} className={`p-4 rounded-xl border flex items-center justify-between ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'} ${selectedCompanyId === c.id ? 'ring-1 ring-blue-500' : ''}`}>
            <div>
              <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{c.name}</div>
              <div className={`text-xs font-mono ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>CNPJ: {c.cnpj ? cnpjMask(c.cnpj) : c.document || '—'} {c.tradeName ? `• ${c.tradeName}` : ''}</div>
              {c.city && <div className={`text-[11px] mt-1 ${isLight ? 'text-[#94a3b8]' : 'text-[#52525b]'}`}>{c.city}{c.state ? `/${c.state}` : ''}</div>}
            </div>
            <div className="flex items-center gap-1.5">
              {selectedCompanyId === c.id && <span className="text-[11px] font-bold text-blue-500 flex items-center gap-1"><Check className="w-3 h-3" /> Selecionada</span>}
              <button onClick={() => onSelectCompany(c.id)} className={`px-2 py-1 rounded text-xs font-bold border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#18181b] border-[#3f3f46] text-white'}`}>Selecionar</button>
              <button onClick={() => onOpenEditCompany(c)} className={`p-1.5 rounded border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#18181b] border-[#3f3f46]'}`}><Edit2 className="w-3 h-3" /></button>
              <button onClick={() => onConfirmDeleteCompany(c)} className="p-1.5 rounded bg-red-500/10 text-red-500 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
        {companies.length === 0 && <div className={`p-8 rounded-xl border border-dashed text-center text-xs ${isLight ? 'border-[#cbd5e1] text-[#64748b] bg-white' : 'border-[#3f3f46] text-[#71717a]'}`}>Nenhuma empresa. Clique em Nova empresa.</div>}
      </div>
    </div>
  );
}
