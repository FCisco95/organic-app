'use client';

import { Plus, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { TaskBoard, TaskBoardTask, TaskStatus } from '@/components/tasks/task-board';
import type { Sprint } from '@/features/tasks';

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
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">{t('noActiveOrUpcoming')}</p>
        {canCreateSprint && (
          <button
            onClick={onOpenCreate}
            className="mt-4 inline-flex items-center gap-2 bg-organic-orange hover:bg-orange-600 text-white px-5 py-2 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('createSprint')}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('assignToSprint')}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedSprintId ?? ''}
              onChange={(event) => onSelectSprintId(event.target.value)}
              className="min-w-[220px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-organic-orange focus:ring-2 focus:ring-organic-orange"
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
            {selectedSprint.status === 'planning' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                {t('planningMode')}
              </span>
            )}
          </div>
        </div>
        {canCreateSprint && planningSprints.length === 0 && !activeSprint && (
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 rounded-lg border border-organic-orange px-4 py-2 text-sm font-medium text-organic-orange hover:bg-orange-50"
          >
            <Plus className="h-4 w-4" />
            {t('createSprint')}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{t('selectedSprint')}</p>
          <h2 className="text-xl font-semibold text-gray-900">{selectedSprint.name}</h2>
          <div className="text-sm text-gray-500">
            {formatDate(selectedSprint.start_at)} - {formatDate(selectedSprint.end_at)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {selectedSprint.capacity_points != null
              ? t('capacityValue', {
                  used: currentSprintPoints,
                  capacity: selectedSprint.capacity_points,
                })
              : t('capacityUncapped', { used: currentSprintPoints })}
          </div>
          {selectedSprint.capacity_points != null && (
            <div className="mt-2 h-2 w-full max-w-xs rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-organic-orange"
                style={{
                  width: `${getCapacityPercent(
                    currentSprintPoints,
                    selectedSprint.capacity_points
                  )}%`,
                }}
              ></div>
            </div>
          )}
        </div>
        <Link
          href={`/sprints/${selectedSprint.id}`}
          className="inline-flex items-center gap-2 text-organic-orange font-medium hover:text-orange-600"
        >
          {t('viewDetails')}
          <Target className="w-4 h-4" />
        </Link>
      </div>

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

      <div
        className="mt-8 bg-white rounded-xl border border-gray-200"
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
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{tTasks('column.backlog')}</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {tTasks('listCount', { count: backlogTasks.length })}
            </span>
            {canAssignToSprint && (
              <button
                onClick={onMoveSelected}
                disabled={selectedBacklogIds.length === 0 || isMoving}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-organic-orange text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {isMoving ? t('movingToSprint') : t('moveToSprint')}
              </button>
            )}
          </div>
        </div>
        {canAssignToSprint && (
          <p className="px-6 pt-4 text-xs text-gray-500">{t('planningBacklogHint')}</p>
        )}

        {tasksLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        ) : backlogTasks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">{tTasks('noTasksInView')}</div>
        ) : (
          <div
            className="divide-y divide-gray-100"
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
                  className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                    canAssignToSprint ? 'cursor-move' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {canAssignToSprint && (
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-organic-orange focus:ring-organic-orange"
                        checked={selectedBacklogIds.includes(task.id)}
                        onChange={(event) => onToggleBacklogSelect(task.id, event.target.checked)}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="font-medium text-gray-900 hover:text-organic-orange transition-colors"
                        >
                          {task.title}
                        </Link>
                        {task.priority && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-700 border-gray-300">
                            {tTasks(`priority.${task.priority}`)}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center flex-wrap gap-4 text-xs text-gray-500">
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
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                        <span>💬 {activity.comments}</span>
                        <span>📤 {activity.submissions}</span>
                        <span>👥 {activity.contributors}</span>
                      </div>
                    </div>
                    {task.points && (
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                        {tTasks('pointsShort', { points: task.points })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
