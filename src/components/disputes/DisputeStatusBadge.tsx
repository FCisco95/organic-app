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
  status: DisputeStatus;
  showIcon?: boolean;
  className?: string;
}

export function DisputeStatusBadge({
  status,
  showIcon = true,
  className,
}: DisputeStatusBadgeProps) {
  const t = useTranslations('Disputes');
  const Icon = STATUS_ICON_MAP[status];
  const colorClasses = DISPUTE_STATUS_COLORS[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        colorClasses,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {t(`status.${status}`)}
    </span>
  );
}
