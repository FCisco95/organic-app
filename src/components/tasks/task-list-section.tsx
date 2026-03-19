'use client';

import { AlertCircle, CalendarClock, FilterX, Heart, MessageSquare, Tag, Upload, User, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getLabelDisplay, type Sprint, type TaskListItem, type TaskTab, type TaskStatus } from '@/features/tasks';

const STATUS_PROGRESS: Record<TaskStatus, { percent: number; color: string }> = {
  backlog: { percent: 5, color: 'bg-gray-400' },
  todo: { percent: 25, color: 'bg-violet-500' },
  in_progress: { percent: 50, color: 'bg-primary' },
  review: { percent: 75, color: 'bg-amber-500' },
  done: { percent: 100, color: 'bg-emerald-500' },
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
  getPriorityColor,
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
    <section className="rounded-2xl border border-border bg-card" data-testid="task-list-section">
      <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t(`tab.${activeView}`)}</h2>
          {sprintFilter !== 'all' && (
            <p className="text-sm text-muted-foreground">
              {sprints.find((sprint) => sprint.id === sprintFilter)?.name ?? t('sprintUnknown')}
            </p>
          )}
        </div>
        <span className="text-sm text-muted-foreground">{t('listCount', { count: totalTasks })}</span>
      </header>

      {loading ? (
        <div className="space-y-3 p-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted"></div>
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
          {/* 4-column header: Task, Due, Points, Activity */}
          <div className="hidden border-b border-border bg-muted/40 px-6 py-2 md:grid md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:gap-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('columnTask')}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-center">
              {t('columnDue')}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-right">
              {t('columnPoints')}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-right">
              {t('columnActivity')}
            </p>
          </div>

          <div className="divide-y divide-border" data-testid="task-list">
            {tasks.map((task) => {
              const isOverdue =
                task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
              const activity = getActivityCounts(task.id);
              const points = task.points ?? task.base_points ?? 0;
              const labels = task.labels ?? [];
              const status = (task.status ?? 'backlog') as TaskStatus;
              const progress = STATUS_PROGRESS[status] ?? STATUS_PROGRESS.backlog;

              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  data-testid={`task-card-${task.id}`}
                  className="block border-l-4 border-l-transparent px-4 py-4 transition-colors hover:border-l-primary hover:bg-muted/40 sm:px-6"
                >
                  <div className="grid gap-3 md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:gap-4">
                    {/* Task info column */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">{task.title}</h3>
                        {task.priority && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${getPriorityColor(task.priority)}`}
                          >
                            <AlertCircle className="h-3 w-3" />
                            {t(`priority.${task.priority}`)}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {task.assignee && (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {getAssigneeLabel(task.assignee)}
                          </span>
                        )}
                        {task.sprints?.name && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {task.sprints.name}
                          </span>
                        )}
                        {labels.length > 0 && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <Tag className="h-3.5 w-3.5" />
                            {labels.slice(0, 2).map((l) => getLabelDisplay(l, t)).join(', ')}
                          </span>
                        )}
                      </div>

                      {/* Progress bar with status label */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${progress.color} transition-all`}
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                        <span
                          className="text-[11px] font-medium text-muted-foreground"
                          data-testid={`task-status-lane-${task.id}`}
                        >
                          {t(`statusLane.${status}`)}
                        </span>
                      </div>
                    </div>

                    {/* Due date column */}
                    <div className="text-xs text-muted-foreground md:text-center">
                      {task.due_date ? (
                        <span
                          className={`inline-flex items-center gap-1 font-mono tabular-nums ${
                            isOverdue ? 'font-semibold text-destructive' : ''
                          }`}
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                          {new Date(task.due_date).toLocaleDateString(locale)}
                        </span>
                      ) : (
                        <span className="font-mono text-muted-foreground/80">--</span>
                      )}
                    </div>

                    {/* Points column — emphasized */}
                    <div className="md:text-right">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t('columnPoints')}
                      </p>
                      <p className="font-mono text-base font-semibold tabular-nums text-primary">
                        {points}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">pts</span>
                      </p>
                      {points > 0 && (
                        <span className="inline-block mt-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          +{points * 10} XP
                        </span>
                      )}
                    </div>

                    {/* Activity column */}
                    <div className="flex flex-wrap items-center gap-3 md:justify-end">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          onToggleLike(task.id);
                        }}
                        data-testid={`task-like-${task.id}`}
                        disabled={!canLike}
                        aria-label={likedTasks[task.id] ? t('likedTask') : t('likeTask')}
                        className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium font-mono tabular-nums transition-colors ${
                          likedTasks[task.id]
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-input text-muted-foreground'
                        } ${canLike ? 'hover:bg-muted' : 'cursor-default'}`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${likedTasks[task.id] ? 'fill-current' : ''}`} />
                        {likeCounts[task.id] ?? 0}
                      </button>

                      <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {activity.comments}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-muted-foreground">
                        <Upload className="h-3.5 w-3.5" />
                        {activity.submissions}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
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
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
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
