'use client';

import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { useAnalytics } from '@/features/analytics';
import { KPICards } from '@/components/analytics/kpi-cards';
import { ActivityTrendChart } from '@/components/analytics/activity-trend-chart';
import { MemberGrowthChart } from '@/components/analytics/member-growth-chart';
import { TaskCompletionChart } from '@/components/analytics/task-completion-chart';
import { ProposalCategoryChart } from '@/components/analytics/proposal-category-chart';
import { VotingParticipationList } from '@/components/analytics/voting-participation-list';

export default function AnalyticsPage() {
  const t = useTranslations('Analytics');
  const { data, isLoading } = useAnalytics();

  return (
    <PageContainer width="wide">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('description')}</p>
      </div>

      <div className="space-y-6">
        {/* KPI Cards */}
        <KPICards kpis={data?.kpis} loading={isLoading} />

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
