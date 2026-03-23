import { PageContainer } from '@/components/layout';

export default function CommunityLoading() {
  return (
    <PageContainer layout="fluid">
      <div className="space-y-6">
        {/* Page title + description */}
        <div>
          <div className="skeleton-shimmer mb-2 h-8 w-40 rounded-lg" />
          <div className="skeleton-shimmer h-4 w-64 rounded" />
        </div>

        {/* Search / filter bar */}
        <div className="flex gap-3">
          <div className="skeleton-shimmer h-10 flex-1 rounded-lg" />
          <div className="skeleton-shimmer h-10 w-28 rounded-lg" />
        </div>

        {/* Member card grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-3">
                {/* Avatar circle */}
                <div className="skeleton-shimmer h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <div className="skeleton-shimmer mb-1 h-4 w-28 rounded" />
                  <div className="skeleton-shimmer h-3 w-20 rounded" />
                </div>
              </div>
              {/* Stats row */}
              <div className="flex gap-4">
                <div className="skeleton-shimmer h-3 w-16 rounded" />
                <div className="skeleton-shimmer h-3 w-16 rounded" />
                <div className="skeleton-shimmer h-3 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
