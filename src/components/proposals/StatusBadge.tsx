'use client';

import { Clock, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProposalStatus } from '@/features/proposals/types';
import { PROPOSAL_STATUS_COLORS } from '@/features/proposals/types';
import { useTranslations } from 'next-intl';

const STATUS_ICON_MAP: Record<ProposalStatus, LucideIcon> = {
  draft: Clock,
  submitted: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  voting: MessageCircle,
};

interface StatusBadgeProps {
  status: ProposalStatus;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({ status, showIcon = true, className }: StatusBadgeProps) {
  const t = useTranslations('Proposals');
  const Icon = STATUS_ICON_MAP[status];
  const colorClasses = PROPOSAL_STATUS_COLORS[status];

  const labelMap: Record<ProposalStatus, string> = {
    draft: t('statusDraft'),
    submitted: t('statusSubmitted'),
    approved: t('statusApproved'),
    rejected: t('statusRejected'),
    voting: t('statusVoting'),
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize',
        colorClasses,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {labelMap[status]}
    </span>
  );
}
