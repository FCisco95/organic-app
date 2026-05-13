'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { AnalyticsKPIs, AnalyticsTrustMeta } from '@/features/analytics';
import {
  ArrowUpRight,
  Activity,
  Gauge,
  ShieldAlert,
  Users,
  CheckCircle2,
  Vote,
} from 'lucide-react';

interface KPICardsProps {
  kpis: AnalyticsKPIs | undefined;
  trust: AnalyticsTrustMeta | undefined;
  loading: boolean;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('rounded-md bg-muted animate-pulse', className)} />;
}

/* ─── Governance KPI Cards ────────────────────────────────────────── */

function GovernanceKPIs({
  kpis,
  trust,
  loading,
  t,
}: {
  kpis: AnalyticsKPIs | undefined;
  trust: AnalyticsTrustMeta | undefined;
  loading: boolean;
  t: ReturnType<typeof useTranslations<'Analytics'>>;
}) {
  const items = [
    {
      label: t('kpi.totalUsers'),
      value: kpis?.total_users?.toLocaleString() ?? '\u2014',
      icon: Users,
      iconColor: 'text-blue-500',
    },
    {
      label: t('kpi.tasksCompleted'),
      value: kpis?.tasks_completed?.toLocaleString() ?? '\u2014',
      icon: CheckCircle2,
      iconColor: 'text-green-500',
    },
    {
      label: t('kpi.activeProposals'),
      value: kpis?.active_proposals?.toLocaleString() ?? '\u2014',
      icon: Vote,
      iconColor: 'text-indigo-500',
    },
    {
      label: t('trustPanel.voteParticipation'),
      value: trust ? `${trust.vote_participation_30d.participation_rate.toFixed(1)}%` : '\u2014',
      icon: Gauge,
      iconColor: 'text-organic-terracotta',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3"
          >
            <div className="rounded-lg bg-muted/50 p-2">
              <Icon className={cn('h-4 w-4', item.iconColor)} />
            </div>
            <div className="min-w-0">
              {loading ? (
                <>
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="mt-1 h-3 w-16" />
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-foreground leading-none font-mono tabular-nums">
                    {item.value}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-tight">
                    {item.label}
                  </p>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Trust Panel (compact) ───────────────────────────────────────── */

function TrustPanel({
  trust,
  loading,
  t,
}: {
  trust: AnalyticsTrustMeta | undefined;
  loading: boolean;
  t: ReturnType<typeof useTranslations<'Analytics'>>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
          {t('trustPanel.title')}
        </p>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
          <Activity className="h-3 w-3 text-emerald-500" />
          {t('trustPanel.window30d')}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {t('trustPanel.proposalThroughput')}
          </p>
          <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-foreground">
            {loading || !trust
              ? '\u2014'
              : `${trust.proposal_throughput_30d.created} / ${trust.proposal_throughput_30d.finalized} / ${trust.proposal_throughput_30d.passed}`}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {t('trustPanel.disputeHealth')}
          </p>
          <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-foreground">
            {loading || !trust
              ? '\u2014'
              : `${trust.dispute_aggregate_30d.opened} / ${trust.dispute_aggregate_30d.resolved} / ${trust.dispute_aggregate_30d.unresolved}`}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {t('trustPanel.activeContributors')}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 text-organic-terracotta" />
              {trust?.active_contributor_signals_30d.active_members ?? 0}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {trust?.active_contributor_signals_30d.task_submitters ?? 0}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <ShieldAlert className="h-3 w-3 text-purple-500" />
              {trust?.active_contributor_signals_30d.commenters ?? 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Export ──────────────────────────────────────────────────── */

export function KPICards({ kpis, trust, loading }: KPICardsProps) {
  const t = useTranslations('Analytics');

  return (
    <div className="space-y-4">
      <GovernanceKPIs kpis={kpis} trust={trust} loading={loading} t={t} />
      <TrustPanel trust={trust} loading={loading} t={t} />
    </div>
  );
}
