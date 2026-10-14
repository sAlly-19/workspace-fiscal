import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCNPJ, isValidCNPJ, sanitizeCNPJ } from '@/core/buscador/domain/cnpj';
import { useDialogFocus } from '@/web/hooks/useDialogFocus';

const BRAZILIAN_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export interface CompanyModalProps {
  isLight: boolean;
  editing: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void> | void;
}

export function CompanyModal({ isLight, editing, onClose, onSave }: CompanyModalProps) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    document: editing?.document || editing?.cnpj ? formatCNPJ(editing.document || editing.cnpj) : '',
    state: editing?.state || editing?.uf || '',
    city: editing?.city || '',
    depreciationRule: editing?.depreciationRule || 'PROPORTIONAL',
  });
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputNameRef = useRef<HTMLInputElement>(null);

  useDialogFocus(true, dialogRef, inputNameRef, onClose);

  const cleanCnpj = sanitizeCNPJ(form.document);
  const has14Digits = cleanCnpj.length === 14;
  const isCnpjValid = !cleanCnpj || isValidCNPJ(cleanCnpj);
  const canSave = form.name.trim().length >= 2 && (!cleanCnpj || (has14Digits && isCnpjValid));

  const handleCnpjChange = (val: string) => {
    const raw = sanitizeCNPJ(val).slice(0, 14);
    setForm((prev) => ({ ...prev, document: formatCNPJ(raw) }));
  };

  const handleSubmit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        document: cleanCnpj || undefined,
        cnpj: cleanCnpj || undefined,
        state: form.state || undefined,
        city: form.city.trim() || undefined,
      });

      // Dispara barramento de sincronização reativa entre Buscador e Depreciação (IMP-012)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('wsf:companies-updated', {
            detail: { action: editing ? 'update' : 'create' },
          })
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deprec-company-modal-title"
        tabIndex={-1}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl outline-none ${
          isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
          }`}
        >
          <h3 id="deprec-company-modal-title" className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            {editing ? 'Editar empresa' : 'Nova empresa'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            disabled={saving}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              isLight ? 'hover:bg-[#e2e8f0] text-slate-500' : 'hover:bg-white/10 text-zinc-400'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
              Razão social *
            </label>
            <input
              ref={inputNameRef}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none ${
                isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#09090b] border-[#3f3f46] text-white'
              }`}
              placeholder="Ex: ABC Comércio e Serviços Ltda."
            />
            <p className={`text-[11px] mt-1 ${isLight ? 'text-[#94a3b8]' : 'text-[#71717a]'}`}>
              Nome oficial registrado na Receita Federal
            </p>
          </div>

          <div>
            <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
              CNPJ *
            </label>
            <input
              value={form.document}
              onChange={(e) => handleCnpjChange(e.target.value)}
              className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm font-mono outline-none ${
                isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#09090b] border-[#3f3f46] text-white'
              }`}
              placeholder="00.000.000/0000-00"
            />
            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              {cleanCnpj.length === 0 ? (
                <span className={isLight ? 'text-[#94a3b8]' : 'text-[#71717a]'}>
                  14 dígitos (apenas números ou formatado)
                </span>
              ) : !has14Digits ? (
                <span className="text-amber-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> CNPJ incompleto ({cleanCnpj.length}/14 dígitos)
                </span>
              ) : !isCnpjValid ? (
                <span className="text-red-500 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" /> CNPJ inválido perante algoritmo da Receita Federal
                </span>
              ) : (
                <span className="text-emerald-500 flex items-center gap-1 font-medium">
                  <CheckCircle className="w-3 h-3" /> CNPJ válido
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                Estado (UF)
              </label>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none cursor-pointer ${
                  isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#09090b] border-[#3f3f46] text-white'
                }`}
              >
                <option value="">Selecione...</option>
                {BRAZILIAN_UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                Cidade
              </label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none ${
                  isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#09090b] border-[#3f3f46] text-white'
                }`}
                placeholder="Ex: São Paulo"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex justify-end gap-2 ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
          }`}
        >
          <button
            onClick={onClose}
            disabled={saving}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
              isLight ? 'bg-white border-[#e2e8f0] text-slate-700' : 'bg-[#27272a] border-[#3f3f46] text-white'
            }`}
          >
            Cancelar
          </button>
          <button
            disabled={saving || !canSave}
            onClick={handleSubmit}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md transition-all active:scale-95"
          >
            {saving ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Salvar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
