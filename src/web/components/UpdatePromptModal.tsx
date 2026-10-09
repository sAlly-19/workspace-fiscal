import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWorkspaceStore } from '../stores/workspace.store';
import {
  UpdatePromptModalProps,
  UpdateModalHeader,
  UpdateModalBody,
  UpdateModalFooter,
} from './update-modal';

export * from './update-modal';

export function UpdatePromptModal({
  isOpen,
  updaterState,
  onClose,
  onDownload,
  onCancel,
  onInstall,
  onCheckAgain,
}: UpdatePromptModalProps) {
  const currentTheme = useWorkspaceStore((s) => s.settings.theme) || 'dark';
  const isLight = currentTheme === 'light';

  if (!isOpen) return null;

  const { status, updateInfo } = updaterState;

  const rawDate = updateInfo?.releaseDate || updateInfo?.publishedAt;
  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const openGitHubRelease = () => {
    const url = updateInfo?.releaseUrl || 'https://github.com/sAlly-19/workspace-fiscal/releases';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[85vh] ${
            isLight
              ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
              : 'bg-[#18181b] border-[#3f3f46] text-white'
          }`}
        >
          {/* Header */}
          <UpdateModalHeader
            updaterState={updaterState}
            isLight={isLight}
            onClose={onClose}
          />

          {/* Body */}
          <UpdateModalBody
            updaterState={updaterState}
            isLight={isLight}
            formattedDate={formattedDate}
          />

          {/* Footer */}
          <UpdateModalFooter
            updaterState={updaterState}
            isLight={isLight}
            onClose={onClose}
            onDownload={onDownload}
            onCancel={onCancel}
            onInstall={onInstall}
            onCheckAgain={onCheckAgain}
            openGitHubRelease={openGitHubRelease}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
