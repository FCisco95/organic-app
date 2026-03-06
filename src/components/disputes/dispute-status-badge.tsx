'use client';

import {
  AlertCircle,
  MessageCircle,
  Clock,
  Search,
  CheckCircle,
  ArrowUp,
  XCircle,
  Undo2,
  Handshake,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { DisputeStatus } from '@/features/disputes/types';
import { DISPUTE_STATUS_COLORS } from '@/features/disputes/types';

const STATUS_ICON_MAP: Record<DisputeStatus, LucideIcon> = {
  open: AlertCircle,
  mediation: MessageCircle,
  awaiting_response: Clock,
  under_review: Search,
  resolved: CheckCircle,
  appealed: ArrowUp,
  appeal_review: Search,
  dismissed: XCircle,
  withdrawn: Undo2,
  mediated: Handshake,
};

interface DisputeStatusBadgeProps {
  status: string;
  showIcon?: boolean;
  className?: string;
}

export function DisputeStatusBadge({
  status,
  showIcon = true,
  className,
}: DisputeStatusBadgeProps) {
  const t = useTranslations('Disputes');
  const fallbackStatus: DisputeStatus = 'open';
  const safeStatus = (status in STATUS_ICON_MAP ? status : fallbackStatus) as DisputeStatus;
  const Icon = STATUS_ICON_MAP[safeStatus];
  const colorClasses =
    DISPUTE_STATUS_COLORS[safeStatus] ?? DISPUTE_STATUS_COLORS[fallbackStatus];
  const statusLabel =
    safeStatus === status
      ? t(`status.${safeStatus}`)
      : status
          .split('_')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        colorClasses,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {statusLabel}
    </span>
  );
}
