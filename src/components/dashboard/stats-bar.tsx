'use client';

import { useStats } from '@/features/activity';
import { useTranslations } from 'next-intl';

export function StatsBar() {
  const { data: stats, isLoading } = useStats();
  const t = useTranslations('dashboard.stats');

  const items = [
    { label: t('totalUsers'), value: stats?.total_users ?? '—' },
    { label: t('orgHolders'), value: stats?.org_holders ?? '—' },
    {
      label: t('orgPrice'),
      value: stats?.org_price != null ? `$${stats.org_price.toFixed(6)}` : '—',
    },
    { label: t('tasksCompleted'), value: stats?.tasks_completed ?? '—' },
    { label: t('activeProposals'), value: stats?.active_proposals ?? '—' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center"
        >
          <p className="text-2xl font-bold text-gray-900">
            {isLoading ? (
              <span className="inline-block w-8 h-6 bg-gray-200 rounded animate-pulse" />
            ) : (
              item.value
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
