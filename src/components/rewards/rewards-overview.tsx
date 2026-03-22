'use client';

import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Coins,
  ShieldAlert,
  WalletCards,
} from 'lucide-react';
import type { UserRewardsInfo } from '@/features/rewards';
import { timeAgo } from './time-ago';

interface RewardsOverviewProps {
  rewards: UserRewardsInfo;
  onClaim: () => void;
}

export function RewardsOverview({ rewards, onClaim }: RewardsOverviewProps) {
  const t = useTranslations('Rewards');

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

  const canClaim =
    rewards.rewards_enabled &&
    pointsReady &&
    walletReady &&
    settlementReady;

  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="rewards-overview-card">
      {/* Claimability checklist */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('overview.claimabilityTitle')}
        </h3>
        <p className="mt-1 text-xs text-gray-500">{t('overview.claimabilitySubtitle')}</p>

        <div className="mt-3 space-y-2">
          {claimabilityChecks.map((check) => (
            <div
              key={check.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
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

        {/* Inline claim button for overview context */}
        <button
          onClick={onClaim}
          disabled={!canClaim}
          className="mt-4 w-full rounded-lg bg-organic-orange px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-organic-orange/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!rewards.rewards_enabled
            ? t('overview.rewardsDisabled')
            : !walletReady
              ? t('overview.walletRequired')
              : !pointsReady
                ? t('overview.belowThreshold', { min: rewards.min_threshold })
                : t('overview.claimButton')}
        </button>
      </div>

      {/* Settlement status */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('overview.settlementIntegrity')}
        </h3>

        <div
          className={`mt-3 rounded-lg border px-3 py-3 ${
            settlementBlocked
              ? 'border-amber-200 bg-amber-50'
              : 'border-emerald-200 bg-emerald-50'
          }`}
          data-testid="rewards-settlement-panel"
        >
          <div className="flex items-start gap-2">
            <SettlementIcon
              className={`mt-0.5 h-4 w-4 ${
                settlementBlocked ? 'text-amber-700' : 'text-emerald-700'
              }`}
            />
            <div>
              <p
                className={`text-sm font-medium ${
                  settlementBlocked ? 'text-amber-900' : 'text-emerald-900'
                }`}
              >
                {settlementStatusLabel}
              </p>
              <p
                className={`mt-1 text-xs ${
                  settlementBlocked ? 'text-amber-800' : 'text-emerald-800'
                }`}
              >
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
                <p
                  className={`mt-1 text-xs opacity-80 ${
                    settlementBlocked ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                  title={new Date(rewards.latest_reward_settlement_at).toLocaleString()}
                >
                  {t('overview.lastSettlementAt', {
                    value: timeAgo(rewards.latest_reward_settlement_at),
                  })}
                </p>
              )}
              {settlementReason && (
                <p className="mt-1 text-xs text-amber-700">
                  {t('overview.settlementReason', { reason: settlementReason })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Conversion info */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <span className="text-xs text-gray-600">{t('overview.conversionRate', { rate: rewards.conversion_rate })}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <span className="text-xs text-gray-600">{t('overview.minThreshold', { min: rewards.min_threshold.toLocaleString() })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
