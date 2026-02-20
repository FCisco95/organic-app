'use client';

import { CheckCircle2, Target, Clock } from 'lucide-react';
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
      <div className="flex items-center gap-4 text-sm" data-testid="sprint-snapshot-compact">
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {snapshot.completed_tasks}/{snapshot.total_tasks}
        </span>
        <span className="flex items-center gap-1 text-gray-500">
          <Target className="w-3.5 h-3.5" />
          {snapshot.completed_points}/{snapshot.total_points} pts
        </span>
        <span className="font-medium text-gray-700">{snapshot.completion_rate}%</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6" data-testid="sprint-snapshot-card">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">{t('snapshotTitle')}</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{snapshot.total_tasks}</p>
          <p className="text-xs text-gray-500">{t('snapshotTotal')}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{snapshot.completed_tasks}</p>
          <p className="text-xs text-gray-500">{t('snapshotCompleted')}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-600">{snapshot.incomplete_tasks}</p>
          <p className="text-xs text-gray-500">{t('snapshotIncomplete')}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">
            {snapshot.completed_points}/{snapshot.total_points}
          </p>
          <p className="text-xs text-gray-500">{t('snapshotPoints')}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">{t('snapshotCompletionRate')}</span>
          <span className="text-sm font-bold text-gray-900">{snapshot.completion_rate}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-organic-orange to-organic-yellow transition-all"
            style={{ width: `${snapshot.completion_rate}%` }}
          />
        </div>
      </div>

      {snapshot.incomplete_action && (
        <p className="text-xs text-gray-400 mt-3">
          {t('snapshotIncompleteAction', { action: snapshot.incomplete_action })}
        </p>
      )}
    </div>
  );
}
