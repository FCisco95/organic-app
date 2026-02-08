'use client';

import { Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskDependency } from '@/features/tasks';

interface BlockedBadgeProps {
  dependencies: TaskDependency[];
  className?: string;
  compact?: boolean;
}

export function BlockedBadge({ dependencies, className, compact }: BlockedBadgeProps) {
  const incompleteBlockers = dependencies.filter(
    (dep) => dep.blocking_task?.status !== 'done'
  );

  if (incompleteBlockers.length === 0) return null;

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
          'bg-red-100 text-red-700',
          className
        )}
        title={`Blocked by ${incompleteBlockers.length} task${incompleteBlockers.length > 1 ? 's' : ''}`}
      >
        <Ban className="w-3 h-3" />
        {incompleteBlockers.length}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-red-50 border border-red-200 text-red-700 text-sm',
        className
      )}
    >
      <Ban className="w-4 h-4 flex-shrink-0" />
      <div>
        <span className="font-medium">
          Blocked by {incompleteBlockers.length} task
          {incompleteBlockers.length > 1 ? 's' : ''}
        </span>
        <div className="text-xs text-red-600 mt-0.5">
          {incompleteBlockers
            .slice(0, 3)
            .map((d) => d.blocking_task?.title || 'Unknown')
            .join(', ')}
          {incompleteBlockers.length > 3 && ` +${incompleteBlockers.length - 3} more`}
        </div>
      </div>
    </div>
  );
}
