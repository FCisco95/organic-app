'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Gift, ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import { useRewardClaims, useDistributions, useRewardsSummary } from '@/features/rewards';
import type { RewardClaim } from '@/features/rewards';
import { RewardsSummaryCards } from '@/components/rewards/rewards-summary-cards';
import { ClaimsTable } from '@/components/rewards/claims-table';
import { DistributionsTable } from '@/components/rewards/distributions-table';
import { ClaimReviewModal } from '@/components/rewards/claim-review-modal';
import { ClaimPayModal } from '@/components/rewards/claim-pay-modal';
import { ManualDistributionModal } from '@/components/rewards/manual-distribution-modal';

type AdminTab = 'pending' | 'all-claims' | 'distributions' | 'manual';

function claimAgeHours(createdAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)));
}

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

  const riskStats = useMemo(() => {
    const pendingClaimsList = pendingClaims?.claims ?? [];
    const atRisk = pendingClaimsList.filter((claim) => claimAgeHours(claim.created_at) >= 48).length;
    const urgent = pendingClaimsList.filter((claim) => claimAgeHours(claim.created_at) >= 72).length;

    return { atRisk, urgent };
  }, [pendingClaims?.claims]);
  const pendingClaimsList = pendingClaims?.claims ?? [];

  if (!isAdminOrCouncil) {
    return (
      <PageContainer width="narrow">
        <div className="py-16 text-center" data-testid="rewards-admin-access-denied">
          <ShieldAlert className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900">{t('admin.accessDenied')}</h2>
          <p className="text-gray-500">{t('admin.accessDeniedDesc')}</p>
        </div>
      </PageContainer>
    );
  }

  if (summaryLoading) {
    return (
      <PageContainer width="wide">
        <div className="space-y-6 animate-pulse" data-testid="rewards-admin-loading-skeleton">
          <div className="h-8 w-1/4 rounded bg-gray-200" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 rounded-xl bg-gray-200" />
            <div className="h-24 rounded-xl bg-gray-200" />
            <div className="h-24 rounded-xl bg-gray-200" />
          </div>
          <div className="h-64 rounded-xl bg-gray-200" />
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
      <div className="space-y-6" data-testid="admin-rewards-page">
        <section
          className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 sm:p-6"
          data-testid="rewards-admin-command-deck"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-organic-orange/10">
                <Gift className="h-5 w-5 text-organic-orange" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('admin.title')}</h1>
                <p className="text-sm text-gray-600">{t('admin.subtitle')}</p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => setManualOpen(true)}
                className="rounded-lg bg-organic-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-organic-orange/90"
                data-testid="rewards-admin-manual-action"
              >
                {t('admin.manualDistribute')}
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3" data-testid="rewards-admin-pending-triage">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('admin.pendingClaims')}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{pendingClaims?.total ?? 0}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3" data-testid="rewards-admin-risk-marker">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-800">{t('admin.atRiskClaims')}</p>
              <p className="mt-1 text-xl font-bold text-amber-900">{riskStats.atRisk}</p>
              <p className="text-xs text-amber-800">{t('admin.urgentClaims', { count: riskStats.urgent })}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('admin.approvedClaims')}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{summary?.approved_claims_count ?? 0}</p>
            </div>
          </div>
        </section>

        {summary && <RewardsSummaryCards summary={summary} />}

        <section className="grid gap-3 lg:grid-cols-2">
          <div
            className="rounded-xl border border-amber-200 bg-amber-50 p-4"
            data-testid="rewards-admin-payout-guardrails"
          >
            <h2 className="text-sm font-semibold text-amber-900">{t('admin.payoutGuardrailsTitle')}</h2>
            <p className="mt-1 text-xs text-amber-800">{t('admin.payoutGuardrailsBody')}</p>
          </div>
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"
            data-testid="rewards-admin-distribution-integrity"
          >
            <h2 className="text-sm font-semibold text-emerald-900">{t('admin.distributionIntegrityTitle')}</h2>
            <p className="mt-1 text-xs text-emerald-800">{t('admin.distributionIntegrityBody')}</p>
          </div>
        </section>

        <div className="space-y-3">
          <div className="flex gap-1.5 overflow-x-auto" data-testid="rewards-admin-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-organic-orange text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                data-testid={`rewards-admin-tab-${tab.key}`}
              >
                {tab.label}
                {tab.key === 'pending' && pendingClaims?.total ? ` (${pendingClaims.total})` : ''}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            {activeTab === 'pending' && (
              <ClaimsTable
                claims={pendingClaimsList}
                showUser
                showRiskSignals
                onReview={isAdmin ? (claim) => setReviewClaim(claim) : undefined}
              />
            )}
            {activeTab === 'all-claims' && (
              <ClaimsTable
                claims={allClaims?.claims ?? []}
                showUser
                showRiskSignals
                onReview={isAdmin ? (claim) => setReviewClaim(claim) : undefined}
                onPay={isAdmin ? (claim) => setPayClaim(claim) : undefined}
              />
            )}
            {activeTab === 'distributions' && (
              <DistributionsTable distributions={distData?.distributions ?? []} showUser />
            )}
            {activeTab === 'manual' && (
              <div className="p-8 text-center" data-testid="rewards-admin-manual-tab">
                <Gift className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">{t('admin.manualTitle')}</h3>
                <p className="mb-4 text-gray-500">{t('admin.manualDescription')}</p>
                {isAdmin && (
                  <button
                    onClick={() => setManualOpen(true)}
                    className="rounded-lg bg-organic-orange px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-organic-orange/90"
                  >
                    {t('admin.manualDistribute')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <ClaimReviewModal
          claim={reviewClaim}
          open={!!reviewClaim}
          onClose={() => setReviewClaim(null)}
        />
        <ClaimPayModal claim={payClaim} open={!!payClaim} onClose={() => setPayClaim(null)} />
        <ManualDistributionModal open={manualOpen} onClose={() => setManualOpen(false)} />
      </div>
    </PageContainer>
  );
}
