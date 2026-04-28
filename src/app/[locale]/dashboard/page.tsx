'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import { getBranding } from '@/lib/tenant/branding';
import type { TenantBranding } from '@/lib/tenant/types';
import { useDashboardData } from '@/features/dashboard/hooks';
import { DashboardMasthead } from '@/components/dashboard/dashboard-masthead';
import { SprintHeroSection } from '@/components/dashboard/sprint-hero';
import { DashboardStatStripSection } from '@/components/dashboard/dashboard-stat-strip';
import { MyContributionsCard } from '@/components/dashboard/my-contributions';
import { AnonymousJoinCard } from '@/components/dashboard/anonymous-join-card';
import { ActivityDigestSection } from '@/components/dashboard/activity-digest';
import { DashboardFooter } from '@/components/dashboard/dashboard-footer';

const GovernanceSummaryCard = dynamic(
  () =>
    import('@/components/analytics/governance-summary-card').then(
      (mod) => mod.GovernanceSummaryCard
    ),
  { loading: () => <div className="h-40 animate-pulse rounded-2xl bg-muted/40" /> }
);

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const { user } = useAuth();
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const { data, isLoading } = useDashboardData();

  useEffect(() => {
    getBranding().then(setBranding);
  }, []);

  useEffect(() => {
    if (!branding) return;
    document.title = `${t('pageTitle')} — ${branding.communityName}`;
    return () => {
      document.title = branding.communityName;
    };
  }, [branding, t]);

  const isAuthenticated = !!user;

  if (!branding || isLoading || !data) {
    return (
      <PageContainer layout="fluid">
        <div className="space-y-6">
          <div className="h-20 animate-pulse rounded-2xl bg-muted/40" />
          <div className="h-72 animate-pulse rounded-2xl bg-muted/40" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-muted/40" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer layout="fluid">
      <div className="space-y-6">
        <DashboardMasthead branding={branding} isAuthenticated={isAuthenticated} />

        <SprintHeroSection sprint={data.sprint} />

        <DashboardStatStripSection stats={data.stats} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {isAuthenticated && data.myContributions ? (
              <MyContributionsCard contributions={data.myContributions} />
            ) : (
              <AnonymousJoinCard branding={branding} />
            )}
          </div>
          <div>
            <GovernanceSummaryCard variant="compact" />
          </div>
        </div>

        <ActivityDigestSection entries={data.activityDigest} />

        {/* Testimonials section placeholder — wired in PR 4 */}
        <section
          data-testid="dashboard-testimonials"
          className="rounded-2xl border border-dashed border-border bg-card p-8"
        >
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {t('sections.testimonials')}
          </h2>
        </section>

        <DashboardFooter branding={branding} isAuthenticated={isAuthenticated} />
      </div>
    </PageContainer>
  );
}
