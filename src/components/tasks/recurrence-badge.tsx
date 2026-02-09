'use client';

import { Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { RecurrenceRule } from '@/features/tasks';

interface RecurrenceBadgeProps {
  rule: RecurrenceRule;
  className?: string;
}

export function RecurrenceBadge({ rule, className }: RecurrenceBadgeProps) {
  const t = useTranslations('Tasks.templates.recurrenceRules');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
        'bg-blue-50 text-blue-600',
        className
      )}
      title={t(rule)}
    >
      <Repeat className="w-3 h-3" />
      {t(rule)}
    </span>
  );
}
