import { useEffect, useState, useCallback } from 'react';
import { Minus, Square, Copy, X, Maximize2 } from 'lucide-react';
import { isElectron } from '../lib/api';
import { useWorkspaceStore } from '../stores/workspace.store';

type WinState = {
  isMaximized: boolean;
  isFullScreen: boolean;
  platform: NodeJS.Platform;
};

type Theme = 'dark' | 'light';

const TITLEBAR_STYLES: Record<Theme, {
  background: string;
  borderBottom: string;
  textPrimary: string;
  textSecondary: string;
  iconShadow: string;
}> = {
  dark: {
    background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)',
    borderBottom: '1px solid #27272a',
    textPrimary: '#fafafa',
    textSecondary: 'rgba(250, 250, 250, 0.65)',
    iconShadow: '0 1px 2px rgba(0,0,0,0.4)',
  },
  light: {
    background: 'linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%)',
    borderBottom: '1px solid #94a3b8',
    textPrimary: '#0f172a',
    textSecondary: 'rgba(15, 23, 42, 0.6)',
    iconShadow: '0 1px 2px rgba(0,0,0,0.08)',
  },
};

export function TitleBar() {
  const [state, setState] = useState<WinState>({
    isMaximized: false,
    isFullScreen: false,
    platform: 'win32',
  });

  const theme = (useWorkspaceStore((s) => s.settings.theme) || 'dark') as Theme;
  const t = TITLEBAR_STYLES[theme];

  useEffect(() => {
    if (!isElectron()) return;
    let mounted = true;
    window.api.getWindowState().then((s) => {
      if (mounted) setState(s);
    });
    const off = window.api.onWindowStateChange((s) => {
      if (mounted) setState(s);
    });
    return () => {
      mounted = false;
      off();
    };
  }, []);

  const handle = useCallback(async (action: 'minimize' | 'maximize' | 'close' | 'fullscreen') => {
    if (!isElectron()) return;
    await window.api.windowControl(action);
  }, []);

  const isMac = state.platform === 'darwin';

  // Buttons adopt the theme's control color logic
  const btnBase =
    'h-full w-12 flex items-center justify-center transition-colors cursor-pointer';
  const btnIdle =
    theme === 'light'
      ? 'text-[#334155] hover:bg-[#475569]/15 active:bg-[#475569]/25 hover:text-[#0f172a]'
      : 'text-[#a1a1aa] hover:bg-white/12 hover:text-white active:bg-white/20';
  const btnClose =
    theme === 'light'
      ? 'text-[#334155] hover:bg-red-500 hover:text-white active:bg-red-600'
      : 'text-[#a1a1aa] hover:bg-red-600 hover:text-white active:bg-red-700';

  return (
    <div
      id="custom-titlebar"
      className="titlebar-drag fixed top-0 left-0 right-0 z-[100] h-9 flex items-center justify-between select-none transition-colors duration-200"
      style={{
        background: t.background,
        borderBottom: t.borderBottom,
        boxShadow:
          theme === 'light'
            ? 'inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 6px rgba(0,0,0,0.12)'
            : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.15)',
      }}
    >
      {/* Left: app icon + title */}
      <div
        className="flex items-center h-full pl-3 pr-2 titlebar-no-drag"
        style={{ marginLeft: isMac ? 72 : 0 }}
      >
        <img
          src="/icon.png"
          alt="Workspace Fiscal"
          className="w-5 h-5 rounded object-cover"
          referrerPolicy="no-referrer"
          draggable={false}
          style={{ boxShadow: t.iconShadow }}
        />
        <span
          className="ml-2 text-[12px] font-semibold tracking-tight"
          style={{ color: t.textPrimary }}
        >
          Workspace Fiscal
        </span>
        <span
          className="ml-2 text-[10px] font-medium hidden sm:inline"
          style={{ color: t.textSecondary }}
        >
          Hub Fiscal • NF View + Depreciação
        </span>
      </div>

      {/* Center spacer (drag region) */}
      <div className="flex-1 h-full" />

      {/* Right: window controls */}
      <div className="flex items-center h-full titlebar-no-drag">
        {!isMac && (
          <>
            <button
              onClick={() => handle('minimize')}
              title="Minimizar"
              className={`${btnBase} ${btnIdle}`}
            >
              <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
            <button
              onClick={() => handle('maximize')}
              title={state.isMaximized ? 'Restaurar' : 'Maximizar'}
              className={`${btnBase} ${btnIdle}`}
            >
              {state.isMaximized ? (
                <Copy className="w-3.5 h-3.5" strokeWidth={2.5} />
              ) : (
                <Square className="w-3 h-3" strokeWidth={2.5} />
              )}
            </button>
            <button
              onClick={() => handle('close')}
              title="Fechar"
              className={`${btnBase} ${btnClose}`}
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </>
        )}
        {isMac && (
          <>
            <button
              onClick={() => handle('minimize')}
              title="Minimizar"
              className={`${btnBase} ${btnIdle}`}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handle('fullscreen')}
              title="Tela cheia"
              className={`${btnBase} ${btnIdle}`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handle('close')}
              title="Fechar"
              className={`${btnBase} ${btnClose}`}
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
