import { useEffect, useState } from 'react';
import { FileCheck, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDuration?: number;
}

export function SplashScreen({ onFinish, minDuration = 900 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const closeTimer = setTimeout(() => {
        setIsVisible(false);
        if (onFinish) onFinish();
      }, 400);
      return () => clearTimeout(closeTimer);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onFinish]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#09090b] text-white transition-opacity duration-400 ease-out select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background glow orb */}
      <div className="absolute w-72 h-72 rounded-full bg-blue-600/15 blur-[90px] pointer-events-none" />

      <div className="relative flex flex-col items-center max-w-xs text-center">
        {/* Brand Icon Box with subtle pulsing glow */}
        <div className="relative mb-5">
          <img
            src="/icon.png"
            alt="Workspace Fiscal"
            className="w-20 h-20 rounded-2xl shadow-2xl shadow-blue-500/30 border border-blue-400/30 object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-blue-400/20 border border-blue-400/50 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
          </div>
        </div>

        {/* Title & Tagline */}
        <h1 className="text-2xl font-black tracking-tight text-white mb-1">
          Workspace Fiscal
        </h1>
        <p className="text-xs text-[#a1a1aa] mb-6 font-medium">
          Hub Fiscal • NF View + Depreciação
        </p>

        {/* Loader bar */}
        <div className="w-48 h-1 bg-[#27272a] rounded-full overflow-hidden relative">
          <div className="absolute inset-y-0 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full w-24 animate-[shimmer_1.2s_infinite]" 
            style={{
              animation: 'splash-loader 1s cubic-bezier(0.4, 0, 0.2, 1) infinite'
            }}
          />
        </div>

        <span className="text-[11px] text-[#71717a] mt-3 tracking-wide">
          Carregando ambiente fiscal...
        </span>

        <div className="mt-8 text-[11px] text-[#52525b] font-medium flex items-center gap-1.5">
          <span>Desenvolvido por</span>
          <span className="text-blue-400/80 font-semibold">Café - Sistemas & Softwares</span>
        </div>
      </div>

      <style>{`
        @keyframes splash-loader {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
