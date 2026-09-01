import { ReactNode } from 'react';
import { useWorkspaceStore } from '../stores/workspace.store';
import { FolderPlus, FileText, Inbox, PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'folder' | 'file' | 'inbox' | 'package';
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaIcon?: ReactNode;
  onCta?: () => void;
  children?: ReactNode;
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  ctaLabel,
  ctaIcon,
  onCta,
  children,
}: EmptyStateProps) {
  const { settings } = useWorkspaceStore();
  const currentTheme = settings.theme || 'dark';
  const isLight = currentTheme === 'light';

  const IconMap = { folder: FolderPlus, file: FileText, inbox: Inbox, package: PackageOpen };
  const Icon = IconMap[icon];

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 border ${
          isLight
            ? 'bg-blue-50 border-blue-200 text-blue-500'
            : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
        }`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <h3
        className={`text-sm font-bold tracking-tight ${isLight ? 'text-[#0f172a]' : 'text-white'}`}
      >
        {title}
      </h3>
      {description && (
        <p
          className={`text-[11px] mt-1.5 leading-relaxed max-w-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}
        >
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className={`mt-4 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
            isLight
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {ctaIcon}
          {ctaLabel}
        </button>
      )}
    </div>
  );
}