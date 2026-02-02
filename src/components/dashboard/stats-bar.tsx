'use client';

import { useStats } from '@/features/activity';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function StatsBar() {
  const { data: stats, isLoading } = useStats();
  const t = useTranslations('dashboard.stats');

  const items = [
    { label: t('totalUsers'), value: stats?.total_users ?? '—' },
    { label: t('orgHolders'), value: stats?.org_holders ?? '—' },
    {
      label: t('orgPrice'),
      value: stats?.org_price != null ? `$${stats.org_price.toFixed(6)}` : '—',
      mono: true,
    },
    { label: t('tasksCompleted'), value: stats?.tasks_completed ?? '—' },
    { label: t('activeProposals'), value: stats?.active_proposals ?? '—' },
  ];

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/70 divide-x divide-gray-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            'flex flex-col justify-center px-5 py-5',
            // On 2-col mobile, remove left border from first item in each row
            i === 0 && 'border-l-0',
            // Last item on odd count in 2-col: span full width
            i === items.length - 1 && items.length % 2 !== 0 && 'col-span-2 sm:col-span-1'
          )}
        >
          {isLoading ? (
            <>
              <div className="h-7 w-14 rounded-md bg-gray-100 animate-pulse" />
              <div className="mt-2 h-3 w-20 rounded bg-gray-50 animate-pulse" />
            </>
          ) : (
            <>
              <p
                className={cn(
                  'text-2xl font-bold text-gray-900 leading-none',
                  item.mono && 'font-mono tabular-nums text-xl'
                )}
              >
                {item.value}
              </p>
              <p className="mt-1.5 text-xs text-gray-400 leading-tight">{item.label}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
