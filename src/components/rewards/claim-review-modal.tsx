'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { RewardClaim } from '@/features/rewards';
import { useReviewClaim } from '@/features/rewards';

interface ClaimReviewModalProps {
  claim: RewardClaim | null;
  open: boolean;
  onClose: () => void;
}

export function ClaimReviewModal({ claim, open, onClose }: ClaimReviewModalProps) {
  const t = useTranslations('Rewards');
  const reviewClaim = useReviewClaim();
  const [adminNote, setAdminNote] = useState('');

  if (!open || !claim) return null;

  const handleAction = (status: 'approved' | 'rejected') => {
    reviewClaim.mutate(
      { claimId: claim.id, status, admin_note: adminNote || undefined },
      {
        onSuccess: () => {
          setAdminNote('');
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{t('reviewModal.title')}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Claim Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('reviewModal.user')}</span>
            <span className="font-medium text-gray-900">
              {claim.user_name || claim.user_email || claim.user_id.slice(0, 8)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('reviewModal.points')}</span>
            <span className="font-medium text-gray-900">
              {claim.points_amount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('reviewModal.tokens')}</span>
            <span className="font-medium text-gray-900">
              {Number(claim.token_amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
              ORG
            </span>
          </div>
          {claim.wallet_address && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('reviewModal.wallet')}</span>
              <span className="font-mono text-xs text-gray-700">
                {claim.wallet_address.slice(0, 6)}...{claim.wallet_address.slice(-4)}
              </span>
            </div>
          )}
        </div>

        {/* Admin Note */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('reviewModal.noteLabel')}
          </label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={3}
            placeholder={t('reviewModal.notePlaceholder')}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-organic-orange/30 focus:border-organic-orange resize-none"
          />
        </div>

        {/* Error */}
        {reviewClaim.isError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {reviewClaim.error.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleAction('rejected')}
            disabled={reviewClaim.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            {t('reviewModal.reject')}
          </button>
          <button
            onClick={() => handleAction('approved')}
            disabled={reviewClaim.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {t('reviewModal.approve')}
          </button>
        </div>
      </div>
    </div>
  );
}
