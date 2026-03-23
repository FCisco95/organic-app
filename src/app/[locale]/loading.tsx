import { PageContainer } from '@/components/layout';

export default function RootLoading() {
  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Page title skeleton */}
        <div className="skeleton-shimmer h-8 w-48 rounded-lg" />

        {/* Content card skeletons */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="skeleton-shimmer mb-4 h-5 w-64 rounded" />
            <div className="space-y-3">
              <div className="skeleton-shimmer h-4 w-full rounded" />
              <div className="skeleton-shimmer h-4 w-3/4 rounded" />
              <div className="skeleton-shimmer h-4 w-5/6 rounded" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="skeleton-shimmer mb-3 h-5 w-32 rounded" />
              <div className="skeleton-shimmer h-4 w-full rounded" />
              <div className="skeleton-shimmer mt-2 h-4 w-2/3 rounded" />
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="skeleton-shimmer mb-3 h-5 w-32 rounded" />
              <div className="skeleton-shimmer h-4 w-full rounded" />
              <div className="skeleton-shimmer mt-2 h-4 w-2/3 rounded" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="skeleton-shimmer mb-4 h-5 w-40 rounded" />
            <div className="space-y-3">
              <div className="skeleton-shimmer h-4 w-full rounded" />
              <div className="skeleton-shimmer h-4 w-4/5 rounded" />
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
