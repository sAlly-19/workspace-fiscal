/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MainLayout } from './layouts/MainLayout';
import { Home } from './features/home/Home';
import { DepreciationApp } from './features/depreciation/DepreciationApp';
import { ServerUnreachableOverlay, useServerUnreachable } from './components/ServerUnreachableOverlay';

type View = 'home' | 'nfview' | 'depreciation';

export default function App() {
  const [view, setView] = useState<View>('home');
  const serverUnreachable = useServerUnreachable();

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
            <Home onOpenNFView={() => setView('nfview')} onOpenDepreciation={() => setView('depreciation')} />
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
        ) : (
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
        )}
      </AnimatePresence>
      <ServerUnreachableOverlay
        visible={serverUnreachable}
        onRetry={() => window.location.reload()}
      />
    </>
  );
}
