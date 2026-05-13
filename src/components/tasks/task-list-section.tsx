'use client';

import { FilterX, Heart, MessageSquare, Upload, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { type Sprint, type TaskListItem, type TaskTab, type TaskStatus } from '@/features/tasks';

const STATUS_TEXT_COLOR: Record<TaskStatus, string> = {
  backlog: 'text-muted-foreground',
  todo: 'text-violet-600',
  in_progress: 'text-amber-600',
  review: 'text-purple-600',
  done: 'text-emerald-600',
};

const PRIORITY_BORDER: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-amber-500',
  medium: 'border-l-blue-500',
  low: 'border-l-emerald-500',
};

type TaskListSectionProps = {
  activeView: TaskTab;
  sprintFilter: string;
  sprints: Sprint[];
  currentSprint: Sprint | undefined;
  loading: boolean;
  tasks: TaskListItem[];
  totalTasks: number;
  currentPage: number;
  totalPages: number;
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
  onPageChange: (page: number) => void;
  onResetFilters: () => void;
  userId: string | null;
};

export function TaskListSection({
  activeView,
  sprintFilter,
  sprints,
  currentSprint,
  loading,
  tasks,
  totalTasks,
  currentPage,
  totalPages,
  hasActiveFilters,
  canLike,
  likedTasks,
  likeCounts,
  getAssigneeLabel,
  getActivityCounts,
  onToggleLike,
  onPageChange,
  onResetFilters,
}: TaskListSectionProps) {
  const t = useTranslations('Tasks');
  const locale = useLocale();
  const hasNoTasks = !loading && totalTasks === 0;

  return (
    <section className="rounded-xl border border-border bg-card" data-testid="task-list-section">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{t(`tab.${activeView}`)}</h2>
        {sprintFilter !== 'all' && (
          <p className="text-xs text-muted-foreground">
            {sprints.find((sprint) => sprint.id === sprintFilter)?.name ?? t('sprintUnknown')}
          </p>
        )}
        <span className="text-xs text-muted-foreground">{t('listCount', { count: totalTasks })}</span>
      </header>

      {loading ? (
        <div className="space-y-2 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[52px] animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : hasNoTasks ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="rounded-full bg-muted p-3">
            <FilterX className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {activeView === 'activeSprint' && !currentSprint
              ? t('emptyNoSprintTitle')
              : hasActiveFilters
                ? t('emptyFilteredTitle')
                : t('emptyNoTasksTitle')}
          </h3>
          <p className="max-w-md text-sm text-muted-foreground">
            {activeView === 'activeSprint' && !currentSprint
              ? t('emptyNoSprintDescription')
              : hasActiveFilters
                ? t('emptyFilteredDescription')
                : t('emptyNoTasksDescription')}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* Column headers — subtle */}
          <div className="hidden border-b border-border px-4 py-2 md:grid md:grid-cols-[minmax(0,3fr)_minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:gap-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('columnTask')}
            </p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground md:text-right">
              {t('columnPoints')}
            </p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground md:text-right">
              {t('columnActivity')}
            </p>
          </div>

          <div className="divide-y divide-border" data-testid="task-list">
            {tasks.map((task) => {
              const activity = getActivityCounts(task.id);
              const points = task.points ?? task.base_points ?? 0;
              const status = (task.status ?? 'backlog') as TaskStatus;
              const priorityBorder = task.priority
                ? PRIORITY_BORDER[task.priority] ?? 'border-l-transparent'
                : 'border-l-transparent';
              const statusColor = STATUS_TEXT_COLOR[status] ?? STATUS_TEXT_COLOR.backlog;

              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  data-testid={`task-card-${task.id}`}
                  className={`block border-l-[3px] ${priorityBorder} px-4 py-2.5 transition-all hover:-translate-y-[1px] hover:shadow-sm hover:bg-muted/30`}
                >
                  <div className="grid gap-2 md:grid-cols-[minmax(0,3fr)_minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:gap-4">
                    {/* Task info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">{task.title}</h3>
                        <span
                          className={`shrink-0 text-[11px] font-medium ${statusColor}`}
                          data-testid={`task-status-lane-${task.id}`}
                        >
                          {t(`statusLane.${status}`)}
                        </span>
                      </div>
                      {/* Compact metadata line */}
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {task.assignee ? getAssigneeLabel(task.assignee) : t('unassigned')}
                        {task.sprints?.name && (
                          <span> &middot; {task.sprints.name}</span>
                        )}
                        {task.due_date && (
                          <span
                            className={
                              task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
                                ? 'font-semibold text-destructive'
                                : ''
                            }
                          >
                            {' '}&middot; {new Date(task.due_date).toLocaleDateString(locale)}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Points column */}
                    <div className="md:text-right">
                      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {points} pts
                      </span>
                      {points > 0 && (
                        <span className="ml-1.5 inline-block rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                          +{points * 10} XP
                        </span>
                      )}
                    </div>

                    {/* Activity column — tight icons */}
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          onToggleLike(task.id);
                        }}
                        data-testid={`task-like-${task.id}`}
                        disabled={!canLike}
                        aria-label={likedTasks[task.id] ? t('likedTask') : t('likeTask')}
                        className={`inline-flex items-center gap-0.5 text-xs font-mono tabular-nums ${
                          likedTasks[task.id]
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        } ${canLike ? 'hover:text-primary' : 'cursor-default'}`}
                      >
                        <Heart className={`h-3 w-3 ${likedTasks[task.id] ? 'fill-current' : ''}`} />
                        {likeCounts[task.id] ?? 0}
                      </button>

                      <span className="inline-flex items-center gap-0.5 text-xs font-mono tabular-nums text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {activity.comments}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-xs font-mono tabular-nums text-muted-foreground">
                        <Upload className="h-3 w-3" />
                        {activity.submissions}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-xs font-mono tabular-nums text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {activity.contributors}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {t('pageStatus', { page: currentPage, total: totalPages })}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="rounded-lg border border-input px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('previousPage')}
            </button>
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="rounded-lg border border-input px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('nextPage')}
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}
