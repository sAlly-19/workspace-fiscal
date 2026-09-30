import { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

export interface CategoryModalProps {
  isLight: boolean;
  editing: any;
  onClose: () => void;
  onSave: (data: { name: string; defaultRate: number }) => Promise<void> | void;
}

export function CategoryModal({ isLight, editing, onClose, onSave }: CategoryModalProps) {
  const [name, setName] = useState(editing?.name || '');
  const [rate, setRate] = useState(editing?.defaultRate !== undefined ? String(editing.defaultRate) : '');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
        <div className={`px-4 py-3 border-b flex justify-between items-center ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <h3 className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{editing ? 'Editar categoria' : 'Nova categoria'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className={`text-[11px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Nome da categoria *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Móveis e Utensílios" className={`w-full px-3 py-2 rounded-lg border text-sm ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} />
          </div>
          <div>
            <label className={`text-[11px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Taxa anual padrão (%) *</label>
            <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Ex: 10" type="number" step="0.01" className={`w-full px-3 py-2 rounded-lg border text-sm ${isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#09090b] border-[#3f3f46] text-white'}`} />
          </div>
        </div>
        <div className={`px-4 py-3 border-t flex justify-end gap-2 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <button onClick={onClose} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#27272a] border-[#3f3f46] text-white'}`}>Cancelar</button>
          <button onClick={() => onSave({ name, defaultRate: Number(rate) })} disabled={!name || !rate} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer">{editing ? 'Salvar' : 'Criar'}</button>
        </div>
      </div>
    </motion.div>
  );
}
