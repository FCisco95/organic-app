'use client';

import { useTranslations } from 'next-intl';
import type { RewardsSummary } from '@/features/rewards';

interface RewardsSummaryCardsProps {
  summary: RewardsSummary;
}

/**
 * Compact inline summary bar for admin rewards.
 * Replaces the previous 3-card grid with a single horizontal bar.
 */
export function RewardsSummaryCards({ summary }: RewardsSummaryCardsProps) {
  const t = useTranslations('Rewards');

  return (
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
  );
}
