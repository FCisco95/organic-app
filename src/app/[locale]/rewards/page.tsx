'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Gift } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import { useUserRewards, useRewardClaims, useDistributions } from '@/features/rewards';
import { RewardsOverview } from '@/components/rewards/rewards-overview';
import { ClaimModal } from '@/components/rewards/claim-modal';
import { ClaimsTable } from '@/components/rewards/claims-table';
import { DistributionsTable } from '@/components/rewards/distributions-table';

type RewardsSection = 'claims' | 'distributions';

export default function RewardsPage() {
  const t = useTranslations('Rewards');
  const { user } = useAuth();
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<RewardsSection>('claims');

  const { data: rewards, isLoading: rewardsLoading } = useUserRewards({ enabled: !!user });
  const { data: claimsData } = useRewardClaims({ limit: 10 });
  const { data: distData } = useDistributions({ limit: 10 });

  const settlementLabel = useMemo(() => {
    if (!rewards?.latest_reward_settlement_status) {
      return t('overview.settlementStatus.unknown');
    }

    return t(`overview.settlementStatus.${rewards.latest_reward_settlement_status}`);
  }, [rewards?.latest_reward_settlement_status, t]);

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

  return (
    <PageContainer width="wide">
      <div className="space-y-6" data-testid="rewards-page">
        <section
          className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 sm:p-6"
          data-testid="rewards-trust-panel"
        >
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-organic-orange/10">
              <Gift className="h-5 w-5 text-organic-orange" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('title')}</h1>
          </div>
          <p className="text-sm text-gray-600">{t('subtitle')}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
              {t('trustPanel.settlementLabel', { value: settlementLabel })}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
              {t('trustPanel.thresholdLabel', { value: rewards.min_threshold.toLocaleString() })}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
              {t('trustPanel.reviewLabel')}
            </span>
          </div>
        </section>

        <RewardsOverview rewards={rewards} onClaim={() => setClaimModalOpen(true)} />

        <section className="space-y-3" data-testid="rewards-history-section">
          <div
            className="flex flex-wrap items-center gap-2"
            data-testid="rewards-section-tabs"
          >
            <button
              onClick={() => setActiveSection('claims')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeSection === 'claims'
                  ? 'bg-organic-orange text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              data-testid="rewards-tab-claims"
            >
              {t('sections.myClaimsWithCount', { count: claimsData?.total ?? 0 })}
            </button>
            <button
              onClick={() => setActiveSection('distributions')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeSection === 'distributions'
                  ? 'bg-organic-orange text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              data-testid="rewards-tab-distributions"
            >
              {t('sections.myDistributionsWithCount', { count: distData?.total ?? 0 })}
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            {activeSection === 'claims' ? (
              <ClaimsTable claims={claimsData?.claims ?? []} />
            ) : (
              <DistributionsTable distributions={distData?.distributions ?? []} />
            )}
          </div>
        </section>

        <ClaimModal
          rewards={rewards}
          open={claimModalOpen}
          onClose={() => setClaimModalOpen(false)}
        />
      </div>
    </PageContainer>
  );
}
