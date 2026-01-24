'use client';

import { Calendar, CheckCircle2, Clock, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Sprint, SprintStats } from '@/features/tasks';

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

  return (
    <>
      {activeSprint ? (
        (() => {
          const stats = sprintStats[activeSprint.id] || {
            total: 0,
            completed: 0,
            inProgress: 0,
            points: 0,
            totalPoints: 0,
          };
          const progress =
            stats.totalPoints > 0
              ? Math.round((stats.points / stats.totalPoints) * 100)
              : stats.total > 0
                ? Math.round((stats.completed / stats.total) * 100)
                : 0;

          return (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('activeSprint')}</h2>
              <Link
                href={`/sprints/${activeSprint.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all group"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        <Target className="w-3 h-3" />
                        {t('status.active')}
                      </span>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 group-hover:text-organic-orange transition-colors mb-2">
                      {activeSprint.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDate(activeSprint.start_at)} - {formatDate(activeSprint.end_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{getDuration(activeSprint.start_at, activeSprint.end_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {t('pointsProgress', {
                          done: stats.points,
                          total: stats.totalPoints,
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t('completionPercent', { percent: progress })}
                      </div>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-organic-orange transition-all"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                      <div className="text-xs text-gray-500">{t('totalTasks')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                      <div className="text-xs text-gray-500">{t('completed')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                      <div className="text-xs text-gray-500">{t('inProgress')}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <span className="inline-flex items-center gap-2 text-organic-orange font-medium group-hover:gap-3 transition-all">
                    {t('viewDetails')}
                    <Target className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            </div>
          );
        })()
      ) : (
        <div className="mb-8 text-center py-10 bg-white rounded-xl border border-gray-200">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('noActiveSprint')}</p>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('upcomingSprints')}</h2>
        {planningSprints.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('noUpcomingSprints')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {planningSprints.map((sprint) => {
              const stats = sprintStats[sprint.id] || {
                total: 0,
                completed: 0,
                inProgress: 0,
                points: 0,
                totalPoints: 0,
              };
              const percent = getCompletionPercent(stats);

              return (
                <Link
                  key={sprint.id}
                  href={`/sprints/${sprint.id}`}
                  className="block bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-organic-orange transition-colors mb-1">
                        {sprint.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {formatDate(sprint.start_at)} - {formatDate(sprint.end_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{getDuration(sprint.start_at, sprint.end_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {t('pointsProgress', {
                            done: stats.points,
                            total: stats.totalPoints,
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t('completionPercent', { percent })}
                        </div>
                      </div>
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('pastSprints')}</h2>
        {pastSprints.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('noPastSprints')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastSprints.map((sprint) => {
              const stats = sprintStats[sprint.id] || {
                total: 0,
                completed: 0,
                inProgress: 0,
                points: 0,
                totalPoints: 0,
              };
              const percent = getCompletionPercent(stats);

              return (
                <Link
                  key={sprint.id}
                  href={`/sprints/${sprint.id}`}
                  className="block bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-organic-orange transition-colors mb-1">
                        {sprint.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {formatDate(sprint.start_at)} - {formatDate(sprint.end_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{getDuration(sprint.start_at, sprint.end_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {t('pointsProgress', {
                            done: stats.points,
                            total: stats.totalPoints,
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t('completionPercent', { percent })}
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
