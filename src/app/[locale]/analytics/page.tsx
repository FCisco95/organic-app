'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { useAnalytics } from '@/features/analytics';
import { KPICards } from '@/components/analytics/kpi-cards';
import { Activity, TimerReset } from 'lucide-react';

const ActivityTrendChart = dynamic(
  () => import('@/components/analytics/activity-trend-chart').then((mod) => mod.ActivityTrendChart),
  { loading: () => <div className="h-80 rounded-2xl bg-gray-100 animate-pulse" /> }
);
const MemberGrowthChart = dynamic(
  () => import('@/components/analytics/member-growth-chart').then((mod) => mod.MemberGrowthChart),
  { loading: () => <div className="h-80 rounded-2xl bg-gray-100 animate-pulse" /> }
);
const TaskCompletionChart = dynamic(
  () => import('@/components/analytics/task-completion-chart').then((mod) => mod.TaskCompletionChart),
  { loading: () => <div className="h-80 rounded-2xl bg-gray-100 animate-pulse" /> }
);
const ProposalCategoryChart = dynamic(
  () =>
    import('@/components/analytics/proposal-category-chart').then((mod) => mod.ProposalCategoryChart),
  { loading: () => <div className="h-80 rounded-2xl bg-gray-100 animate-pulse" /> }
);
const VotingParticipationList = dynamic(
  () =>
    import('@/components/analytics/voting-participation-list').then(
      (mod) => mod.VotingParticipationList
    ),
  { loading: () => <div className="h-80 rounded-2xl bg-gray-100 animate-pulse" /> }
);

export default function AnalyticsPage() {
  const t = useTranslations('Analytics');
  const { data, isLoading } = useAnalytics();
  const trust = data?.trust;
  const updatedAtLabel = trust?.updated_at ? new Date(trust.updated_at).toLocaleString() : t('notAvailable');

  return (
    <PageContainer layout="fluid">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('description')}</p>
      </div>

      <div className="space-y-6">
        <section
          className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-sky-50/30 to-orange-50/20 p-5"
          data-testid="analytics-governance-health"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-700">
                {t('governanceHealthTitle')}
              </h2>
              <p className="mt-1 text-sm text-gray-600">{t('governanceHealthDescription')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600"
                data-testid="analytics-trust-updated"
              >
                <TimerReset className="h-3.5 w-3.5 text-gray-500" />
                {t('updatedAt', { date: updatedAtLabel })}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600"
                data-testid="analytics-trust-cadence"
              >
                <Activity className="h-3.5 w-3.5 text-emerald-500" />
                {t('refreshCadence', { seconds: trust?.refresh_interval_seconds ?? 120 })}
              </span>
            </div>
          </div>
        </section>

        {/* KPI Cards */}
        <KPICards kpis={data?.kpis} trust={trust} loading={isLoading} />

        {/* Activity Trends — full width */}
        <ActivityTrendChart data={data?.activity_trends} loading={isLoading} />

        {/* Community section — 2-col grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MemberGrowthChart data={data?.member_growth} loading={isLoading} />
          <TaskCompletionChart data={data?.task_completions} loading={isLoading} />
        </div>

        {/* Governance section — 2-col grid */}
        <div>
          <h2 className="mb-3 text-lg font-semibold tracking-tight text-gray-900">
            {t('sections.governance')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProposalCategoryChart data={data?.proposals_by_category} loading={isLoading} />
            <VotingParticipationList data={data?.voting_participation} loading={isLoading} />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
