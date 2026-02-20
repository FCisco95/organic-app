'use client';

import { AlertCircle, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Sprint } from '@/features/sprints';

type SprintStartDialogProps = {
  open: boolean;
  sprint: Sprint;
  taskCount: number;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function SprintStartDialog({
  open,
  sprint,
  taskCount,
  loading,
  onClose,
  onConfirm,
}: SprintStartDialogProps) {
  const t = useTranslations('Sprints');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      data-testid="sprint-start-dialog"
    >
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('startSprintTitle')}</h2>

        <div className="space-y-3 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">{t('startSprintName')}</p>
            <p className="font-semibold text-gray-900">{sprint.name}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">{t('startSprintTasks')}</p>
            <p className="font-semibold text-gray-900">{taskCount}</p>
          </div>
          {taskCount === 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">{t('startSprintEmptyWarning')}</p>
            </div>
          )}
          {sprint.goal && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">{t('formGoal')}</p>
              <p className="text-sm text-gray-900">{sprint.goal}</p>
            </div>
          )}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              {t('startChecklistTitle')}
            </p>
            <ul className="space-y-1.5 text-sm text-gray-600">
              <li>{t('startChecklistTaskLoad', { count: taskCount })}</li>
              <li>{t('startChecklistSingleActive')}</li>
              <li>{t('startChecklistIrreversible')}</li>
            </ul>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">{t('startSprintDescription')}</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('startingSprintButton')}
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                {t('startSprintButton')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
