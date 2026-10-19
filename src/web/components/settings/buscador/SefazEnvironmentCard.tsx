import React from 'react';
import { Globe, ShieldCheck, Check } from 'lucide-react';
import type { SefazEnvironment } from '@/core/buscador/domain/types';

interface SefazEnvironmentCardProps {
  env?: SefazEnvironment;
  saving?: boolean;
  onUpdateEnv?: (newEnv: SefazEnvironment) => void;
  isLight: boolean;
}

export function SefazEnvironmentCard({
  isLight,
}: SefazEnvironmentCardProps) {
  return (
    <div>
      <div
        className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${
          isLight ? 'text-[#0f172a]' : 'text-white'
        }`}
      >
        <Globe className="w-4 h-4 text-purple-500" />
        <span>Ambiente de Consulta SEFAZ</span>
      </div>

      <div
        className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
          isLight
            ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm ring-1 ring-emerald-500/20'
            : 'border-emerald-500/50 bg-emerald-500/10 text-white shadow-sm ring-1 ring-emerald-500/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-500 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs flex items-center gap-2">
              <span>Produção (Oficial)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Ativo
              </span>
            </div>
            <div className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Ambiente oficial da SEFAZ ativo com documentos reais e validade jurídica fiscal.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

