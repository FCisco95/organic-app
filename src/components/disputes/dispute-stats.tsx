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
    <div
      data-testid="disputes-arbitration-stats"
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">{t('title')}</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
          {t('operationalSnapshot')}
        </span>
      </div>
      {isError ? (
        <p className="mb-3 text-xs text-red-600">{(error as Error)?.message || 'Failed to load'}</p>
      ) : null}
      {reviewerError ? (
        <p className="mb-3 text-xs text-red-600">{reviewerError.message || 'Failed to load'}</p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          testId="disputes-stat-resolved"
          label={t('resolved')}
          value={isLoading ? '...' : String(resolved)}
        />
        <StatCard
          testId="disputes-stat-overturn-rate"
          label={t('overturnRate')}
          value={isLoading ? '...' : `${overturnRate}%`}
        />
        <StatCard
          testId="disputes-stat-avg-time"
          label={t('avgTime')}
          value={isLoading ? '...' : `${avgHours}h`}
        />
        <StatCard
          testId="disputes-stat-reviewer-accuracy"
          label={t('reviewerAccuracy')}
          value={isReviewerLoading ? '...' : `${reviewerAccuracy}%`}
        />
      </div>
      <p className="mt-3 text-[11px] text-gray-400">{t('hint')}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
