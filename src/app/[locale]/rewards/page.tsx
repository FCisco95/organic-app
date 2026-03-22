'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Gift, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import { useUserRewards, useRewardClaims, useDistributions } from '@/features/rewards';
import { RewardsOverview } from '@/components/rewards/rewards-overview';
import { ClaimModal } from '@/components/rewards/claim-modal';
import { ClaimsTable } from '@/components/rewards/claims-table';
import { DistributionsTable } from '@/components/rewards/distributions-table';

type RewardsTab = 'overview' | 'claims' | 'distributions';

export default function RewardsPage() {
  const t = useTranslations('Rewards');
  const { user } = useAuth();
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<RewardsTab>('overview');

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

  if (!user) {
    return (
      <PageContainer width="narrow">
        <div className="py-16 text-center" data-testid="rewards-signin-required">
          <Gift className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900">{t('signInRequired')}</h2>
          <p className="text-gray-500">{t('signInDescription')}</p>
        </div>
      </PageContainer>
    );
  }

  if (rewardsLoading) {
    return (
      <PageContainer width="wide">
        <div className="space-y-6 animate-pulse" data-testid="rewards-loading-skeleton">
          <div className="h-8 w-1/4 rounded bg-gray-200" />
          <div className="h-48 rounded-xl bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-200" />
        </div>
      </PageContainer>
    );
  }

  if (!rewards) {
    return (
      <PageContainer width="narrow">
        <div className="py-16 text-center" data-testid="rewards-load-error">
          <p className="text-gray-500">{t('loadError')}</p>
        </div>
      </PageContainer>
    );
  }

  const tabs: { key: RewardsTab; label: string }[] = [
    { key: 'overview', label: t('tabs.overview') },
    { key: 'claims', label: t('sections.myClaimsWithCount', { count: claimsData?.total ?? 0 }) },
    {
      key: 'distributions',
      label: t('sections.myDistributionsWithCount', { count: distData?.total ?? 0 }),
    },
  ];

  return (
    <PageContainer width="wide">
      <div className="space-y-4" data-testid="rewards-page">
        {/* Compact header with pinned CTA */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-organic-orange/10">
              <Gift className="h-4.5 w-4.5 text-organic-orange" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">{t('title')}</h1>
          </div>
          <button
            onClick={() => setClaimModalOpen(true)}
            disabled={!canClaim}
            className="flex items-center gap-2 rounded-lg bg-organic-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-organic-orange/90 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="rewards-claim-cta"
          >
            {t('overview.claimButton')}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 3 stat chips — inline horizontal pills */}
        <div className="flex flex-wrap gap-2" data-testid="rewards-stat-chips">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-organic-orange/20 bg-organic-orange/5 px-3 py-1.5 text-sm">
            <span className="font-semibold text-gray-900">
              {rewards.claimable_points.toLocaleString()}
            </span>
            <span className="text-gray-500">{t('overview.claimable')}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm">
            <span className="font-semibold text-gray-900">{rewards.pending_claims}</span>
            <span className="text-gray-500">{t('overview.pending')}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm">
            <span className="font-semibold text-gray-900">
              {rewards.total_distributed.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className="text-gray-500">{t('overview.distributed')}</span>
          </span>
        </div>

        {/* Pill tabs */}
        <div
          className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 pb-3"
          data-testid="rewards-section-tabs"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-organic-orange text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              data-testid={`rewards-tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <RewardsOverview rewards={rewards} onClaim={() => setClaimModalOpen(true)} />
        )}

        {activeTab === 'claims' && (
          <div className="rounded-xl border border-gray-200 bg-white">
            <ClaimsTable claims={claimsData?.claims ?? []} />
          </div>
        )}

        {activeTab === 'distributions' && (
          <div className="rounded-xl border border-gray-200 bg-white">
            <DistributionsTable distributions={distData?.distributions ?? []} />
          </div>
        )}

        <ClaimModal
          rewards={rewards}
          open={claimModalOpen}
          onClose={() => setClaimModalOpen(false)}
        />
      </div>
    </PageContainer>
  );
}
