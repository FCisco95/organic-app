'use client';

import { useTranslations } from 'next-intl';
import { useArbitratorStats } from '@/features/disputes/hooks';

export function DisputeStats() {
  const t = useTranslations('Disputes.stats');
  const { data, isLoading, isError, error } = useArbitratorStats(true);
  const stats = data?.data;

  const resolved = stats?.resolved_count ?? 0;
  const overturnRate = stats?.overturn_rate ?? 0;
  const avgHours = stats?.avg_resolution_hours ?? 0;

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{t('title')}</h2>
      {isError ? (
        <p className="mb-3 text-xs text-red-600">{(error as Error)?.message || 'Failed to load'}</p>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label={t('resolved')} value={isLoading ? '...' : String(resolved)} />
        <StatCard
          label={t('overturnRate')}
          value={isLoading ? '...' : `${overturnRate}%`}
        />
        <StatCard
          label={t('avgTime')}
          value={isLoading ? '...' : `${avgHours}h`}
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
