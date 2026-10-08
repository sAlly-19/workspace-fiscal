import React from 'react';
import { Home, Package, Building2, Tag, BarChart3 } from 'lucide-react';

export type DepreciationTab = 'dashboard' | 'assets' | 'companies' | 'categories';

export interface DepreciationSidebarProps {
  tab: DepreciationTab;
  onSelectTab: (tab: DepreciationTab) => void;
  isLight: boolean;
}

export function DepreciationSidebar({
  tab,
  onSelectTab,
  isLight,
}: DepreciationSidebarProps) {
  return (
    <aside className={`w-[200px] border-r flex flex-col shrink-0 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#0d0d10] border-[#27272a]'}`}>
      <nav className="flex-1 p-2 space-y-1">
        {[
          { id: 'dashboard' as const, label: 'Início', icon: Home },
          { id: 'assets' as const, label: 'Bens', icon: Package },
          { id: 'companies' as const, label: 'Empresas', icon: Building2 },
          { id: 'categories' as const, label: 'Categorias', icon: Tag },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
              tab === item.id ? (isLight ? 'bg-blue-600 text-white shadow' : 'bg-blue-600 text-white') : (isLight ? 'text-[#475569] hover:bg-white hover:shadow-sm' : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-white')
            }`}
          >
            <item.icon className="w-4 h-4" /> {item.label}
          </button>
        ))}
      </nav>
      <div className={`p-3 border-t text-[11px] ${isLight ? 'border-[#e2e8f0] text-[#94a3b8]' : 'border-[#27272a] text-[#52525b]'}`}>
        <div className="flex items-center gap-1.5"><BarChart3 className="w-3 h-3" /> Depreciação proporcional</div>
        <div className="mt-1">Cálculo em centavos • UTF-8 CSV</div>
      </div>
    </aside>
  );
}
