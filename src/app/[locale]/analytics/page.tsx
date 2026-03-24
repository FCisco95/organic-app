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
import { InfoButton } from '@/components/ui/info-button';
import { Activity, TimerReset, BarChart3, CheckCircle2, Landmark, User, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const trust = data?.trust;
  const updatedAtLabel = trust?.updated_at
    ? new Date(trust.updated_at).toLocaleString()
    : t('notAvailable');
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');

  const isAuthenticated = !!user;

  const tabs: { key: AnalyticsTab; label: string; icon: typeof BarChart3; requiresAuth?: boolean }[] = [
    { key: 'overview', label: t('tabOverview'), icon: BarChart3 },
    { key: 'personal', label: t('tabPersonal'), icon: User, requiresAuth: true },
    { key: 'governance', label: t('tabGovernance'), icon: Landmark },
  ];

  const infoSections = [
    {
      title: t('infoSection1Title'),
      points: [
        t('infoSection1Point1'),
        t('infoSection1Point2'),
        t('infoSection1Point3'),
      ],
    },
    {
      title: t('infoSection2Title'),
      points: [
        t('infoSection2Point1'),
        t('infoSection2Point2'),
        t('infoSection2Point3'),
      ],
    },
    {
      title: t('infoSection3Title'),
      points: [
        t('infoSection3Point1'),
        t('infoSection3Point2'),
        t('infoSection3Point3'),
      ],
    },
  ];

  return (
    <PageContainer layout="fluid">
      <div className="space-y-6">
        {/* Dark Hero with B's 3 principle cards */}
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

        {/* Date range selector */}
        <div className="flex items-center justify-between opacity-0 animate-fade-up stagger-2">
          <DateRangeSelector value={preset} onChange={setPreset} />
        </div>

        {/* Governance health strip */}
        <section
          className="rounded-2xl border border-border bg-card p-5 opacity-0 animate-fade-up stagger-3"
          data-testid="analytics-governance-health"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
                {t('governanceHealthTitle')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('governanceHealthDescription')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground"
                data-testid="analytics-trust-updated"
              >
                <TimerReset className="h-3.5 w-3.5 text-muted-foreground" />
                {t('updatedAt', { date: updatedAtLabel })}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground"
                data-testid="analytics-trust-cadence"
              >
                <Activity className="h-3.5 w-3.5 text-emerald-500" />
                {t('refreshCadence', { seconds: trust?.refresh_interval_seconds ?? 120 })}
              </span>
            </div>
          </div>
        </section>

        {/* KPI Cards with sparklines */}
        <div className="opacity-0 animate-fade-up stagger-4">
          <KPICards kpis={data?.kpis} trust={trust} loading={isLoading} />
        </div>

        {/* Tabs with icons + orange underline */}
        <div className="flex items-center gap-1 border-b border-border opacity-0 animate-fade-up stagger-5">
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

        {/* Tab content — all panels exist in DOM for proper scroll calculation */}
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
                <div className="rounded-2xl border border-border bg-card p-8 text-center">
                  <User className="h-12 w-12 text-orange-500/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('personalTitle')}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    {t('personalPlaceholder')}
                  </p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProposalCategoryChart data={data?.proposals_by_category} loading={isLoading} />
                <VotingParticipationList data={data?.voting_participation} loading={isLoading} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <InfoButton sections={infoSections} />
    </PageContainer>
  );
}
