import { PageContainer } from '@/components/layout';

export default function TasksLoading() {
  return (
    <PageContainer layout="fluid">
      <div className="space-y-6">
        {/* Page title */}
        <div className="skeleton-shimmer h-8 w-36 rounded-lg" />

        {/* KPI tiles — 4 rounded cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <div className="skeleton-shimmer mb-2 h-3 w-20 rounded" />
              <div className="skeleton-shimmer mb-1 h-7 w-14 rounded" />
              <div className="skeleton-shimmer h-3 w-28 rounded" />
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-9 w-20 rounded-lg" />
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex gap-3">
          <div className="skeleton-shimmer h-9 w-48 rounded-lg" />
          <div className="skeleton-shimmer h-9 w-32 rounded-lg" />
          <div className="skeleton-shimmer h-9 w-28 rounded-lg" />
        </div>

        {/* Task list rows */}
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4"
            >
              <div className="skeleton-shimmer h-5 w-5 rounded" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-shimmer h-4 w-2/3 rounded" />
                <div className="skeleton-shimmer h-3 w-1/3 rounded" />
              </div>
              <div className="skeleton-shimmer h-6 w-16 rounded-full" />
              <div className="skeleton-shimmer h-8 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
