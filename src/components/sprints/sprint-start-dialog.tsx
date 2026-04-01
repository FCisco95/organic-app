'use client';

import { AlertTriangle, CheckCircle2, Play } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      data-testid="sprint-start-dialog"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold text-gray-900">{t('startSprintTitle')}</h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Sprint name bold + task count badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">{sprint.name}</span>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {taskCount} tasks
            </span>
          </div>

          {/* Warning banner */}
          {taskCount === 0 && (
            <div className="flex items-start gap-2 rounded-md border-l-4 border-l-amber-400 bg-amber-50 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-700">{t('startSprintEmptyWarning')}</p>
            </div>
          )}

          {sprint.goal && (
            <p className="text-xs italic text-gray-500">{sprint.goal}</p>
          )}

          {/* GitHub-style check items */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
              <span>{t('startChecklistTaskLoad', { count: taskCount })}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
              <span>{t('startChecklistSingleActive')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
              <span>{t('startChecklistIrreversible')}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500">{t('startSprintDescription')}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-cta bg-cta px-3 py-1.5 text-sm font-medium text-cta-fg transition-colors hover:bg-cta-hover disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t('startingSprintButton')}
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                {t('startSprintButton')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
