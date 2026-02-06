'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { AnalyticsKPIs } from '@/features/analytics';
import { TOKEN_CONFIG } from '@/config/token';

interface KPICardsProps {
  kpis: AnalyticsKPIs | undefined;
  loading: boolean;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function KPICards({ kpis, loading }: KPICardsProps) {
  const t = useTranslations('Analytics');

  const items = [
    { label: t('kpi.totalUsers'), value: kpis?.total_users ?? '—' },
    { label: t('kpi.orgHolders'), value: kpis?.org_holders ?? '—' },
    {
      label: t('kpi.orgPrice', { symbol: TOKEN_CONFIG.symbol }),
      value: kpis?.org_price != null ? `$${kpis.org_price.toFixed(6)}` : '—',
      mono: true,
    },
    {
      label: t('kpi.marketCap'),
      value: kpis?.market_cap != null ? `$${formatCompact(kpis.market_cap)}` : '—',
      mono: true,
    },
    { label: t('kpi.tasksCompleted'), value: kpis?.tasks_completed ?? '—' },
    { label: t('kpi.activeProposals'), value: kpis?.active_proposals ?? '—' },
  ];

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/70 divide-x divide-gray-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col justify-center px-5 py-5">
          {loading ? (
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
