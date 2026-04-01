'use client';

import { AlertCircle, Calendar, CheckCircle2, Milestone } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useSprintTimeline } from '@/features/sprints';
import { isSprintExecutionPhase } from '@/features/sprints';
import { formatSprintDate } from '@/features/sprints/utils';
import { SprintSnapshotCard } from './sprint-snapshot-card';

export function SprintTimeline() {
  const t = useTranslations('Sprints');
  const { data: sprints, isLoading } = useSprintTimeline();

  if (isLoading) {
    return (
      <div className="text-center py-12" data-testid="sprints-timeline-view">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        <p className="mt-4 text-sm text-gray-500">{t('loading')}</p>
      </div>
    );
  }

  if (!sprints || sprints.length === 0) {
    return (
      <div className="rounded-md border border-border bg-white py-16 text-center" data-testid="sprints-timeline-view">
        <Milestone className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <h3 className="text-base font-medium text-gray-900">{t('timelineAllEmpty')}</h3>
        <p className="mt-1 text-sm text-gray-500">{t('timelineAllEmptyDesc')}</p>
      </div>
    );
  }

  return (
    <div className="relative" data-testid="sprints-timeline-view">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {sprints.map((sprint) => {
          const isActive = isSprintExecutionPhase(sprint.status);
          const isCompleted = sprint.status === 'completed';

          // Calculate inline stats from snapshot
          const total = sprint.snapshot?.total_tasks ?? 0;
          const completed = sprint.snapshot?.completed_tasks ?? 0;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

          return (
            <div key={sprint.id} className="relative pl-10" data-testid={`sprint-timeline-item-${sprint.id}`}>
              {/* Timeline dot — status-colored, active gets pulse */}
              <div className="absolute left-0 top-5">
                {isCompleted ? (
                  <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-organic-terracotta-light/30">
                    <CheckCircle2 className="h-4 w-4 text-organic-terracotta" />
                  </div>
                ) : isActive ? (
                  <div className="relative flex h-[30px] w-[30px] items-center justify-center">
                    <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20" />
                    <div className="h-4 w-4 rounded-full bg-blue-500 ring-4 ring-white" />
                  </div>
                ) : (
                  <div className="flex h-[30px] w-[30px] items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-gray-300 ring-4 ring-white" />
                  </div>
                )}
              </div>

              {/* Card with status-colored left border */}
              <div
                className={`rounded-md border bg-white ${
                  isActive
                    ? 'border-l-2 border-l-blue-500 border-border'
                    : isCompleted
                      ? 'border-l-2 border-l-organic-terracotta border-border'
                      : 'border-border'
                }`}
              >
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/sprints/${sprint.id}`}
                          className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline"
                        >
                          {sprint.name}
                        </Link>
                        {isActive && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                            {t('timelineCurrent')}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {formatSprintDate(sprint.start_at)} - {formatSprintDate(sprint.end_at)}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        isCompleted
                          ? 'bg-gray-100 text-gray-600'
                          : isActive
                            ? 'bg-organic-terracotta-light/30 text-organic-terracotta-hover'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {t(`status.${sprint.status ?? 'planning'}`)}
                    </span>
                  </div>

                  {sprint.goal && (
                    <p className="mt-1.5 text-xs italic text-gray-500">{sprint.goal}</p>
                  )}

                  {/* Mini progress bar + stats */}
                  {total > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-cta transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {total} tasks · {pct}%
                        </span>
                      </div>
                    </div>
                  )}

                  {sprint.settlement_blocked_reason && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{t('settlementBlocked', { reason: sprint.settlement_blocked_reason })}</span>
                    </div>
                  )}

                  {sprint.snapshot && !total && <SprintSnapshotCard snapshot={sprint.snapshot} compact />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
