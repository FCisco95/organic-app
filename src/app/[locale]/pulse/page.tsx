'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { useAnalytics } from '@/features/analytics';
import type { AnalyticsPreset } from '@/features/analytics/types';
import { useAuth } from '@/features/auth/context';
import { DateRangeSelector } from '@/components/analytics/date-range-selector';
import { KPICards } from '@/components/analytics/kpi-cards';
import { TokenChart } from '@/components/analytics/token-chart';
import { TokenAnalytics } from '@/components/analytics/token-analytics';
import { Activity, BarChart3, CheckCircle2, Landmark, User, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonalAnalytics } from '@/features/analytics/personal-hooks';

const GovernanceSummaryCard = dynamic(
  () => import('@/components/analytics/governance-summary-card').then((mod) => mod.GovernanceSummaryCard),
  { loading: () => <div className="h-40 rounded-2xl bg-muted animate-pulse" /> }
);
const PersonalStatsCards = dynamic(
  () => import('@/components/analytics/personal-stats-cards').then((mod) => mod.PersonalStatsCards),
  { loading: () => <div className="h-24 rounded-2xl bg-muted animate-pulse" /> }
);
const XpTrendChart = dynamic(
  () => import('@/components/analytics/xp-trend-chart').then((mod) => mod.XpTrendChart),
  { loading: () => <div className="h-80 rounded-2xl bg-muted animate-pulse" /> }
);
const ActivityHeatmap = dynamic(
  () => import('@/components/analytics/activity-heatmap').then((mod) => mod.ActivityHeatmap),
  { loading: () => <div className="h-48 rounded-2xl bg-muted animate-pulse" /> }
);
const EngagementBreakdown = dynamic(
  () => import('@/components/analytics/engagement-breakdown').then((mod) => mod.EngagementBreakdown),
  { loading: () => <div className="h-80 rounded-2xl bg-muted animate-pulse" /> }
);

const ActivityTrendChart = dynamic(
  () => import('@/components/analytics/activity-trend-chart').then((mod) => mod.ActivityTrendChart),
  { loading: () => <div className="h-80 rounded-2xl bg-muted animate-pulse" /> }
);
const MemberGrowthChart = dynamic(
  () => import('@/components/analytics/member-growth-chart').then((mod) => mod.MemberGrowthChart),
  { loading: () => <div className="h-80 rounded-2xl bg-muted animate-pulse" /> }
);
const TaskCompletionChart = dynamic(
  () => import('@/components/analytics/task-completion-chart').then((mod) => mod.TaskCompletionChart),
  { loading: () => <div className="h-80 rounded-2xl bg-muted animate-pulse" /> }
);
const ProposalCategoryChart = dynamic(
  () =>
    import('@/components/analytics/proposal-category-chart').then((mod) => mod.ProposalCategoryChart),
  { loading: () => <div className="h-80 rounded-2xl bg-muted animate-pulse" /> }
);
const VotingParticipationList = dynamic(
  () =>
    import('@/components/analytics/voting-participation-list').then(
      (mod) => mod.VotingParticipationList
    ),
  { loading: () => <div className="h-80 rounded-2xl bg-muted animate-pulse" /> }
);

type AnalyticsTab = 'overview' | 'personal' | 'governance';

export default function AnalyticsPage() {
  const t = useTranslations('Analytics');
  const { user } = useAuth();
  const [preset, setPreset] = useState<AnalyticsPreset>('30d');
  const { data, isLoading } = useAnalytics(preset);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');

  const isAuthenticated = !!user;
  const { data: personalData, isLoading: personalLoading } = usePersonalAnalytics({
    enabled: isAuthenticated && activeTab === 'personal',
  });

  const tabs: { key: AnalyticsTab; label: string; icon: typeof BarChart3; requiresAuth?: boolean }[] = [
    { key: 'overview', label: t('tabOverview'), icon: BarChart3 },
    { key: 'personal', label: t('tabPersonal'), icon: User, requiresAuth: true },
    { key: 'governance', label: t('tabGovernance'), icon: Landmark },
  ];

  return (
    <PageContainer layout="fluid">
      <div className="space-y-6">
        {/* Dark Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 text-white opacity-0 animate-fade-up stagger-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl">
            {t('description')}
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white/10 p-2">
                <BarChart3 className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('heroMetricsTitle')}</p>
                <p className="text-xs text-gray-400">{t('heroMetricsDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white/10 p-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('heroTasksTitle')}</p>
                <p className="text-xs text-gray-400">{t('heroTasksDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white/10 p-2">
                <Landmark className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('heroGovernanceTitle')}</p>
                <p className="text-xs text-gray-400">{t('heroGovernanceDesc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Token Market Analytics (price, volume, holder distribution) */}
        <div className="opacity-0 animate-fade-up stagger-2">
          <TokenAnalytics />
        </div>

        {/* Token Price Chart */}
        <div className="opacity-0 animate-fade-up stagger-3">
          <TokenChart />
        </div>

        {/* Governance KPIs + Trust Panel */}
        <div className="opacity-0 animate-fade-up stagger-4">
          <KPICards kpis={data?.kpis} trust={data?.trust} loading={isLoading} />
        </div>

        {/* Tabs with date selector inline */}
        <div className="flex items-center justify-between border-b border-border opacity-0 animate-fade-up stagger-5">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                    isActive
                      ? 'border-orange-500 text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-500/5 rounded-t-lg'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive && 'text-orange-500')} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <DateRangeSelector value={preset} onChange={setPreset} />
        </div>

        {/* Tab content */}
        <div className="min-h-0 overflow-y-auto">
          <div className={cn(activeTab === 'overview' ? 'block' : 'hidden')}>
            <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: '320ms' }}>
              <ActivityTrendChart data={data?.activity_trends} loading={isLoading} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MemberGrowthChart data={data?.member_growth} loading={isLoading} />
                <TaskCompletionChart data={data?.task_completions} loading={isLoading} />
              </div>
            </div>
          </div>

          <div className={cn(activeTab === 'personal' ? 'block' : 'hidden')}>
            <div className="opacity-0 animate-fade-up" style={{ animationDelay: '320ms' }}>
              {isAuthenticated ? (
                <div className="space-y-6">
                  <PersonalStatsCards stats={personalData?.stats} loading={personalLoading} />
                  <XpTrendChart data={personalData?.xp_trend} loading={personalLoading} />
                  <ActivityHeatmap data={personalData?.activity_heatmap} loading={personalLoading} />
                  <EngagementBreakdown data={personalData?.engagement} loading={personalLoading} />
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-8 text-center">
                  <Lock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('personalLockedTitle')}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {t('personalLockedDesc')}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className={cn(activeTab === 'governance' ? 'block' : 'hidden')}>
            <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: '320ms' }}>
              <GovernanceSummaryCard variant="full" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProposalCategoryChart data={data?.proposals_by_category} loading={isLoading} />
                <VotingParticipationList data={data?.voting_participation} loading={isLoading} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
