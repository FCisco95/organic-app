'use client';

import { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Sprint } from '@/features/sprints';

interface SprintCompleteStats {
  totalTasks: number;
  completedTasks: number;
  incompleteTasks: number;
  totalPoints: number;
  completedPoints: number;
  completionRate: number;
}

type SprintCompleteDialogProps = {
  open: boolean;
  sprint: Sprint;
  stats: SprintCompleteStats;
  planningSprints: Sprint[];
  loading: boolean;
  onClose: () => void;
  onConfirm: (incompleteAction: 'backlog' | 'next_sprint', nextSprintId?: string) => void;
};

export function SprintCompleteDialog({
  open,
  sprint,
  stats,
  planningSprints,
  loading,
  onClose,
  onConfirm,
}: SprintCompleteDialogProps) {
  const t = useTranslations('Sprints');
  const [step, setStep] = useState<'summary' | 'incomplete'>(
    stats.incompleteTasks > 0 ? 'summary' : 'summary'
  );
  const [incompleteAction, setIncompleteAction] = useState<'backlog' | 'next_sprint'>('backlog');
  const [nextSprintId, setNextSprintId] = useState<string>(planningSprints[0]?.id ?? '');

  if (!open) return null;

  const handleNext = () => {
    if (step === 'summary' && stats.incompleteTasks > 0) {
      setStep('incomplete');
    } else {
      onConfirm(incompleteAction, incompleteAction === 'next_sprint' ? nextSprintId : undefined);
    }
  };

  const handleBack = () => {
    setStep('summary');
  };

  const openCount = stats.incompleteTasks;
  const closedCount = stats.completedTasks;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      data-testid="sprint-complete-dialog"
    >
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-gray-900">{t('completeSprintTitle')}</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {t('completeSprintSubtitle', { name: sprint.name })}
          </p>
        </div>

        <div className="p-5">
          {step === 'summary' && (
            <div className="space-y-4">
              {/* Chunky milestone progress bar */}
              <div>
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${stats.completionRate}%` }}
                  />
                  {stats.completionRate > 15 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white mix-blend-difference">
                      {stats.completionRate}%
                    </span>
                  )}
                </div>
                <div className="mt-1.5 text-xs text-gray-500">
                  {stats.completionRate}% complete · {openCount} open · {closedCount} closed
                </div>
              </div>

              {/* Points summary */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{stats.completedPoints}/{stats.totalPoints} pts</span>
              </div>

              {/* Checks */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span>{t('completeChecklistReview')}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  {stats.incompleteTasks === 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span>{t('completeChecklistDisputes')}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span>{t('completeChecklistSettlement')}</span>
                </div>
              </div>
            </div>
          )}

          {step === 'incomplete' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                {t('incompleteTasksCount', { count: stats.incompleteTasks })}
              </p>

              <label className="flex items-start gap-3 rounded-md border border-gray-200 p-3 cursor-pointer transition-colors hover:bg-gray-50">
                <input
                  type="radio"
                  name="incomplete_action"
                  value="backlog"
                  checked={incompleteAction === 'backlog'}
                  onChange={() => setIncompleteAction('backlog')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('incompleteBacklog')}</p>
                  <p className="text-xs text-gray-500">{t('incompleteBacklogDesc')}</p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                  planningSprints.length === 0 ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <input
                  type="radio"
                  name="incomplete_action"
                  value="next_sprint"
                  checked={incompleteAction === 'next_sprint'}
                  onChange={() => setIncompleteAction('next_sprint')}
                  disabled={planningSprints.length === 0}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{t('incompleteNextSprint')}</p>
                  <p className="text-xs text-gray-500 mb-1.5">{t('incompleteNextSprintDesc')}</p>
                  {incompleteAction === 'next_sprint' && planningSprints.length > 0 && (
                    <select
                      value={nextSprintId}
                      onChange={(e) => setNextSprintId(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {planningSprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {planningSprints.length === 0 && (
                    <p className="text-[11px] text-gray-400">{t('incompleteNoPlanningSprints')}</p>
                  )}
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
          {step === 'incomplete' ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {t('back')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {t('cancel')}
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={
              loading ||
              (step === 'incomplete' && incompleteAction === 'next_sprint' && !nextSprintId)
            }
            className="flex items-center gap-1.5 rounded-md border border-green-600 bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t('completingSprintButton')}
              </>
            ) : step === 'summary' && stats.incompleteTasks > 0 ? (
              <>
                {t('next')}
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('completeSprintButton')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
