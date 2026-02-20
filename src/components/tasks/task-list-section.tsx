'use client';

import Image from 'next/image';
import { AlertCircle, Clock, Heart, Tag, User, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Sprint, TaskListItem, TaskTab } from '@/features/tasks';

type TaskListSectionProps = {
  activeView: TaskTab;
  sprintFilter: string;
  sprints: Sprint[];
  currentSprint: Sprint | undefined;
  loading: boolean;
  tasks: TaskListItem[];
  hasActiveFilters: boolean;
  canLike: boolean;
  likedTasks: Record<string, boolean>;
  likeCounts: Record<string, number>;
  getPriorityColor: (priority: TaskListItem['priority']) => string;
  getAssigneeLabel: (assignee: TaskListItem['assignee']) => string;
  getActivityCounts: (taskId: string) => {
    comments: number;
    submissions: number;
    contributors: number;
  };
  onToggleLike: (taskId: string) => void;
};

export function TaskListSection({
  activeView,
  sprintFilter,
  sprints,
  currentSprint,
  loading,
  tasks,
  hasActiveFilters,
  canLike,
  likedTasks,
  likeCounts,
  getPriorityColor,
  getAssigneeLabel,
  getActivityCounts,
  onToggleLike,
}: TaskListSectionProps) {
  const t = useTranslations('Tasks');

  return (
    <div className="bg-white rounded-xl border border-gray-200" data-testid="task-list-section">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t(`tab.${activeView}`)}</h2>
          {sprintFilter !== 'all' && (
            <p className="text-sm text-gray-500">
              {sprints.find((sprint) => sprint.id === sprintFilter)?.name ?? t('sprintUnknown')}
            </p>
          )}
        </div>
        <span className="text-sm text-gray-500">{t('listCount', { count: tasks.length })}</span>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          {activeView === 'activeSprint' && !currentSprint
            ? t('noActiveSprint')
            : hasActiveFilters
              ? t('noTasksFiltered')
              : t('noTasksInView')}
        </div>
      ) : (
        <div className="divide-y divide-gray-100" data-testid="task-list">
          {tasks.map((task) => {
            const isOverdue =
              task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
            const activity = getActivityCounts(task.id);
            const participants = task.assignees ?? [];
            const visibleParticipants = participants.slice(0, 4);
            const overflowParticipants = Math.max(participants.length - visibleParticipants.length, 0);

            return (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                data-testid={`task-card-${task.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 hover:text-organic-orange transition-colors">
                        {task.title}
                      </h3>
                      {task.priority && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}
                        >
                          <AlertCircle className="w-3 h-3" />
                          {t(`priority.${task.priority}`)}
                        </span>
                      )}
                      {task.sprints && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {task.sprints.name}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center flex-wrap gap-4 text-xs text-gray-500">
                      {task.assignee && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{getAssigneeLabel(task.assignee)}</span>
                        </div>
                      )}
                      {task.due_date && (
                        <div
                          className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}
                        >
                          <Clock className="w-3 h-3" />
                          {t('dueLabel', { date: new Date(task.due_date).toLocaleDateString() })}
                          {isOverdue && ` (${t('overdue')})`}
                        </div>
                      )}
                      {task.labels && task.labels.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>{task.labels.join(', ')}</span>
                        </div>
                      )}
                      {participants.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          <div className="flex -space-x-2">
                            {visibleParticipants.map((assignment) => {
                              if (!assignment.user) return null;

                              const fallbackLabel = assignment.user.email || assignment.user.name || '';
                              const displayLabel = assignment.user.organic_id
                                ? t('assigneeId', { id: assignment.user.organic_id })
                                : fallbackLabel;

                              return assignment.user.avatar_url ? (
                                <Image
                                  key={assignment.id}
                                  src={assignment.user.avatar_url}
                                  alt={displayLabel}
                                  width={20}
                                  height={20}
                                  className="h-5 w-5 rounded-full border border-white object-cover"
                                />
                              ) : (
                                <span
                                  key={assignment.id}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-300 text-[10px] text-gray-700"
                                  title={displayLabel}
                                >
                                  {(displayLabel[0] ?? '?').toUpperCase()}
                                </span>
                              );
                            })}
                          </div>
                          {overflowParticipants > 0 && (
                            <span className="text-[11px] text-gray-500">+{overflowParticipants}</span>
                          )}
                          <span>{t('participantCount', { count: participants.length })}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>💬 {activity.comments}</span>
                      <span>📤 {activity.submissions}</span>
                      <span>👥 {activity.contributors}</span>
                    </div>
                  </div>
                    <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600"
                      data-testid={`task-status-lane-${task.id}`}
                    >
                      {t(`statusLane.${task.status ?? 'backlog'}`)}
                    </span>
                    {task.points && (
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                        {t('pointsShort', { points: task.points })}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        onToggleLike(task.id);
                      }}
                      data-testid={`task-like-${task.id}`}
                      disabled={!canLike}
                      aria-label={likedTasks[task.id] ? t('likedTask') : t('likeTask')}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${
                        likedTasks[task.id]
                          ? 'border-organic-orange text-organic-orange bg-orange-50'
                          : 'border-gray-200 text-gray-500 bg-white'
                      } ${canLike ? 'hover:border-organic-orange hover:text-organic-orange' : 'cursor-default'}`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          likedTasks[task.id] ? 'fill-organic-orange' : ''
                        }`}
                      />
                      {likeCounts[task.id] ?? 0}
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
