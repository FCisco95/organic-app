'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { Sparkles, Gift, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useUserRewards, useRewardClaims, useDistributions } from '@/features/rewards';
import { RewardsOverview } from '@/components/rewards/rewards-overview';
import { ClaimModal } from '@/components/rewards/claim-modal';
import { ClaimsTable } from '@/components/rewards/claims-table';
import { DistributionsTable } from '@/components/rewards/distributions-table';

const QuestsPage = dynamic(
  () => import('@/components/gamification/quests-page').then((m) => ({ default: m.QuestsPage })),
  { ssr: false }
);

const TABS = ['quests', 'rewards'] as const;
type EarnTab = (typeof TABS)[number];

type RewardsSubTab = 'overview' | 'claims' | 'distributions';

export default function EarnPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const t = useTranslations('Earn');
  const tRewards = useTranslations('Rewards');

  const initialTab = TABS.includes(searchParams.get('tab') as EarnTab)
    ? (searchParams.get('tab') as EarnTab)
    : 'quests';
  const [activeTab, setActiveTab] = useState<EarnTab>(initialTab);
  const [rewardsSubTab, setRewardsSubTab] = useState<RewardsSubTab>('overview');
  const [claimModalOpen, setClaimModalOpen] = useState(false);

  // Rewards data — only fetch when tab is rewards or preload
  const { data: rewards, isLoading: rewardsLoading } = useUserRewards({ enabled: !!user });
  const { data: claimsData } = useRewardClaims({ limit: 10 });
  const { data: distData } = useDistributions({ limit: 10 });

  const canClaim = useMemo(() => {
    if (!rewards) return false;
    return (
      rewards.rewards_enabled &&
      rewards.claimable_points >= rewards.min_threshold &&
      (!rewards.claim_requires_wallet || !!rewards.wallet_address)
    );
  }, [rewards]);

  const handleTabChange = (tab: EarnTab) => {
    setActiveTab(tab);
    // Update URL without full navigation
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url.toString());
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (!user) {
    router.push('/login?returnTo=/earn');
    return null;
  }

  const rewardsTabs: { key: RewardsSubTab; label: string }[] = [
    { key: 'overview', label: tRewards('tabs.overview') },
    { key: 'claims', label: tRewards('sections.myClaimsWithCount', { count: claimsData?.total ?? 0 }) },
    { key: 'distributions', label: tRewards('sections.myDistributionsWithCount', { count: distData?.total ?? 0 }) },
  ];

  return (
    <PageContainer layout="fluid">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 opacity-0 animate-fade-up stagger-1">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-organic-orange/10">
          <Sparkles className="h-5 w-5 text-organic-orange" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {/* Main tab pills */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t(`tab_${tab}`)}
          </button>
        ))}
      </div>

      {/* Quests tab */}
      {activeTab === 'quests' && <QuestsPage />}

      {/* Rewards tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-4" data-testid="earn-rewards-tab">
          {/* Rewards hero */}
          <section className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 text-white opacity-0 animate-fade-up stagger-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center justify-center w-10 h-10 bg-white/10 rounded-xl mb-3">
                  <Gift className="w-5 h-5 text-orange-400" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{tRewards('title')}</h2>
                <p className="mt-2 text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl">{tRewards('subtitle')}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setClaimModalOpen(true)}
                  disabled={!canClaim}
                  className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tRewards('overview.claimButton')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Stat pills */}
            {rewards && (
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-sm">
                  <span className="font-semibold text-white">{rewards.claimable_points.toLocaleString()}</span>
                  <span className="text-gray-400">{tRewards('overview.claimable')}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-sm">
                  <span className="font-semibold text-white">{rewards.pending_claims}</span>
                  <span className="text-gray-400">{tRewards('overview.pending')}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-sm">
                  <span className="font-semibold text-white">{rewards.total_distributed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  <span className="text-gray-400">{tRewards('overview.distributed')}</span>
                </span>
              </div>
            )}
          </section>

          {/* Rewards sub-tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
            {rewardsTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRewardsSubTab(tab.key)}
                className={cn(
                  'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
                  rewardsSubTab === tab.key
                    ? 'bg-organic-orange text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Rewards sub-tab content */}
          {rewardsSubTab === 'overview' && rewards && (
            <RewardsOverview rewards={rewards} onClaim={() => setClaimModalOpen(true)} />
          )}
          {rewardsSubTab === 'claims' && (
            <div className="rounded-xl border border-border bg-card">
              <ClaimsTable claims={claimsData?.claims ?? []} />
            </div>
          )}
          {rewardsSubTab === 'distributions' && (
            <div className="rounded-xl border border-border bg-card">
              <DistributionsTable distributions={distData?.distributions ?? []} />
            </div>
          )}

          {rewards && (
            <ClaimModal rewards={rewards} open={claimModalOpen} onClose={() => setClaimModalOpen(false)} />
          )}

          {/* Loading state */}
          {rewardsLoading && (
            <div className="space-y-6 animate-pulse">
              <div className="h-48 rounded-xl bg-muted" />
              <div className="h-64 rounded-xl bg-muted" />
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
