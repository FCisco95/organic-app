'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Gift, ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import {
  useRewardClaims,
  useDistributions,
  useRewardsSummary,
} from '@/features/rewards';
import type { RewardClaim } from '@/features/rewards';
import { RewardsSummaryCards } from '@/components/rewards/rewards-summary-cards';
import { ClaimsTable } from '@/components/rewards/claims-table';
import { DistributionsTable } from '@/components/rewards/distributions-table';
import { ClaimReviewModal } from '@/components/rewards/claim-review-modal';
import { ClaimPayModal } from '@/components/rewards/claim-pay-modal';
import { ManualDistributionModal } from '@/components/rewards/manual-distribution-modal';

type AdminTab = 'pending' | 'all-claims' | 'distributions' | 'manual';

export default function AdminRewardsPage() {
  const t = useTranslations('Rewards');
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('pending');
  const [reviewClaim, setReviewClaim] = useState<RewardClaim | null>(null);
  const [payClaim, setPayClaim] = useState<RewardClaim | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const isAdminOrCouncil = profile?.role === 'admin' || profile?.role === 'council';
  const isAdmin = profile?.role === 'admin';

  const { data: summary, isLoading: summaryLoading } = useRewardsSummary({
    enabled: !!isAdminOrCouncil,
  });
  const { data: pendingClaims } = useRewardClaims({ status: 'pending', limit: 50 });
  const { data: allClaims } = useRewardClaims({ limit: 50 });
  const { data: distData } = useDistributions({ limit: 50 });

  if (!isAdminOrCouncil) {
    return (
      <PageContainer width="narrow">
        <div className="text-center py-16">
          <ShieldAlert className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('admin.accessDenied')}</h2>
          <p className="text-gray-500">{t('admin.accessDeniedDesc')}</p>
        </div>
      </PageContainer>
    );
  }

  if (summaryLoading) {
    return (
      <PageContainer width="wide">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
          </div>
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'pending', label: t('admin.tabs.pending') },
    { key: 'all-claims', label: t('admin.tabs.allClaims') },
    { key: 'distributions', label: t('admin.tabs.distributions') },
    { key: 'manual', label: t('admin.tabs.manual') },
  ];

  return (
    <PageContainer width="wide">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Gift className="w-6 h-6 text-organic-orange" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {t('admin.title')}
            </h1>
          </div>
          <p className="text-sm text-gray-500">{t('admin.subtitle')}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setManualOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-organic-orange hover:bg-organic-orange/90 rounded-lg transition-colors"
          >
            {t('admin.manualDistribute')}
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="mb-6">
          <RewardsSummaryCards summary={summary} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-organic-orange text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.key === 'pending' && pendingClaims?.total
              ? ` (${pendingClaims.total})`
              : ''}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200">
        {activeTab === 'pending' && (
          <ClaimsTable
            claims={pendingClaims?.claims ?? []}
            showUser
            onReview={isAdmin ? (claim) => setReviewClaim(claim) : undefined}
          />
        )}
        {activeTab === 'all-claims' && (
          <ClaimsTable
            claims={allClaims?.claims ?? []}
            showUser
            onReview={isAdmin ? (claim) => setReviewClaim(claim) : undefined}
            onPay={isAdmin ? (claim) => setPayClaim(claim) : undefined}
          />
        )}
        {activeTab === 'distributions' && (
          <DistributionsTable distributions={distData?.distributions ?? []} showUser />
        )}
        {activeTab === 'manual' && (
          <div className="p-8 text-center">
            <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('admin.manualTitle')}
            </h3>
            <p className="text-gray-500 mb-4">{t('admin.manualDescription')}</p>
            {isAdmin && (
              <button
                onClick={() => setManualOpen(true)}
                className="px-6 py-2.5 text-sm font-medium text-white bg-organic-orange hover:bg-organic-orange/90 rounded-lg transition-colors"
              >
                {t('admin.manualDistribute')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ClaimReviewModal
        claim={reviewClaim}
        open={!!reviewClaim}
        onClose={() => setReviewClaim(null)}
      />
      <ClaimPayModal
        claim={payClaim}
        open={!!payClaim}
        onClose={() => setPayClaim(null)}
      />
      <ManualDistributionModal open={manualOpen} onClose={() => setManualOpen(false)} />
    </PageContainer>
  );
}
