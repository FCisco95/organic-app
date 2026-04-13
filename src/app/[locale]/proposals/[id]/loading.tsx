import { PageContainer } from '@/components/layout';

export default function ProposalDetailLoading() {
  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Back button */}
        <div className="skeleton-shimmer h-5 w-32 rounded" />

        {/* Title + status badge */}
        <div className="flex items-start justify-between gap-4">
          <div className="skeleton-shimmer h-8 w-3/4 rounded-lg" />
          <div className="skeleton-shimmer h-7 w-20 rounded-full" />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4">
          <div className="skeleton-shimmer h-4 w-24 rounded" />
          <div className="skeleton-shimmer h-4 w-32 rounded" />
          <div className="skeleton-shimmer h-4 w-20 rounded" />
        </div>

        {/* Body content */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-3">
            <div className="skeleton-shimmer h-4 w-full rounded" />
            <div className="skeleton-shimmer h-4 w-full rounded" />
            <div className="skeleton-shimmer h-4 w-5/6 rounded" />
            <div className="skeleton-shimmer h-4 w-4/5 rounded" />
            <div className="skeleton-shimmer h-4 w-full rounded" />
            <div className="skeleton-shimmer h-4 w-2/3 rounded" />
          </div>
        </div>

        {/* Voting panel placeholder */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="skeleton-shimmer mb-4 h-5 w-32 rounded" />
          <div className="skeleton-shimmer h-3 w-full rounded-full" />
          <div className="mt-4 flex gap-3">
            <div className="skeleton-shimmer h-10 w-24 rounded-lg" />
            <div className="skeleton-shimmer h-10 w-24 rounded-lg" />
          </div>
        </div>

        {/* Comments placeholder */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="skeleton-shimmer mb-4 h-5 w-28 rounded" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton-shimmer h-8 w-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton-shimmer h-3 w-24 rounded" />
                  <div className="skeleton-shimmer h-4 w-full rounded" />
                  <div className="skeleton-shimmer h-4 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
