'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Gift } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import { useUserRewards, useRewardClaims, useDistributions } from '@/features/rewards';
import { RewardsOverview } from '@/components/rewards/rewards-overview';
import { ClaimModal } from '@/components/rewards/claim-modal';
import { ClaimsTable } from '@/components/rewards/claims-table';
import { DistributionsTable } from '@/components/rewards/distributions-table';

export default function RewardsPage() {
  const t = useTranslations('Rewards');
  const { user } = useAuth();
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'claims' | 'distributions'>('claims');

  const { data: rewards, isLoading: rewardsLoading } = useUserRewards({ enabled: !!user });
  const { data: claimsData } = useRewardClaims({ limit: 10 });
  const { data: distData } = useDistributions({ limit: 10 });

  if (!user) {
    return (
      <PageContainer width="narrow">
        <div className="text-center py-16">
          <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('signInRequired')}</h2>
          <p className="text-gray-500">{t('signInDescription')}</p>
        </div>
      </PageContainer>
    );
  }

  if (rewardsLoading) {
    return (
      <PageContainer width="narrow">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-48 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (!rewards) {
    return (
      <PageContainer width="narrow">
        <div className="text-center py-16">
          <p className="text-gray-500">{t('loadError')}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="narrow">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Gift className="w-6 h-6 text-organic-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('title')}</h1>
        </div>
        <p className="text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      {/* Overview Card */}
      <div className="mb-6">
        <RewardsOverview rewards={rewards} onClaim={() => setClaimModalOpen(true)} />
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1.5 mb-4">
        <button
          onClick={() => setActiveSection('claims')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeSection === 'claims'
              ? 'bg-organic-orange text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t('sections.myClaims')}
        </button>
        <button
          onClick={() => setActiveSection('distributions')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeSection === 'distributions'
              ? 'bg-organic-orange text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t('sections.myDistributions')}
        </button>
      </div>

      {/* Section Content */}
      <div className="bg-white rounded-xl border border-gray-200">
        {activeSection === 'claims' ? (
          <ClaimsTable claims={claimsData?.claims ?? []} />
        ) : (
          <DistributionsTable distributions={distData?.distributions ?? []} />
        )}
      </div>

      {/* Claim Modal */}
      <ClaimModal
        rewards={rewards}
        open={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
      />
    </PageContainer>
  );
}
