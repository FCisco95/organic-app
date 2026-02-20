'use client';

import { AlertCircle, Calendar, Target, Timer } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useSprintTimeline } from '@/features/sprints';
import { formatSprintDate } from '@/features/sprints/utils';
import { SprintSnapshotCard } from './sprint-snapshot-card';

export function SprintTimeline() {
  const t = useTranslations('Sprints');
  const { data: sprints, isLoading } = useSprintTimeline();

  const getStatusBadgeClass = (status: string | null) => {
    const styles = {
      planning: 'bg-blue-100 text-blue-700 border-blue-200',
      active: 'bg-green-100 text-green-700 border-green-200',
      review: 'bg-amber-100 text-amber-700 border-amber-200',
      dispute_window: 'bg-orange-100 text-orange-700 border-orange-200',
      settlement: 'bg-purple-100 text-purple-700 border-purple-200',
      completed: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    if (!status) return styles.planning;
    return styles[status as keyof typeof styles] ?? styles.planning;
  };

  const resolvePhaseDeadline = (sprint: {
    status: string | null;
    review_started_at: string | null;
    dispute_window_ends_at: string | null;
  }) => {
    if (sprint.status === 'review' && sprint.review_started_at) {
      return new Date(
        new Date(sprint.review_started_at).getTime() + 72 * 60 * 60 * 1000
      ).toISOString();
    }
    if (sprint.status === 'dispute_window') {
      return sprint.dispute_window_ends_at;
    }
    return null;
  };

  const formatRemaining = (deadlineIso: string) => {
    const diffMs = new Date(deadlineIso).getTime() - Date.now();
    if (diffMs <= 0) return t('phaseDeadlinePassed');

    const totalMinutes = Math.ceil(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${Math.max(1, minutes)}m`;
  };

  if (isLoading) {
    return (
      <div className="text-center py-12" data-testid="sprints-timeline-view">
        <div className="w-8 h-8 border-3 border-organic-orange border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">{t('loading')}</p>
      </div>
    );
  }

  if (!sprints || sprints.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200" data-testid="sprints-timeline-view">
        <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('timelineAllEmpty')}</h3>
        <p className="text-gray-500">{t('timelineAllEmptyDesc')}</p>
      </div>
    );
  }

  return (
    <div className="relative" data-testid="sprints-timeline-view">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {sprints.map((sprint) => (
          <div key={sprint.id} className="relative pl-12" data-testid={`sprint-timeline-item-${sprint.id}`}>
            {/* Timeline dot */}
            <div className="absolute left-2.5 top-6 w-3 h-3 rounded-full bg-organic-orange border-2 border-white shadow" />

            {(() => {
              const phaseDeadline = resolvePhaseDeadline(sprint);
              const phaseRemaining = phaseDeadline ? formatRemaining(phaseDeadline) : null;

              return (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Link
                        href={`/sprints/${sprint.id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-organic-orange transition-colors"
                      >
                        {sprint.name}
                      </Link>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {formatSprintDate(sprint.start_at)} — {formatSprintDate(sprint.end_at)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(sprint.status)}`}
                    >
                      {t(`status.${sprint.status ?? 'planning'}`)}
                    </span>
                  </div>

                  {sprint.goal && <p className="text-sm text-gray-600 mb-3">{sprint.goal}</p>}

                  {phaseDeadline && (
                    <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700">
                      <Timer className="h-3.5 w-3.5 text-gray-500" />
                      <span>{t('phaseTimeRemaining', { time: phaseRemaining ?? t('phaseDeadlinePassed') })}</span>
                    </div>
                  )}

                  {sprint.settlement_blocked_reason && (
                    <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{t('settlementBlocked', { reason: sprint.settlement_blocked_reason })}</span>
                    </div>
                  )}

                  {sprint.snapshot && <SprintSnapshotCard snapshot={sprint.snapshot} compact />}

                  <Link
                    href={`/sprints/${sprint.id}`}
                    className="inline-block mt-3 text-sm text-organic-orange hover:text-orange-600 font-medium transition-colors"
                  >
                    {t('viewDetails')}
                  </Link>
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
