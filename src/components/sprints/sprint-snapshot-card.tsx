'use client';

import { CheckCircle2, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SprintSnapshot } from '@/features/sprints';

type SprintSnapshotCardProps = {
  snapshot: SprintSnapshot;
  compact?: boolean;
};

export function SprintSnapshotCard({ snapshot, compact = false }: SprintSnapshotCardProps) {
  const t = useTranslations('Sprints');

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs text-gray-500" data-testid="sprint-snapshot-compact">
        <span className="flex items-center gap-1 text-organic-terracotta">
          <CheckCircle2 className="h-3 w-3" />
          {snapshot.completed_tasks}/{snapshot.total_tasks}
        </span>
        <span className="flex items-center gap-1">
          <Target className="h-3 w-3" />
          {snapshot.completed_points}/{snapshot.total_points} pts
        </span>
        <span className="font-medium text-gray-600">{snapshot.completion_rate}%</span>
      </div>
    );
  }

  const openCount = (snapshot.total_tasks ?? 0) - (snapshot.completed_tasks ?? 0);
  const closedCount = snapshot.completed_tasks ?? 0;

  return (
    <div className="rounded-md border border-border bg-white" data-testid="sprint-snapshot-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{t('snapshotTitle')}</h3>
      </div>

      <div className="p-4 space-y-3">
        {/* Chunky milestone bar */}
        <div>
          <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-cta transition-all"
              style={{ width: `${snapshot.completion_rate}%` }}
            />
            {(snapshot.completion_rate ?? 0) > 20 && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-difference">
                {snapshot.completion_rate}%
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
            <span>{openCount} open</span>
            <span>{closedCount} closed</span>
            <span>{snapshot.completed_points}/{snapshot.total_points} pts</span>
          </div>
        </div>

        {snapshot.incomplete_action && (
          <p className="text-[11px] text-gray-400">
            {t('snapshotIncompleteAction', { action: snapshot.incomplete_action })}
          </p>
        )}
      </div>
    </div>
  );
}
