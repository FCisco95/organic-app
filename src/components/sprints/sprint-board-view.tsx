'use client';

import { AlertTriangle, ChevronDown, GitBranch, Plus, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { TaskBoard, TaskBoardTask, TaskStatus } from '@/components/tasks/task-board';
import type { Sprint } from '@/features/sprints';

type ActivityCounts = Record<
  string,
  { comments: number; submissions: number; contributors: number }
>;

type SprintBoardViewProps = {
  selectedSprint: Sprint | null;
  selectedSprintId: string | null;
  activeSprint: Sprint | undefined;
  planningSprints: Sprint[];
  canCreateSprint: boolean;
  canAssignToSprint: boolean;
  boardTasks: TaskBoardTask[];
  backlogTasks: TaskBoardTask[];
  tasksLoading: boolean;
  selectedBacklogIds: string[];
  isMoving: boolean;
  currentSprintPoints: number;
  activityCounts: ActivityCounts;
  onSelectSprintId: (id: string) => void;
  onOpenCreate: () => void;
  onMoveSelected: () => void;
  onToggleBacklogSelect: (taskId: string, checked: boolean) => void;
  onDropToSprint: (taskId: string) => void;
  onDropToBacklog: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  getCapacityPercent: (used: number, capacity: number | null) => number;
  formatDate: (dateString: string) => string;
};

export function SprintBoardView({
  selectedSprint,
  selectedSprintId,
  activeSprint,
  planningSprints,
  canCreateSprint,
  canAssignToSprint,
  boardTasks,
  backlogTasks,
  tasksLoading,
  selectedBacklogIds,
  isMoving,
  currentSprintPoints,
  activityCounts,
  onSelectSprintId,
  onOpenCreate,
  onMoveSelected,
  onToggleBacklogSelect,
  onDropToSprint,
  onDropToBacklog,
  onStatusChange,
  getCapacityPercent,
  formatDate,
}: SprintBoardViewProps) {
  const t = useTranslations('Sprints');
  const tTasks = useTranslations('Tasks');

  if (!selectedSprint) {
    return (
      <div className="rounded-md border border-gray-200 bg-white py-16 text-center" data-testid="sprints-board-view">
        <GitBranch className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p className="text-sm text-gray-500">{t('noActiveOrUpcoming')}</p>
        {canCreateSprint && (
          <button
            onClick={onOpenCreate}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-organic-orange bg-organic-orange px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('createSprint')}
          </button>
        )}
      </div>
    );
  }

  const getDuration = () => {
    const start = new Date(selectedSprint.start_at);
    const end = new Date(selectedSprint.end_at);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${days}d`;
  };

  return (
    <div className="space-y-4" data-testid="sprints-board-view">
      {/* GitHub-style repo header: branch selector + sprint info */}
      <div
        className="rounded-md border border-gray-200 bg-white"
        data-testid="sprints-board-context"
      >
        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Branch-style sprint selector */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex items-center">
                <GitBranch className="mr-1.5 h-4 w-4 text-gray-500" />
                <select
                  value={selectedSprintId ?? ''}
                  onChange={(event) => onSelectSprintId(event.target.value)}
                  data-testid="sprints-board-sprint-select"
                  className="min-w-[180px] appearance-none rounded-md border border-gray-300 bg-gray-50 py-1 pl-2 pr-7 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {activeSprint && (
                    <option value={activeSprint.id}>
                      {t('activeSprintOption', { name: activeSprint.name })}
                    </option>
                  )}
                  {planningSprints.length > 0 && (
                    <optgroup label={t('planningSprintGroup')}>
                      {planningSprints.map((sprint) => (
                        <option key={sprint.id} value={sprint.id}>
                          {sprint.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <span
              data-testid={`sprints-board-status-chip-${selectedSprint.status ?? 'planning'}`}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                selectedSprint.status === 'planning'
                  ? 'bg-blue-100 text-blue-700'
                  : selectedSprint.status === 'active'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-700'
              }`}
            >
              {t(`status.${selectedSprint.status ?? 'planning'}`)}
            </span>
          </div>

          {canCreateSprint && planningSprints.length === 0 && !activeSprint && (
            <button
              onClick={onOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('createSprint')}
            </button>
          )}
        </div>

        {/* Sprint metadata row */}
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/sprints/${selectedSprint.id}`}
              className="text-base font-semibold text-gray-900 hover:underline"
            >
              {selectedSprint.name}
            </Link>
            <span className="text-sm text-gray-500">
              {formatDate(selectedSprint.start_at)} - {formatDate(selectedSprint.end_at)} · {getDuration()}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>
              {selectedSprint.capacity_points != null
                ? t('capacityValue', {
                    used: currentSprintPoints,
                    capacity: selectedSprint.capacity_points,
                  })
                : t('capacityUncapped', { used: currentSprintPoints })}
            </span>
            {selectedSprint.capacity_points != null && (
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-organic-orange transition-all"
                  style={{
                    width: `${Math.min(getCapacityPercent(currentSprintPoints, selectedSprint.capacity_points), 100)}%`,
                  }}
                />
              </div>
            )}
            <Link
              href={`/sprints/${selectedSprint.id}`}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              {t('viewDetails')}
            </Link>
          </div>
        </div>

        {/* Settlement status banner */}
        <div
          className={`flex items-center gap-2 border-t px-4 py-2 text-xs ${
            selectedSprint.settlement_blocked_reason
              ? 'border-l-2 border-l-red-500 bg-red-50 text-red-700'
              : 'text-gray-500'
          }`}
          data-testid="sprints-board-settlement-panel"
        >
          {selectedSprint.settlement_blocked_reason ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          )}
          <span>
            {selectedSprint.settlement_blocked_reason
              ? t('settlementPanelBlocked', { reason: selectedSprint.settlement_blocked_reason })
              : t('settlementReady')}
          </span>
        </div>
      </div>

      {/* Board columns with horizontal scroll on mobile */}
      <div className="overflow-x-auto pb-2 snap-x snap-mandatory md:overflow-x-visible">
        <div className="min-w-[840px] md:min-w-0">
          <TaskBoard
            tasks={boardTasks}
            loading={tasksLoading}
            canManage={canAssignToSprint}
            onStatusChange={onStatusChange}
            onExternalDrop={onDropToSprint}
            moveTargets={['backlog', 'todo', 'in_progress', 'review', 'done']}
            activityCounts={activityCounts}
            excludeStatuses={['backlog']}
          />
        </div>
      </div>

      {/* Backlog — GitHub-style collapsible section */}
      <details
        open
        className="group rounded-md border border-gray-200 bg-white"
        data-testid="sprints-backlog-surface"
        onDragOver={(event) => {
          if (!canAssignToSprint) return;
          event.preventDefault();
        }}
        onDrop={(event) => {
          if (!canAssignToSprint) return;
          const taskId =
            event.dataTransfer.getData('text/task-id') || event.dataTransfer.getData('text/plain');
          if (taskId) {
            onDropToBacklog(taskId);
          }
        }}
      >
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 select-none">
          <div className="flex items-center gap-2">
            <ChevronDown className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-0 -rotate-90" />
            <h3 className="text-sm font-semibold text-gray-900">{tTasks('column.backlog')}</h3>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {backlogTasks.length}
            </span>
          </div>
          {canAssignToSprint && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onMoveSelected();
              }}
              disabled={selectedBacklogIds.length === 0 || isMoving}
              className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
            >
              {isMoving ? t('movingToSprint') : t('moveToSprint')}
            </button>
          )}
        </summary>

        {canAssignToSprint && (
          <p className="border-t border-gray-100 px-4 pt-2 text-xs text-gray-500">{t('planningBacklogHint')}</p>
        )}

        {tasksLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-gray-100"></div>
            ))}
          </div>
        ) : backlogTasks.length === 0 ? (
          <div className="border-t border-gray-100 px-4 py-8 text-center text-sm text-gray-500">{tTasks('noTasksInView')}</div>
        ) : (
          <div
            className="divide-y divide-gray-100 border-t border-gray-100"
            onDragOver={(event) => {
              if (!canAssignToSprint) return;
              event.preventDefault();
            }}
            onDrop={(event) => {
              if (!canAssignToSprint) return;
              const taskId =
                event.dataTransfer.getData('text/task-id') ||
                event.dataTransfer.getData('text/plain');
              if (taskId) {
                onDropToBacklog(taskId);
              }
            }}
          >
            {backlogTasks.map((task) => {
              const isOverdue =
                task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
              const activity = activityCounts[task.id] ?? {
                comments: 0,
                submissions: 0,
                contributors: 0,
              };

              return (
                <div
                  key={task.id}
                  draggable={canAssignToSprint}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/task-id', task.id);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                    canAssignToSprint ? 'cursor-move' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {canAssignToSprint && (
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedBacklogIds.includes(task.id)}
                        onChange={(event) => onToggleBacklogSelect(task.id, event.target.checked)}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline"
                        >
                          {task.title}
                        </Link>
                        {task.priority && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            task.priority === 'high'
                              ? 'bg-red-100 text-red-700'
                              : task.priority === 'medium'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}>
                            {tTasks(`priority.${task.priority}`)}
                          </span>
                        )}
                        {task.points && (
                          <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            {tTasks('pointsShort', { points: task.points })}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        {task.assignee && (
                          <span>
                            {task.assignee.organic_id
                              ? tTasks('assigneeId', { id: task.assignee.organic_id })
                              : task.assignee.email}
                          </span>
                        )}
                        {task.due_date && (
                          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {tTasks('dueLabel', {
                              date: new Date(task.due_date).toLocaleDateString(),
                            })}
                            {isOverdue && ` (${tTasks('overdue')})`}
                          </span>
                        )}
                        {activity.comments > 0 && <span>{activity.comments} comments</span>}
                        {activity.submissions > 0 && <span>{activity.submissions} submissions</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </details>
    </div>
  );
}
