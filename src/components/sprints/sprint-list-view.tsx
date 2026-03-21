'use client';

import { Calendar, CheckCircle2, Clock, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { type Sprint, type SprintStats } from '@/features/sprints';

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

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'planning':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'review':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'dispute_window':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'settlement':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'completed':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  const renderMilestoneCard = (sprint: Sprint, isActive: boolean) => {
    const stats = sprintStats[sprint.id] || {
      total: 0,
      completed: 0,
      inProgress: 0,
      points: 0,
      totalPoints: 0,
    };
    const percent = getCompletionPercent(stats);
    const isCompleted = sprint.status === 'completed';
    const openCount = stats.total - stats.completed;

    return (
      <Link
        key={sprint.id}
        href={`/sprints/${sprint.id}`}
        data-testid={`sprint-list-${isActive ? 'active' : isCompleted ? 'completed' : 'planning'}-${sprint.id}`}
        className={`block rounded-lg border bg-white p-5 transition-all hover:shadow-md group ${
          isActive
            ? 'border-l-4 border-l-green-500 border-t border-r border-b border-t-gray-200 border-r-gray-200 border-b-gray-200'
            : isCompleted
              ? 'border-gray-200 opacity-75 hover:opacity-100'
              : 'border-gray-200'
        }`}
      >
        {/* Name + status badge row */}
        <div className="flex items-center gap-2 mb-3">
          <h3
            className={`text-lg font-semibold group-hover:underline transition-colors ${
              isCompleted ? 'text-gray-500' : 'text-gray-900 group-hover:text-organic-orange'
            }`}
          >
            {sprint.name}
          </h3>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(sprint.status)}`}
          >
            {isActive
              ? t('status.active')
              : isCompleted
                ? t('status.completed')
                : t(`status.${sprint.status ?? 'planning'}`)}
          </span>
        </div>

        {/* Chunky progress bar */}
        <div className="relative mb-3">
          <div className="h-3.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isCompleted ? 'bg-gray-400' : 'bg-green-500'
              }`}
              style={{ width: `${Math.max(percent, 2)}%` }}
            />
          </div>
          {percent > 20 && (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-sm">
              {percent}%
            </span>
          )}
          {percent <= 20 && (
            <span className="ml-2 text-xs font-medium text-gray-500 absolute right-0 top-0 leading-[14px]">
              {percent}%
            </span>
          )}
        </div>

        {/* Stats line: "X open · Y closed" */}
        <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
          <span>{t('milestoneOpen', { open: openCount })}</span>
          <span className="text-gray-300">&#183;</span>
          <span>{t('milestoneClosed', { closed: stats.completed })}</span>
        </div>

        {/* Date info */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {formatDate(sprint.start_at)} — {formatDate(sprint.end_at)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{getDuration(sprint.start_at, sprint.end_at)}</span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-8" data-testid="sprints-list-view">
      {/* Active sprint */}
      {activeSprint ? (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('activeSprint')}</h2>
          {renderMilestoneCard(activeSprint, true)}
        </div>
      ) : (
        <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('noActiveSprint')}</p>
        </div>
      )}

      {/* Upcoming sprints */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('upcomingSprints')}</h2>
        {planningSprints.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('noUpcomingSprints')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {planningSprints.map((sprint) => renderMilestoneCard(sprint, false))}
          </div>
        )}
      </div>

      {/* Past sprints */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('pastSprints')}</h2>
        {pastSprints.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('noPastSprints')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastSprints.map((sprint) => renderMilestoneCard(sprint, false))}
          </div>
        )}
      </div>
    </div>
  );
}
