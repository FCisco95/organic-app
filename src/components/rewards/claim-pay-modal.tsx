'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send, AlertCircle } from 'lucide-react';
import type { RewardClaim } from '@/features/rewards';
import { usePayClaim } from '@/features/rewards';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ClaimPayModalProps {
  claim: RewardClaim | null;
  open: boolean;
  onClose: () => void;
}

export function ClaimPayModal({ claim, open, onClose }: ClaimPayModalProps) {
  const t = useTranslations('Rewards');
  const payClaim = usePayClaim();
  const [txSignature, setTxSignature] = useState('');

  if (!claim) return null;

  const handleSubmit = () => {
    if (!txSignature.trim()) return;
    payClaim.mutate(
      { claimId: claim.id, tx_signature: txSignature.trim() },
      {
        onSuccess: () => {
          setTxSignature('');
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-md bg-white border-gray-200"
        data-testid="rewards-claim-pay-modal"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-gray-900">{t('payModal.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('payModal.title')}
          </DialogDescription>
        </DialogHeader>

        {/* Payment Info */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('payModal.recipient')}</span>
            <span className="font-medium text-gray-900">
              {claim.user_name || claim.user_id.slice(0, 8)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('payModal.amount')}</span>
            <span className="font-bold text-gray-900">
              {Number(claim.token_amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
              ORG
            </span>
          </div>
          {claim.wallet_address && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('payModal.wallet')}</span>
              <span className="font-mono text-xs text-gray-700">{claim.wallet_address}</span>
            </div>
          )}
        </div>

        {/* TX Signature */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('payModal.txLabel')}
          </label>
          <input
            type="text"
            value={txSignature}
            onChange={(e) => setTxSignature(e.target.value)}
            placeholder={t('payModal.txPlaceholder')}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-organic-orange/30 focus:border-organic-orange"
          />
        </div>

        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          data-testid="rewards-claim-pay-guardrail"
        >
          {t('payModal.guardrail')}
        </div>

        {/* Error */}
        {payClaim.isError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {payClaim.error.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {t('payModal.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!txSignature.trim() || payClaim.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {payClaim.isPending ? t('payModal.processing') : t('payModal.confirm')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
