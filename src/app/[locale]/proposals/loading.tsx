import { PageContainer } from '@/components/layout';

export default function ProposalsLoading() {
  return (
    <PageContainer layout="fluid">
      <div className="space-y-6">
        {/* Page title */}
        <div className="skeleton-shimmer h-8 w-44 rounded-lg" />

        {/* Governance strip — stats bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="skeleton-shimmer mb-2 h-3 w-24 rounded" />
              <div className="skeleton-shimmer h-6 w-12 rounded" />
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-9 w-24 rounded-lg" />
          ))}
        </div>

        {/* Proposal cards */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="skeleton-shimmer h-6 w-16 rounded-full" />
                <div className="skeleton-shimmer h-4 w-24 rounded" />
              </div>
              <div className="skeleton-shimmer mb-2 h-5 w-3/4 rounded" />
              <div className="skeleton-shimmer mb-4 h-4 w-full rounded" />
              <div className="flex items-center gap-4">
                <div className="skeleton-shimmer h-2 flex-1 rounded-full" />
                <div className="skeleton-shimmer h-4 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
