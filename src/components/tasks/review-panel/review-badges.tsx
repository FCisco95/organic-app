'use client';

import { Code, FileText, Palette, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export function SubmissionTypeBadge({ type }: { type: string }) {
  const tTasks = useTranslations('Tasks');
  const icons: Record<string, React.ElementType> = {
    development: Code,
    content: FileText,
    design: Palette,
    twitter: AtSign,
    custom: FileText,
  };
  const Icon = icons[type] || FileText;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
      <Icon className="w-3 h-3" />
      {type in icons ? tTasks(`taskTypes.${type}`) : type}
    </span>
  );
}

export function ReviewStatusBadge({ status }: { status: string }) {
  const tReviewStatus = useTranslations('TaskDetail.reviewStatus');
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    disputed: 'bg-purple-100 text-purple-700',
  };

  const statusLabel =
    status === 'pending' || status === 'approved' || status === 'rejected' || status === 'disputed'
      ? tReviewStatus(status)
      : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        'px-2 py-1 rounded-full text-xs font-medium',
        colors[status] || 'bg-gray-100 text-gray-700'
      )}
    >
      {statusLabel}
    </span>
  );
}
