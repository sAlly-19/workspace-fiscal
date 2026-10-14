/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MainLayout } from './layouts/MainLayout';
import { Home } from './features/home/Home';
import { DepreciationApp } from './features/depreciation/DepreciationApp';
import { BuscadorApp } from './features/buscador/BuscadorApp';
import { ServerUnreachableOverlay, useServerUnreachable } from './components/ServerUnreachableOverlay';
import { WhatsNewModal } from './components/WhatsNewModal';
import { UpdatePromptModal } from './components/UpdatePromptModal';
import { SettingsModal } from './components/SettingsModal';
import { useAutoUpdate } from './hooks/useAutoUpdate';
import { useWorkspaceStore } from './stores/workspace.store';
import { useGlobalKeyboardShortcuts } from './hooks/useGlobalKeyboardShortcuts';

type View = 'home' | 'nfview' | 'depreciation' | 'buscador';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const serverUnreachable = useServerUnreachable();
  const setIsSettingsOpen = useWorkspaceStore((s) => s.setIsSettingsOpen);
  const {
    isOpen: isUpdateModalOpen,
    updaterState,
    dismissUpdate,
    startDownload,
    cancelDownload,
    installAndRestart,
    checkNow,
  } = useAutoUpdate();

  // Atalhos Globais de Produtividade (IMP-023)
  useGlobalKeyboardShortcuts({
    onNavigateHome: () => setView('home'),
    onNavigateNfView: () => setView('nfview'),
    onNavigateDepreciation: () => setView('depreciation'),
    onNavigateBuscador: () => setView('buscador'),
    onOpenSettings: () => setIsSettingsOpen(true),
    onOpenHelp: () => setIsWhatsNewOpen(true),
  });

  return (
    <>
      <AnimatePresence mode="wait">
        {view === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="min-h-screen"
          >
            <Home
              onOpenNFView={() => setView('nfview')}
              onOpenDepreciation={() => setView('depreciation')}
              onOpenBuscador={() => setView('buscador')}
            />
          </motion.div>
        ) : view === 'nfview' ? (
          <motion.div
            key="nfview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="min-h-screen"
          >
            <MainLayout onBackToHome={() => setView('home')} />
          </motion.div>
        ) : view === 'depreciation' ? (
          <motion.div
            key="depreciation"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="min-h-screen"
          >
            <DepreciationApp onBackToHome={() => setView('home')} />
          </motion.div>
        ) : (
          <motion.div
            key="buscador"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="min-h-screen"
          >
            <BuscadorApp onBackToHome={() => setView('home')} />
          </motion.div>
        )}
      </AnimatePresence>
      <ServerUnreachableOverlay
        visible={serverUnreachable}
        onRetry={() => window.location.reload()}
      />
      {view === 'home' && <SettingsModal />}
      <WhatsNewModal
        open={isWhatsNewOpen || undefined}
        onClose={() => setIsWhatsNewOpen(false)}
      />
      <UpdatePromptModal
        isOpen={isUpdateModalOpen}
        updaterState={updaterState}
        onClose={dismissUpdate}
        onDownload={startDownload}
        onCancel={cancelDownload}
        onInstall={installAndRestart}
        onCheckAgain={() => checkNow(true)}
      />
    </>
  );
}
