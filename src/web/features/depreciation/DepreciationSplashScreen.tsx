import { useEffect, useState } from 'react';
import { Building2, TrendingDown, Sparkles } from 'lucide-react';

interface DepreciationSplashScreenProps {
  onFinish?: () => void;
  minDuration?: number;
}

export function DepreciationSplashScreen({ onFinish, minDuration = 800 }: DepreciationSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const closeTimer = setTimeout(() => {
        setIsVisible(false);
        if (onFinish) onFinish();
      }, 350);
      return () => clearTimeout(closeTimer);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onFinish]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#09090b] text-white transition-opacity duration-350 ease-out select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background glow orb */}
      <div className="absolute w-80 h-80 rounded-full bg-emerald-600/15 blur-[100px] pointer-events-none" />

      <div className="relative flex flex-col items-center max-w-xs text-center">
        {/* Brand Icon Box */}
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent border border-emerald-500/30 flex items-center justify-center shadow-2xl shadow-emerald-500/20 backdrop-blur-md">
            <TrendingDown className="w-10 h-10 text-emerald-400" />
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-400/20 border border-emerald-400/50 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
          </div>
        </div>

        {/* Title & Tagline */}
        <h1 className="text-2xl font-black tracking-tight text-white mb-1">
          Depreciação Fiscal
        </h1>
        <p className="text-xs text-[#a1a1aa] mb-6 font-medium">
          Gestão Patrimonial & Ativo Imobilizado
        </p>

        {/* Loader bar */}
        <div className="w-48 h-1 bg-[#27272a] rounded-full overflow-hidden relative">
          <div 
            className="absolute inset-y-0 bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-300 rounded-full w-24"
            style={{
              animation: 'deprec-splash-loader 1s cubic-bezier(0.4, 0, 0.2, 1) infinite'
            }}
          />
        </div>

        <span className="text-[11px] text-[#71717a] mt-3 tracking-wide flex items-center gap-1.5">
          <Building2 className="w-3 h-3 text-emerald-400/80" />
          Carregando bens e competências...
        </span>

        <div className="mt-8 text-[11px] text-[#52525b] font-medium flex items-center gap-1.5">
          <span>Desenvolvido por</span>
          <span className="text-emerald-400/80 font-semibold">Café - Sistemas & Softwares</span>
        </div>
      </div>

      <style>{`
        @keyframes deprec-splash-loader {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

