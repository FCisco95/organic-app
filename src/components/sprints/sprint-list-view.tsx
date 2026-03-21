'use client';

import { Calendar, Milestone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Sprint, SprintStats } from '@/features/sprints';

type SprintListViewProps = {
  activeSprint: Sprint | undefined;
  planningSprints: Sprint[];
  pastSprints: Sprint[];
  sprintStats: SprintStats;
  formatDate: (dateString: string) => string;
  getDuration: (startDate: string, endDate: string) => string;
  getCompletionPercent: (stats: SprintStats[string]) => number;
};

export function SprintListView({
  activeSprint,
  planningSprints,
  pastSprints,
  sprintStats,
  formatDate,
  getDuration,
  getCompletionPercent,
}: SprintListViewProps) {
  const t = useTranslations('Sprints');

  const allSprints = [
    ...(activeSprint ? [activeSprint] : []),
    ...planningSprints,
    ...pastSprints,
  ];

  const renderMilestoneCard = (sprint: Sprint) => {
    const stats = sprintStats[sprint.id] || {
      total: 0,
      completed: 0,
      inProgress: 0,
      points: 0,
      totalPoints: 0,
    };
    const percent = getCompletionPercent(stats);
    const isOpen = sprint.status !== 'completed';
    const openCount = stats.total - stats.completed;
    const closedCount = stats.completed;

    return (
      <div
        key={sprint.id}
        data-testid={`sprint-list-${sprint.status === 'completed' ? 'completed' : sprint.status === 'planning' ? 'planning' : 'active'}-${sprint.id}`}
        className="border-b border-gray-200 last:border-b-0"
      >
        <div className="px-5 py-4">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <Milestone className="h-4 w-4 shrink-0 text-gray-400" />
                <Link
                  href={`/sprints/${sprint.id}`}
                  className="text-base font-semibold text-gray-900 hover:text-blue-600 hover:underline"
                >
                  {sprint.name}
                </Link>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                    isOpen
                      ? 'border-orange-300 bg-orange-50 text-orange-700'
                      : 'border-gray-300 bg-gray-50 text-gray-600'
                  }`}
                >
                  {isOpen ? t('milestoneOpen') : t('milestoneClosed')}
                </span>
              </div>

              {sprint.goal && (
                <p className="mt-1 ml-6.5 text-sm italic text-gray-500">{sprint.goal}</p>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(sprint.end_at)}</span>
            </div>
          </div>

          {/* Chunky progress bar */}
          <div className="mt-3 ml-6.5">
            <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-organic-orange transition-all"
                style={{ width: `${percent}%` }}
              />
              {percent > 20 && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-difference">
                  {percent}%
                </span>
              )}
            </div>

            {/* Stats row: GitHub milestone style */}
            <div className="mt-1.5 flex items-center gap-4 text-xs text-gray-500">
              <span>{t('milestoneOpenCount', { count: openCount })}</span>
              <span>{t('milestoneClosedCount', { count: closedCount })}</span>
              <span className="text-gray-400">
                {formatDate(sprint.start_at)} - {formatDate(sprint.end_at)} · {getDuration(sprint.start_at, sprint.end_at)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div data-testid="sprints-list-view">
      {allSprints.length === 0 ? (
        <div className="rounded-md border border-gray-200 bg-white py-16 text-center">
          <Milestone className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm text-gray-500">{t('noActiveSprint')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          {allSprints.map(renderMilestoneCard)}
        </div>
      )}
    </div>
  );
}
