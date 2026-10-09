import { UpdaterState } from '../../hooks/useAutoUpdate';

export interface UpdatePromptModalProps {
  isOpen: boolean;
  updaterState: UpdaterState;
  onClose: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onInstall: () => void;
  onCheckAgain?: () => void;
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, i);
  return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${units[i]}`;
}

