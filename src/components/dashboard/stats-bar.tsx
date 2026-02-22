'use client';

import { Fragment } from 'react';
import { useStats } from '@/features/activity';
import { useTranslations } from 'next-intl';

export function StatsBar() {
  const { data: stats, isLoading } = useStats();
  const t = useTranslations('dashboard.stats');

  if (isLoading) {
    return <div className="h-5 w-72 rounded bg-muted animate-pulse" />;
  }

  const items = [
    { value: stats?.total_users ?? '—', label: t('totalUsers') },
    { value: stats?.org_holders ?? '—', label: t('orgHolders') },
    { value: stats?.active_proposals ?? '—', label: t('activeProposals') },
    { value: stats?.tasks_completed ?? '—', label: t('tasksCompleted') },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && <span className="text-border">&middot;</span>}
          <span>
            <span className="font-semibold tabular-nums text-foreground">{item.value}</span>{' '}
            {item.label}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
