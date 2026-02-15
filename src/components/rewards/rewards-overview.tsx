'use client';

import { useTranslations } from 'next-intl';
import { Gift, Coins, Clock, ArrowRight } from 'lucide-react';
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-organic-orange to-organic-yellow rounded-lg flex items-center justify-center">
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('overview.title')}</h2>
          <p className="text-sm text-gray-500">{t('overview.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Claimable Points */}
        <div className="bg-gradient-to-br from-organic-orange/5 to-organic-yellow/5 border border-organic-orange/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-4 h-4 text-organic-orange" />
            <span className="text-xs font-medium text-gray-500">{t('overview.claimable')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {rewards.claimable_points.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {t('overview.tokenEquivalent', {
              amount: tokenEquivalent.toLocaleString(undefined, { maximumFractionDigits: 2 }),
            })}
          </p>
        </div>

        {/* Pending Claims */}
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">{t('overview.pending')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{rewards.pending_claims}</p>
          <p className="text-xs text-gray-500 mt-1">{t('overview.pendingLabel')}</p>
        </div>

        {/* Total Distributed */}
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">{t('overview.distributed')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {rewards.total_distributed.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('overview.tokensReceived')}</p>
        </div>
      </div>

      {/* Conversion Rate Info */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4">
        <span className="text-sm text-blue-700">
          {t('overview.conversionRate', { rate: rewards.conversion_rate })}
        </span>
        {rewards.min_threshold > 0 && (
          <span className="text-xs text-blue-600">
            {t('overview.minThreshold', { min: rewards.min_threshold })}
          </span>
        )}
      </div>

      {/* Claim Button */}
      <button
        onClick={onClaim}
        disabled={!canClaim}
        className="w-full py-3 px-4 bg-organic-orange hover:bg-organic-orange/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
