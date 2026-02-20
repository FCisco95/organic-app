'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { AnalyticsKPIs, AnalyticsTrustMeta } from '@/features/analytics';
import { TOKEN_CONFIG } from '@/config/token';
import { ArrowUpRight, Activity, Gauge, ShieldAlert } from 'lucide-react';

interface KPICardsProps {
  kpis: AnalyticsKPIs | undefined;
  trust: AnalyticsTrustMeta | undefined;
  loading: boolean;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function KPICards({ kpis, trust, loading }: KPICardsProps) {
  const t = useTranslations('Analytics');

  const items = [
    { label: t('kpi.totalUsers'), value: kpis?.total_users ?? '—' },
    { label: t('kpi.orgHolders', { symbol: TOKEN_CONFIG.symbol }), value: kpis?.org_holders ?? '—' },
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
    <div className="space-y-4">
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

      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-orange-50/20 to-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">
            {t('trustPanel.title')}
          </p>
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-500">
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            {t('trustPanel.window30d')}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
              {t('trustPanel.proposalThroughput')}
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900" data-testid="analytics-throughput">
              {loading || !trust
                ? '—'
                : `${trust.proposal_throughput_30d.created} / ${trust.proposal_throughput_30d.finalized} / ${trust.proposal_throughput_30d.passed}`}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
              {t('trustPanel.disputeHealth')}
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900" data-testid="analytics-disputes">
              {loading || !trust
                ? '—'
                : `${trust.dispute_aggregate_30d.opened} / ${trust.dispute_aggregate_30d.resolved} / ${trust.dispute_aggregate_30d.unresolved}`}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
              {t('trustPanel.voteParticipation')}
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900" data-testid="analytics-participation">
              {loading || !trust ? '—' : `${trust.vote_participation_30d.participation_rate.toFixed(1)}%`}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-1">
            <Gauge className="h-3.5 w-3.5 text-blue-500" />
            {t('trustPanel.activeMembers', { count: trust?.active_contributor_signals_30d.active_members ?? 0 })}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-1">
            <ArrowUpRight className="h-3.5 w-3.5 text-orange-500" />
            {t('trustPanel.submitters', { count: trust?.active_contributor_signals_30d.task_submitters ?? 0 })}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-1">
            <ShieldAlert className="h-3.5 w-3.5 text-purple-500" />
            {t('trustPanel.commenters', { count: trust?.active_contributor_signals_30d.commenters ?? 0 })}
          </span>
        </div>
      </div>
    </div>
  );
}
