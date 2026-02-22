'use client';

import { AlertCircle, CalendarClock, FilterX, Heart, MessageSquare, Tag, Upload, User, Users } from 'lucide-react';
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
          <div className="hidden border-b border-border bg-muted/40 px-6 py-2 md:grid md:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:gap-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('columnTask')}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-center">
              {t('columnStatus')}
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
              const statusClassName =
                task.status === 'done'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                  : task.status === 'review'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                    : task.status === 'in_progress'
                      ? 'border-blue-500/25 bg-blue-500/10 text-blue-600'
                      : 'border-border bg-muted text-muted-foreground';

              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  data-testid={`task-card-${task.id}`}
                  className="block px-4 py-4 transition-colors hover:bg-muted/40 sm:px-6"
                >
                  <div className="grid gap-3 md:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:gap-4">
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
                            {labels.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="md:text-center">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClassName}`}
                        data-testid={`task-status-lane-${task.id}`}
                      >
                        {t(`statusLane.${task.status ?? 'backlog'}`)}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground md:text-center">
                      {task.due_date ? (
                        <span
                          className={`inline-flex items-center gap-1 font-mono tabular-nums ${
                            isOverdue ? 'font-semibold text-destructive' : ''
                          }`}
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="font-mono text-muted-foreground/80">--</span>
                      )}
                    </div>

                    <div className="md:text-right">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {t('columnPoints')}
                      </p>
                      <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {points}
                      </p>
                    </div>

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
