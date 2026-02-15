'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Coins, AlertCircle } from 'lucide-react';
import type { UserRewardsInfo } from '@/features/rewards';
import { useSubmitClaim } from '@/features/rewards';

interface ClaimModalProps {
  rewards: UserRewardsInfo;
  open: boolean;
  onClose: () => void;
}

export function ClaimModal({ rewards, open, onClose }: ClaimModalProps) {
  const t = useTranslations('Rewards');
  const submitClaim = useSubmitClaim();
  const [pointsInput, setPointsInput] = useState('');

  if (!open) return null;

  const points = parseInt(pointsInput, 10) || 0;
  const tokenAmount = points / rewards.conversion_rate;
  const isValid =
    points > 0 &&
    points <= rewards.claimable_points &&
    points >= rewards.min_threshold;

  const handleSubmit = () => {
    if (!isValid) return;
    submitClaim.mutate(
      { points_amount: points },
      {
        onSuccess: () => {
          setPointsInput('');
          onClose();
        },
      }
    );
  };

  const handleMaxClick = () => {
    setPointsInput(String(rewards.claimable_points));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-organic-orange/10 rounded-lg flex items-center justify-center">
              <Coins className="w-4 h-4 text-organic-orange" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{t('claimModal.title')}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Points Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('claimModal.pointsLabel')}
          </label>
          <div className="relative">
            <input
              type="number"
              value={pointsInput}
              onChange={(e) => setPointsInput(e.target.value)}
              placeholder={t('claimModal.pointsPlaceholder')}
              min={rewards.min_threshold}
              max={rewards.claimable_points}
              className="w-full px-3 py-2 pr-16 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-organic-orange/30 focus:border-organic-orange"
            />
            <button
              onClick={handleMaxClick}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-organic-orange hover:text-organic-orange/80 px-2 py-1"
            >
              {t('claimModal.max')}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t('claimModal.available', { points: rewards.claimable_points.toLocaleString() })}
          </p>
        </div>

        {/* Token Preview */}
        {points > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{t('claimModal.youWillReceive')}</span>
              <span className="font-semibold text-gray-900">
                {tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ORG
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
              <span>{t('claimModal.conversionRate')}</span>
              <span>
                {rewards.conversion_rate} {t('claimModal.pointsPerToken')}
              </span>
            </div>
          </div>
        )}

        {/* Wallet Info */}
        {rewards.wallet_address && (
          <div className="text-xs text-gray-500 mb-4">
            <span className="font-medium">{t('claimModal.walletLabel')}</span>{' '}
            <span className="font-mono">
              {rewards.wallet_address.slice(0, 6)}...{rewards.wallet_address.slice(-4)}
            </span>
          </div>
        )}

        {/* Error */}
        {submitClaim.isError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {submitClaim.error.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {t('claimModal.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitClaim.isPending}
            className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-organic-orange hover:bg-organic-orange/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitClaim.isPending ? t('claimModal.submitting') : t('claimModal.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
