'use client';

import { Code, FileText, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { XBrandIcon } from '@/components/ui/x-brand-icon';

const badgeStyles: Record<string, string> = {
  development: 'bg-violet-50 text-violet-700',
  content: 'bg-amber-50 text-amber-700',
  design: 'bg-pink-50 text-pink-700',
  twitter: 'bg-sky-100 text-sky-700',
  custom: 'bg-gray-100 text-gray-700',
};

const badgeIcons: Record<string, React.ElementType> = {
  development: Code,
  content: FileText,
  design: Palette,
  twitter: XBrandIcon,
  custom: FileText,
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  disputed: 'bg-purple-100 text-purple-700',
};

export function SubmissionTypeBadge({ type }: { type: string }) {
  const tTasks = useTranslations('Tasks');
  const Icon = badgeIcons[type] || FileText;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        badgeStyles[type] || 'bg-gray-100 text-gray-700'
      )}
    >
      <Icon className="w-3 h-3" />
      {type in badgeIcons ? tTasks(`taskTypes.${type}`) : type}
    </span>
  );
}

export function ReviewStatusBadge({ status }: { status: string }) {
  const tReviewStatus = useTranslations('TaskDetail.reviewStatus');

  const statusLabel =
    status === 'pending' || status === 'approved' || status === 'rejected' || status === 'disputed'
      ? tReviewStatus(status)
      : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        'px-2 py-1 rounded-full text-xs font-medium',
        statusColors[status] || 'bg-gray-100 text-gray-700'
      )}
    >
      {statusLabel}
    </span>
  );
}
