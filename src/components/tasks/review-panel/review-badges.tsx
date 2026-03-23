'use client';

import { Code, FileText, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

/* Inline X brand icon */
function XBrandIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const badgeStyles: Record<string, string> = {
  development: 'bg-violet-50 text-violet-700',
  content: 'bg-amber-50 text-amber-700',
  design: 'bg-pink-50 text-pink-700',
  twitter: 'bg-sky-100 text-sky-700',
  custom: 'bg-gray-100 text-gray-700',
};

export function SubmissionTypeBadge({ type }: { type: string }) {
  const tTasks = useTranslations('Tasks');
  const icons: Record<string, React.ElementType> = {
    development: Code,
    content: FileText,
    design: Palette,
    twitter: XBrandIcon,
    custom: FileText,
  };
  const Icon = icons[type] || FileText;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        badgeStyles[type] || 'bg-gray-100 text-gray-700'
      )}
    >
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
