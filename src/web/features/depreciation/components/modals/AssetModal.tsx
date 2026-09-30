import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save } from 'lucide-react';
import { AssetXmlDropZone } from '../../AssetXmlDropZone';

export interface AssetModalProps {
  isLight: boolean;
  editing: any;
  categories: any[];
  selectedCompanyId: string | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void> | void;
}

export function AssetModal({ isLight, editing, categories, selectedCompanyId, onClose, onSave }: AssetModalProps) {
  const [form, setForm] = useState({
    supplier: editing?.supplier || '',
    acquisitionDate: editing?.acquisitionDate ? new Date(editing.acquisitionDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    documentNumber: editing?.documentNumber || '',
    description: editing?.description || '',
    acquisitionValue: editing ? (editing.acquisitionValue / 100).toFixed(2).replace('.', ',') : '',
    ncm: editing?.ncm || '',
    categoryId: editing?.categoryId || '',
    annualRate: editing?.annualRate ? String(editing.annualRate) : '',
  });

  useEffect(() => {
    if (form.categoryId && !form.annualRate) {
      const cat = categories.find((c: any) => c.id === form.categoryId);
      if (cat) setForm((f) => ({ ...f, annualRate: String(cat.defaultRate) }));
    }
  }, [form.categoryId, categories]);

  const [saving, setSaving] = useState(false);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className={`w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <h3 className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{editing ? 'Editar bem' : 'Novo bem'}</h3>
          <button onClick={onClose} className={`p-1.5 rounded-lg cursor-pointer ${isLight ? 'hover:bg-[#e2e8f0]' : 'hover:bg-white/10'}`}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          {!editing && (
            <AssetXmlDropZone
              onPrefill={(data) => {
                setForm((f) => ({
                  ...f,
                  supplier: data.supplier || f.supplier,
                  documentNumber: data.documentNumber || f.documentNumber,
                  description: data.description || f.description,
                  acquisitionDate: data.acquisitionDate || f.acquisitionDate,
                  acquisitionValue: data.acquisitionValue
                    ? Number(data.acquisitionValue).toFixed(2).replace('.', ',')
                    : f.acquisitionValue,
                  ncm: data.ncm || f.ncm,
                }));
              }}
            />
          )}
          <div>
            <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Fornecedor *</label>
            <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="XYZ Informática Ltda." />
          </div>
          <div>
            <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Descrição *</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="Computador Dell Latitude 5550" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Data aquisição *</label>
              <input type="date" value={form.acquisitionDate} onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm cursor-pointer ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} />
            </div>
            <div>
              <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Nº Nota *</label>
              <input value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm font-mono ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="12345" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Valor aquisição *</label>
              <input value={form.acquisitionValue} onChange={(e) => setForm({ ...form, acquisitionValue: e.target.value })} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="R$ 5.000,00" />
            </div>
            <div>
              <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>NCM</label>
              <input value={form.ncm} onChange={(e) => setForm({ ...form, ncm: e.target.value })} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm font-mono ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="8471.30.12" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Categoria *</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm cursor-pointer ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`}>
                <option value="">Selecione</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.defaultRate}%)</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Depreciação anual % *</label>
              <input type="number" step="0.01" value={form.annualRate} onChange={(e) => setForm({ ...form, annualRate: e.target.value })} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="10,00" />
            </div>
          </div>
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <button onClick={onClose} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#27272a] border-[#3f3f46] text-white'}`}>Cancelar</button>
          <button disabled={saving} onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                companyId: selectedCompanyId,
                supplier: form.supplier,
                acquisitionDate: form.acquisitionDate,
                documentNumber: form.documentNumber,
                description: form.description,
                acquisitionValue: form.acquisitionValue,
                ncm: form.ncm,
                categoryId: form.categoryId || null,
                annualRate: form.annualRate,
              });
            } finally { setSaving(false); }
          }} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"><Save className="w-3.5 h-3.5" /> Salvar bem</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
