'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import { TOKEN_CONFIG } from '@/config/token';
import { useDashboardData } from '@/features/dashboard/hooks';
import { IdentityTile } from '@/components/dashboard/identity-tile';
import { TokenTile } from '@/components/dashboard/token-tile';
import { JupiterSwapEmbed } from '@/components/dashboard/jupiter-swap-embed';
import { SprintHeroSection } from '@/components/dashboard/sprint-hero';
import { DashboardStatStripSection } from '@/components/dashboard/dashboard-stat-strip';
import { MyContributionsCard } from '@/components/dashboard/my-contributions';
import { AnonymousJoinCard } from '@/components/dashboard/anonymous-join-card';
import { ActivityDigestSection } from '@/components/dashboard/activity-digest';
import { TestimonialsRail } from '@/components/dashboard/testimonials-rail';
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
  const { data, isLoading } = useDashboardData();
  const branding = data?.branding ?? null;

  useEffect(() => {
    if (!branding) return;
    document.title = `${t('pageTitle')} — ${branding.communityName}`;
    return () => {
      document.title = branding.communityName;
    };
  }, [branding, t]);

  const isAuthenticated = !!user;

  if (!data || !branding || isLoading) {
    return (
      <PageContainer layout="fluid">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 h-48 animate-pulse rounded-2xl bg-muted/40" />
            <div className="lg:col-span-5 h-48 animate-pulse rounded-2xl bg-muted/40" />
          </div>
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
        {/* Bento hero — Identity (left, 7 cols) + Token (right, 5 cols) */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <IdentityTile
              branding={branding}
              isAuthenticated={isAuthenticated}
              activeMembers24h={data.stats.activeMembers24h}
            />
          </div>
          <div className="lg:col-span-5">
            <TokenTile branding={branding} mint={TOKEN_CONFIG.mint} symbol={TOKEN_CONFIG.symbol} />
          </div>
        </div>

        {TOKEN_CONFIG.mint && (
          <JupiterSwapEmbed
            branding={branding}
            mint={TOKEN_CONFIG.mint}
            symbol={TOKEN_CONFIG.symbol}
          />
        )}

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

        <TestimonialsRail branding={branding} isAuthenticated={isAuthenticated} />

        <DashboardFooter branding={branding} isAuthenticated={isAuthenticated} />
      </div>
    </PageContainer>
  );
}
