'use client';

import { useTranslations } from 'next-intl';
import { useArbitratorStats, useReviewerAccuracy } from '@/features/disputes/hooks';

export function DisputeStats() {
  const t = useTranslations('Disputes.stats');
  const { data, isLoading, isError, error } = useArbitratorStats(true);
  const reviewerAccuracyQuery = useReviewerAccuracy(true);
  const stats = data?.data;
  const reviewerStats = reviewerAccuracyQuery.data?.data;

  const resolved = stats?.resolved_count ?? 0;
  const overturnRate = stats?.overturn_rate ?? 0;
  const avgHours = stats?.avg_resolution_hours ?? 0;
  const reviewerAccuracy = reviewerStats?.reviewer_accuracy ?? 0;
  const isReviewerLoading = reviewerAccuracyQuery.isLoading;
  const reviewerError = reviewerAccuracyQuery.error as Error | null;

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{t('title')}</h2>
      {isError ? (
        <p className="mb-3 text-xs text-red-600">{(error as Error)?.message || 'Failed to load'}</p>
      ) : null}
      {reviewerError ? (
        <p className="mb-3 text-xs text-red-600">{reviewerError.message || 'Failed to load'}</p>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t('resolved')} value={isLoading ? '...' : String(resolved)} />
        <StatCard
          label={t('overturnRate')}
          value={isLoading ? '...' : `${overturnRate}%`}
        />
        <StatCard
          label={t('avgTime')}
          value={isLoading ? '...' : `${avgHours}h`}
        />
        <StatCard
          label={t('reviewerAccuracy')}
          value={isReviewerLoading ? '...' : `${reviewerAccuracy}%`}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
