import { useWorkspaceStore } from '../stores/workspace.store';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  const { settings } = useWorkspaceStore();
  const isLight = settings.theme === 'light';
  return (
    <div
      className={`animate-pulse rounded ${
        isLight ? 'bg-[#e2e8f0]' : 'bg-[#27272a]'
      } ${className}`}
    />
  );
}

export function DocumentCardSkeleton() {
  return (
    <div className="p-2.5 rounded-lg border border-[#27272a] bg-[#141418] space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex items-center justify-between pt-1.5 border-t border-[#27272a]/70">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

export function TreeItemSkeleton() {
  return (
    <div className="flex items-center gap-1.5 py-1.5 px-2">
      <Skeleton className="h-3 w-3 rounded-full" />
      <Skeleton className="h-3 flex-1" />
    </div>
  );
}