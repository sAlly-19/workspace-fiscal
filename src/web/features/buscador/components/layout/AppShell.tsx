import React from 'react';
import { useWorkspaceStore } from '@/web/stores/workspace.store';
import { TitleBar } from '@/web/components/TitleBar';

export interface AppShellProps {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  toolbar: React.ReactNode;
  content: React.ReactNode;
  footer: React.ReactNode;
  overlays?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ header, sidebar, toolbar, content, footer, overlays }) => {
  const theme = useWorkspaceStore((state) => state.settings.theme || 'dark');
  const isElectron = typeof window !== 'undefined' && !!(window as any).api;

  return (
    <div
      data-testid="app-shell"
      className={`theme-${theme} flex h-screen flex-col overflow-hidden bg-[var(--surface-app)] font-sans text-[var(--text-primary)] antialiased select-none ${isElectron ? 'electron-app' : ''}`}
      style={{ paddingTop: isElectron ? 36 : 0 }}
    >
      <TitleBar />
      {header}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {sidebar}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--surface-workspace)]">
          {toolbar}
          {content}
        </main>
      </div>
      {footer}
      {overlays}
    </div>
  );
};
