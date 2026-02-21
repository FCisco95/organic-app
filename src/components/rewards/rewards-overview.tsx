'use client';

import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Coins,
  Gift,
  ShieldAlert,
  WalletCards,
} from 'lucide-react';
import type { UserRewardsInfo } from '@/features/rewards';

interface RewardsOverviewProps {
  rewards: UserRewardsInfo;
  onClaim: () => void;
}

export function RewardsOverview({ rewards, onClaim }: RewardsOverviewProps) {
  const t = useTranslations('Rewards');

  const tokenEquivalent = rewards.claimable_points / rewards.conversion_rate;
  const canClaim =
    rewards.rewards_enabled &&
    rewards.claimable_points >= rewards.min_threshold &&
    (!rewards.claim_requires_wallet || !!rewards.wallet_address);

  const settlementStatus = rewards.latest_reward_settlement_status;
  const settlementReason = rewards.latest_reward_settlement_reason;
  const settlementBlocked = settlementStatus === 'held' || settlementStatus === 'killed';
  const settlementReady = !settlementBlocked;
  const SettlementIcon = settlementBlocked ? ShieldAlert : CheckCircle2;
  const settlementStatusLabel = settlementStatus
    ? t(`overview.settlementStatus.${settlementStatus}`)
    : t('overview.settlementStatus.unknown');

  const pointsReady = rewards.claimable_points >= rewards.min_threshold;
  const walletReady = !rewards.claim_requires_wallet || Boolean(rewards.wallet_address);

  const claimabilityChecks = [
    {
      id: 'points',
      label: t('overview.pointsChecklist', {
        points: rewards.claimable_points.toLocaleString(),
        min: rewards.min_threshold.toLocaleString(),
      }),
      ready: pointsReady,
      Icon: Coins,
    },
    {
      id: 'wallet',
      label: rewards.claim_requires_wallet
        ? t('overview.walletChecklist.required')
        : t('overview.walletChecklist.optional'),
      ready: walletReady,
      Icon: WalletCards,
    },
    {
      id: 'settlement',
      label: t('overview.settlementChecklist'),
      ready: settlementReady,
      Icon: ShieldAlert,
    },
  ];

  const guidanceKey = !rewards.rewards_enabled
    ? 'overview.guidance.disabled'
    : !walletReady
      ? 'overview.guidance.wallet'
      : !pointsReady
        ? 'overview.guidance.threshold'
        : settlementBlocked
          ? 'overview.guidance.settlementBlocked'
          : 'overview.guidance.ready';

  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6"
      data-testid="rewards-overview-card"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-organic-orange to-organic-yellow">
          <Gift className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('overview.title')}</h2>
          <p className="text-sm text-gray-500">{t('overview.subtitle')}</p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-organic-orange/20 bg-gradient-to-br from-organic-orange/10 to-organic-yellow/10 p-4">
          <div className="mb-1 flex items-center gap-2">
            <Coins className="h-4 w-4 text-organic-orange" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t('overview.claimable')}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{rewards.claimable_points.toLocaleString()}</p>
          <p className="mt-1 text-xs text-gray-500">
            {t('overview.tokenEquivalent', {
              amount: tokenEquivalent.toLocaleString(undefined, { maximumFractionDigits: 2 }),
            })}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-1 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t('overview.pending')}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{rewards.pending_claims}</p>
          <p className="mt-1 text-xs text-gray-500">{t('overview.pendingLabel')}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-1 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t('overview.distributed')}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {rewards.total_distributed.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-gray-500">{t('overview.tokensReceived')}</p>
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div
          className="rounded-xl border border-gray-200 bg-gray-50 p-4"
          data-testid="rewards-claimability-panel"
        >
          <h3 className="text-sm font-semibold text-gray-900">{t('overview.claimabilityTitle')}</h3>
          <p className="mt-1 text-xs text-gray-500">{t('overview.claimabilitySubtitle')}</p>
          <div className="mt-3 space-y-2">
            {claimabilityChecks.map((check) => (
              <div
                key={check.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <check.Icon className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs text-gray-700">{check.label}</span>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    check.ready
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {check.ready ? t('overview.ready') : t('overview.actionRequired')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-xl border border-gray-200 bg-gray-50 p-4"
          data-testid="rewards-claim-flow-panel"
        >
          <h3 className="text-sm font-semibold text-gray-900">{t('overview.flowTitle')}</h3>
          <ol className="mt-3 space-y-2">
            <li className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
              1. {t('overview.flowStepSubmit')}
            </li>
            <li className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
              2. {t('overview.flowStepReview')}
            </li>
            <li className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
              3. {t('overview.flowStepPayout')}
            </li>
          </ol>
        </div>
      </div>

      <div
        className={`mb-4 rounded-xl border px-4 py-3 ${
          settlementBlocked
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-emerald-200 bg-emerald-50 text-emerald-900'
        }`}
        data-testid="rewards-settlement-panel"
      >
        <div className="flex items-start gap-2">
          <SettlementIcon className="mt-0.5 h-4 w-4" />
          <div>
            <p className="text-sm font-medium">
              {t('overview.settlementIntegrity')}: {settlementStatusLabel}
            </p>
            <p className="mt-1 text-xs opacity-90">
              {t('overview.settlementCapAndCarryover', {
                cap: rewards.latest_reward_emission_cap.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                }),
                carryover: rewards.latest_reward_carryover_amount.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                }),
              })}
            </p>
            {rewards.latest_reward_settlement_at && (
              <p className="mt-1 text-xs opacity-80">
                {t('overview.lastSettlementAt', {
                  value: new Date(rewards.latest_reward_settlement_at).toLocaleString(),
                })}
              </p>
            )}
            {settlementReason && (
              <p className="mt-1 text-xs opacity-80">
                {t('overview.settlementReason', { reason: settlementReason })}
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        className="mb-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3"
        data-testid="rewards-claim-guidance"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 text-blue-700" />
        <p className="text-xs text-blue-800">{t(guidanceKey)}</p>
      </div>

      <button
        onClick={onClaim}
        disabled={!canClaim}
        className="w-full rounded-lg bg-organic-orange px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-organic-orange/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {!rewards.rewards_enabled
          ? t('overview.rewardsDisabled')
          : !rewards.wallet_address && rewards.claim_requires_wallet
            ? t('overview.walletRequired')
            : rewards.claimable_points < rewards.min_threshold
              ? t('overview.belowThreshold', { min: rewards.min_threshold })
              : t('overview.claimButton')}
      </button>
    </div>
  );
}
