'use client';

import { useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('completeSprintTitle')}</h2>
        <p className="text-sm text-gray-600 mb-6">
          {t('completeSprintSubtitle', { name: sprint.name })}
        </p>

        {step === 'summary' && (
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.totalTasks}</p>
                <p className="text-xs text-gray-500">{t('completeSummaryTotal')}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{stats.completedTasks}</p>
                <p className="text-xs text-gray-500">{t('completeSummaryDone')}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.incompleteTasks}</p>
                <p className="text-xs text-gray-500">{t('completeSummaryIncomplete')}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">
                  {stats.completedPoints}/{stats.totalPoints}
                </p>
                <p className="text-xs text-gray-500">{t('completeSummaryPoints')}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{t('completeSummaryRate')}</span>
                <span className="text-sm font-bold text-gray-900">{stats.completionRate}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-organic-orange to-organic-yellow transition-all"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {step === 'incomplete' && (
          <div className="space-y-4 mb-6">
            <p className="text-sm text-gray-700">
              {t('incompleteTasksCount', { count: stats.incompleteTasks })}
            </p>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="incomplete_action"
                value="backlog"
                checked={incompleteAction === 'backlog'}
                onChange={() => setIncompleteAction('backlog')}
                className="mt-1 text-organic-orange focus:ring-organic-orange"
              />
              <div>
                <p className="font-medium text-gray-900">{t('incompleteBacklog')}</p>
                <p className="text-sm text-gray-500">{t('incompleteBacklogDesc')}</p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
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
                className="mt-1 text-organic-orange focus:ring-organic-orange"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{t('incompleteNextSprint')}</p>
                <p className="text-sm text-gray-500 mb-2">{t('incompleteNextSprintDesc')}</p>
                {incompleteAction === 'next_sprint' && planningSprints.length > 0 && (
                  <select
                    value={nextSprintId}
                    onChange={(e) => setNextSprintId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
                  >
                    {planningSprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
                {planningSprints.length === 0 && (
                  <p className="text-xs text-gray-400">{t('incompleteNoPlanningSprints')}</p>
                )}
              </div>
            </label>
          </div>
        )}

        <div className="flex gap-3">
          {step === 'incomplete' ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              {t('back')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
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
            className="flex-1 bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('completingSprintButton')}
              </>
            ) : step === 'summary' && stats.incompleteTasks > 0 ? (
              <>
                {t('next')}
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {t('completeSprintButton')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
