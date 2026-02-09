'use client';

import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useSubtaskProgress } from '@/features/tasks';

interface SubtaskProgressProps {
  parentTaskId: string;
  className?: string;
}

export function SubtaskProgress({ parentTaskId, className }: SubtaskProgressProps) {
  const t = useTranslations('Tasks.subtasks');
  const { data: progress } = useSubtaskProgress(parentTaskId);

  if (!progress || progress.total === 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs text-gray-500',
        className
      )}
      title={t('progress', { completed: progress.completed, total: progress.total })}
    >
      <CheckCircle2 className="w-3 h-3" />
      {t('progress', { completed: progress.completed, total: progress.total })}
    </span>
  );
}
