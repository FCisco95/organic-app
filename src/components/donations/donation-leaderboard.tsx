'use client';

import { Trophy } from 'lucide-react';
import { useDonationLeaderboard } from '@/features/donations/hooks';
import { DonorBadgeFromTier } from './donor-badge';

export function DonationLeaderboard() {
  const { data, isLoading, error } = useDonationLeaderboard({ limit: 10 });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load leaderboard.</p>;
  }

  if (!data || data.entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No donations yet. Be the first!</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Trophy className="h-5 w-5 text-yellow-500" />
        Top Donors
      </h3>

      <div className="space-y-2">
        {data.entries.map((entry, i) => (
          <div
            key={entry.donor_id}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                {i + 1}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {entry.donor?.name ?? entry.donor?.email ?? 'Anonymous'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {entry.donation_count} donation{entry.donation_count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                ${entry.total_donated_usd.toFixed(2)}
              </span>
              <DonorBadgeFromTier tier={entry.badge_tier} size="sm" showLabel={false} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
