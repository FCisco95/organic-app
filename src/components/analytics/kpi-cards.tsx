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

function MiniSparkline() {
  return (
    <div className="flex items-end gap-px h-5 mt-1">
      {[3, 5, 4, 7, 6, 8, 5, 9, 7, 10, 8, 6].map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-sm bg-muted-foreground/15"
          style={{ height: `${h * 10}%` }}
        />
      ))}
    </div>
  );
}

export function KPICards({ kpis, trust, loading }: KPICardsProps) {
  const t = useTranslations('Analytics');

  const priceHasData = kpis?.org_price != null;
  const marketCapHasData = kpis?.market_cap != null;

  const items = [
    { label: t('kpi.totalUsers'), value: kpis?.total_users ?? '\u2014', hasTrend: true },
    { label: t('kpi.orgHolders', { symbol: TOKEN_CONFIG.symbol }), value: kpis?.org_holders ?? '\u2014', hasTrend: true },
    {
      label: t('kpi.orgPrice', { symbol: TOKEN_CONFIG.symbol }),
      value: priceHasData ? `$${kpis!.org_price!.toFixed(6)}` : '\u2014',
      mono: true,
      helper: !priceHasData ? t('kpiPriceHelper') : undefined,
      hasTrend: priceHasData,
    },
    {
      label: t('kpi.marketCap'),
      value: marketCapHasData ? `$${formatCompact(kpis!.market_cap!)}` : '\u2014',
      mono: true,
      helper: !marketCapHasData ? t('kpiMarketCapHelper') : undefined,
      hasTrend: marketCapHasData,
    },
    { label: t('kpi.tasksCompleted'), value: kpis?.tasks_completed ?? '\u2014', hasTrend: true },
    { label: t('kpi.activeProposals'), value: kpis?.active_proposals ?? '\u2014', hasTrend: true },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border divide-x divide-border grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col justify-center px-5 py-5">
            {loading ? (
              <>
                <div className="h-7 w-14 rounded-md bg-muted animate-pulse" />
                <div className="mt-2 h-3 w-20 rounded bg-muted/60 animate-pulse" />
              </>
            ) : (
              <>
                <p
                  className={cn(
                    'text-2xl font-bold text-foreground leading-none',
                    item.mono && 'font-mono tabular-nums text-xl'
                  )}
                >
                  {item.value}
                </p>
                {item.hasTrend && item.value !== '\u2014' ? (
                  <MiniSparkline />
                ) : item.helper ? (
                  <p className="mt-1.5 text-[10px] text-muted-foreground/70 leading-tight">{item.helper}</p>
                ) : (
                  <p className="mt-1.5 text-[10px] text-muted-foreground/60 leading-tight">{t('kpiNoTrend')}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground leading-tight">{item.label}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {t('trustPanel.title')}
          </p>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            {t('trustPanel.window30d')}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {t('trustPanel.proposalThroughput')}
            </p>
            <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-foreground" data-testid="analytics-throughput">
              {loading || !trust
                ? '\u2014'
                : `${trust.proposal_throughput_30d.created} / ${trust.proposal_throughput_30d.finalized} / ${trust.proposal_throughput_30d.passed}`}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {t('trustPanel.disputeHealth')}
            </p>
            <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-foreground" data-testid="analytics-disputes">
              {loading || !trust
                ? '\u2014'
                : `${trust.dispute_aggregate_30d.opened} / ${trust.dispute_aggregate_30d.resolved} / ${trust.dispute_aggregate_30d.unresolved}`}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {t('trustPanel.voteParticipation')}
            </p>
            <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-foreground" data-testid="analytics-participation">
              {loading || !trust ? '\u2014' : `${trust.vote_participation_30d.participation_rate.toFixed(1)}%`}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2.5 py-1">
            <Gauge className="h-3.5 w-3.5 text-blue-500" />
            {t('trustPanel.activeMembers', { count: trust?.active_contributor_signals_30d.active_members ?? 0 })}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2.5 py-1">
            <ArrowUpRight className="h-3.5 w-3.5 text-orange-500" />
            {t('trustPanel.submitters', { count: trust?.active_contributor_signals_30d.task_submitters ?? 0 })}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2.5 py-1">
            <ShieldAlert className="h-3.5 w-3.5 text-purple-500" />
            {t('trustPanel.commenters', { count: trust?.active_contributor_signals_30d.commenters ?? 0 })}
          </span>
        </div>
      </div>
    </div>
  );
}
