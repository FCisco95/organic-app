'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { RewardClaimStatus } from '@/features/rewards';
import { CLAIM_STATUS_COLORS } from '@/features/rewards';

interface ClaimStatusBadgeProps {
  status: RewardClaimStatus;
  className?: string;
}

export function ClaimStatusBadge({ status, className }: ClaimStatusBadgeProps) {
  const t = useTranslations('Rewards');

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        CLAIM_STATUS_COLORS[status],
        className
      )}
    >
      {t(`claimStatus.${status}`)}
    </span>
  );
}
