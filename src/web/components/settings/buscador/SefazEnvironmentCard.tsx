import React from 'react';
import { Globe, AlertTriangle, ShieldCheck, Check } from 'lucide-react';
import type { SefazEnvironment } from '@/core/buscador/domain/types';

interface SefazEnvironmentCardProps {
  env: SefazEnvironment;
  saving: boolean;
  onUpdateEnv: (newEnv: SefazEnvironment) => void;
  isLight: boolean;
}

export function SefazEnvironmentCard({
  env,
  saving,
  onUpdateEnv,
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

      <div className="grid grid-cols-2 gap-3">
        {/* Homologação */}
        <button
          type="button"
          disabled={saving}
          onClick={() => onUpdateEnv('homologation')}
          className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer text-left ${
            env === 'homologation'
              ? isLight
                ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-md ring-2 ring-amber-500/20'
                : 'border-amber-500/60 bg-amber-500/10 text-white shadow-md ring-2 ring-amber-500/30'
              : isLight
                ? 'border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:text-[#0f172a]'
                : 'border-[#27272a] bg-[#111114] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white'
          }`}
        >
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-center">
            <div className="font-bold text-xs">Homologação (Testes)</div>
            <div className={`text-[10px] mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
              Ambiente de testes (sem validade fiscal)
            </div>
          </div>
          {env === 'homologation' && (
            <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> Ativo
            </span>
          )}
        </button>

        {/* Produção */}
        <button
          type="button"
          disabled={saving}
          onClick={() => onUpdateEnv('production')}
          className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer text-left ${
            env === 'production'
              ? isLight
                ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-md ring-2 ring-emerald-500/20'
                : 'border-emerald-500/60 bg-emerald-500/10 text-white shadow-md ring-2 ring-emerald-500/30'
              : isLight
                ? 'border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:text-[#0f172a]'
                : 'border-[#27272a] bg-[#111114] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white'
          }`}
        >
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-center">
            <div className="font-bold text-xs">Produção (Oficial)</div>
            <div className={`text-[10px] mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
              Documentos reais com validade jurídica
            </div>
          </div>
          {env === 'production' && (
            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> Ativo
            </span>
          )}
        </button>
      </div>

      <div
        className={`mt-2 p-2.5 rounded-lg border text-[11px] leading-relaxed flex items-start gap-2 ${
          isLight
            ? 'bg-[#f8fafc] border-[#e2e8f0] text-[#64748b]'
            : 'bg-[#141418] border-[#27272a] text-[#a1a1aa]'
        }`}
      >
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <span>
          Ao alternar entre Homologação e Produção, o NSU de cada empresa é preservado
          individualmente por ambiente, garantindo que o histórico nunca seja perdido.
        </span>
      </div>
    </div>
  );
}

