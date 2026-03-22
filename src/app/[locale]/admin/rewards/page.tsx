'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Gift, ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import { useRewardClaims, useDistributions, useRewardsSummary } from '@/features/rewards';
import type { RewardClaim, RewardClaimStatus } from '@/features/rewards';
import { ClaimsTable } from '@/components/rewards/claims-table';
import { DistributionsTable } from '@/components/rewards/distributions-table';
import { ClaimReviewModal } from '@/components/rewards/claim-review-modal';
import { ClaimPayModal } from '@/components/rewards/claim-pay-modal';
import { ManualDistributionModal } from '@/components/rewards/manual-distribution-modal';

type AdminView = 'claims' | 'distributions' | 'manual';
type ClaimFilter = 'all' | RewardClaimStatus;

export default function AdminRewardsPage() {
  const t = useTranslations('Rewards');
  const { profile } = useAuth();
  const [activeView, setActiveView] = useState<AdminView>('claims');
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>('all');
  const [reviewClaim, setReviewClaim] = useState<RewardClaim | null>(null);
  const [payClaim, setPayClaim] = useState<RewardClaim | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [guardrailsOpen, setGuardrailsOpen] = useState(false);

  const isAdminOrCouncil = profile?.role === 'admin' || profile?.role === 'council';
  const isAdmin = profile?.role === 'admin';

  const { data: summary, isLoading: summaryLoading } = useRewardsSummary({
    enabled: !!isAdminOrCouncil,
  });
  const { data: allClaims } = useRewardClaims({ limit: 50 });
  const { data: distData } = useDistributions({ limit: 50 });

  const filteredClaims = useMemo(() => {
    const claims = allClaims?.claims ?? [];
    if (claimFilter === 'all') return claims;
    return claims.filter((c) => c.status === claimFilter);
  }, [allClaims?.claims, claimFilter]);

  const filterCounts = useMemo(() => {
    const claims = allClaims?.claims ?? [];
    return {
      all: claims.length,
      pending: claims.filter((c) => c.status === 'pending').length,
      approved: claims.filter((c) => c.status === 'approved').length,
      paid: claims.filter((c) => c.status === 'paid').length,
      rejected: claims.filter((c) => c.status === 'rejected').length,
    };
  }, [allClaims?.claims]);

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
          <div className="h-12 rounded-lg bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-200" />
        </div>
      </PageContainer>
    );
  }

  const viewTabs: { key: AdminView; label: string }[] = [
    { key: 'claims', label: t('admin.tabs.allClaims') },
    { key: 'distributions', label: t('admin.tabs.distributions') },
    { key: 'manual', label: t('admin.tabs.manual') },
  ];

  const filterPills: { key: ClaimFilter; label: string }[] = [
    { key: 'all', label: `${t('admin.filterAll')} (${filterCounts.all})` },
    { key: 'pending', label: `${t('claimStatus.pending')} (${filterCounts.pending})` },
    { key: 'approved', label: `${t('claimStatus.approved')} (${filterCounts.approved})` },
    { key: 'paid', label: `${t('claimStatus.paid')} (${filterCounts.paid})` },
    { key: 'rejected', label: `${t('claimStatus.rejected')} (${filterCounts.rejected})` },
  ];

  return (
    <PageContainer width="wide">
      <div className="space-y-4" data-testid="admin-rewards-page">
        {/* Header with actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-organic-orange/10">
              <Gift className="h-4.5 w-4.5 text-organic-orange" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-gray-900">{t('admin.title')}</h1>
              <p className="text-xs text-gray-500">{t('admin.subtitle')}</p>
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

        {/* Compact summary bar */}
        {summary && (
          <div
            className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm"
            data-testid="rewards-admin-summary-cards"
          >
            <span className="text-gray-600">
              <span className="font-semibold text-gray-900">
                {Number(summary.total_distributed).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </span>{' '}
              {t('admin.summaryDistributed')}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">
              <span className="font-semibold text-gray-900">{summary.pending_claims_count}</span>{' '}
              {t('admin.summaryPending')}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">
              <span className="font-semibold text-gray-900">{summary.approved_claims_count}</span>{' '}
              {t('admin.summaryApproved')}
            </span>
          </div>
        )}

        {/* Safety & Integrity accordion */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <button
            onClick={() => setGuardrailsOpen(!guardrailsOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            data-testid="rewards-admin-guardrails-toggle"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {t('admin.safetyIntegrity')}
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform ${
                guardrailsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {guardrailsOpen && (
            <div className="grid gap-3 border-t border-gray-100 p-4 lg:grid-cols-2">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <h3 className="text-xs font-semibold text-amber-900">
                  {t('admin.payoutGuardrailsTitle')}
                </h3>
                <p className="mt-1 text-xs text-amber-800">{t('admin.payoutGuardrailsBody')}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <h3 className="text-xs font-semibold text-emerald-900">
                  {t('admin.distributionIntegrityTitle')}
                </h3>
                <p className="mt-1 text-xs text-emerald-800">
                  {t('admin.distributionIntegrityBody')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* View tabs */}
        <div className="flex gap-1.5 border-b border-gray-200 pb-3" data-testid="rewards-admin-tabs">
          {viewTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeView === tab.key
                  ? 'bg-organic-orange text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              data-testid={`rewards-admin-tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Claims view with filter pills */}
        {activeView === 'claims' && (
          <div className="space-y-3">
            <div
              className="flex flex-wrap gap-1.5"
              data-testid="rewards-admin-filter-pills"
            >
              {filterPills.map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setClaimFilter(pill.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    claimFilter === pill.key
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  data-testid={`rewards-admin-filter-${pill.key}`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white">
              <ClaimsTable
                claims={filteredClaims}
                showUser
                showRiskSignals
                onReview={isAdmin ? (claim) => setReviewClaim(claim) : undefined}
                onPay={isAdmin ? (claim) => setPayClaim(claim) : undefined}
              />
            </div>
          </div>
        )}

        {activeView === 'distributions' && (
          <div className="rounded-xl border border-gray-200 bg-white">
            <DistributionsTable distributions={distData?.distributions ?? []} showUser />
          </div>
        )}

        {activeView === 'manual' && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center" data-testid="rewards-admin-manual-tab">
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
