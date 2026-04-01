'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Gift, ShieldAlert, CheckCircle2, TrendingUp, Home, UserCircle } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { Link } from '@/i18n/navigation';
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
  const pendingTotal = pendingClaims?.total ?? 0;

  if (!isAdminOrCouncil) {
    return (
      <PageContainer width="narrow">
        <div className="flex items-center justify-center py-16" data-testid="rewards-admin-access-denied">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">{t('admin.accessDenied')}</h2>
            <p className="mb-6 text-sm text-muted-foreground">{t('admin.accessDeniedExplanation')}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cta px-5 py-2.5 text-sm font-medium text-cta-fg transition-colors hover:bg-cta-hover"
              >
                <Home className="h-4 w-4" />
                {t('admin.goHome')}
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <UserCircle className="h-4 w-4" />
                {t('admin.viewProfile')}
              </Link>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (summaryLoading) {
    return (
      <PageContainer width="wide">
        <div className="space-y-6 animate-pulse" data-testid="rewards-admin-loading-skeleton">
          <div className="h-8 w-1/4 rounded bg-muted" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="h-24 rounded-xl bg-muted" />
            <div className="h-24 rounded-xl bg-muted" />
            <div className="h-24 rounded-xl bg-muted" />
          </div>
          <div className="h-64 rounded-xl bg-muted" />
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
        {/* Header + Action Bar */}
        <section
          className="rounded-2xl border border-border bg-card p-5 sm:p-6"
          data-testid="rewards-admin-command-deck"
        >
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-organic-terracotta/10">
                <Gift className="h-5 w-5 text-organic-terracotta" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('admin.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('admin.subtitle')}</p>
              </div>
            </div>
            {/* Action bar buttons */}
            <div className="flex gap-2">
              {isAdmin && (
                <button
                  onClick={() => setManualOpen(true)}
                  className="rounded-lg bg-cta px-4 py-2 text-sm font-medium text-cta-fg transition-colors hover:bg-cta-hover"
                  data-testid="rewards-admin-manual-action"
                >
                  {t('admin.manualDistribute')}
                </button>
              )}
            </div>
          </div>

          {/* Stats ribbon with trend indicators */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3" data-testid="rewards-admin-pending-triage">
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('admin.pendingClaims')}</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-mono text-xl font-bold tabular-nums text-foreground">{pendingTotal}</p>
                <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {t('admin.trendLabel')}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3" data-testid="rewards-admin-risk-marker">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-800">{t('admin.atRiskClaims')}</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-mono text-xl font-bold tabular-nums text-amber-900">{riskStats.atRisk}</p>
              </div>
              <p className="text-xs text-amber-800">{t('admin.urgentClaims', { count: riskStats.urgent })}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('admin.approvedClaims')}</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-mono text-xl font-bold tabular-nums text-foreground">{summary?.approved_claims_count ?? 0}</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
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
                    ? 'bg-cta text-cta-fg'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                data-testid={`rewards-admin-tab-${tab.key}`}
              >
                {tab.label}
                {tab.key === 'pending' && pendingTotal ? ` (${pendingTotal})` : ''}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card">
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
                <Gift className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium text-foreground">{t('admin.manualTitle')}</h3>
                <p className="mb-4 text-muted-foreground">{t('admin.manualDescription')}</p>
                {isAdmin && (
                  <button
                    onClick={() => setManualOpen(true)}
                    className="rounded-lg bg-cta px-6 py-2.5 text-sm font-medium text-cta-fg transition-colors hover:bg-cta-hover"
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
