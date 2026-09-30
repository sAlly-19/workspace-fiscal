import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Save } from 'lucide-react';

export interface CompanyModalProps {
  isLight: boolean;
  editing: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void> | void;
}

export function CompanyModal({ isLight, editing, onClose, onSave }: CompanyModalProps) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    document: editing?.document || editing?.cnpj || '',
  });
  const [saving, setSaving] = useState(false);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <h3 className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{editing ? 'Editar empresa' : 'Nova empresa'}</h3>
          <button onClick={onClose} className={`p-1.5 rounded-lg cursor-pointer ${isLight ? 'hover:bg-[#e2e8f0]' : 'hover:bg-white/10'}`}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>Razão social *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="ABC Comércio Ltda." />
            <p className={`text-[11px] mt-1 ${isLight ? 'text-[#94a3b8]' : 'text-[#71717a]'}`}>Nome registrado no CNPJ</p>
          </div>
          <div>
            <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>CNPJ *</label>
            <input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm font-mono ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} placeholder="12.345.678/0001-00" />
            <p className={`text-[11px] mt-1 ${isLight ? 'text-[#94a3b8]' : 'text-[#71717a]'}`}>Apenas números, com ou sem máscara</p>
          </div>
        </div>
        <div className={`px-5 py-3 border-t flex justify-end gap-2 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <button onClick={onClose} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#27272a] border-[#3f3f46] text-white'}`}>Cancelar</button>
          <button disabled={saving || !form.name.trim()} onClick={async () => { setSaving(true); try { await onSave(form); } finally { setSaving(false); } }} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"><Save className="w-3.5 h-3.5" /> Salvar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
