'use client';

import { useState } from 'react';
import type { DragEvent } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle, Clock, Edit2, MoreVertical, Tag, User } from 'lucide-react';

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TaskBoardTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  points: number | null;
  assignee_id: string | null;
  sprint_id: string | null;
  proposal_id: string | null;
  due_date: string | null;
  labels: string[] | null;
  created_at: string;
  completed_at: string | null;
  assignee?: {
    organic_id: number | null;
    email: string;
  } | null;
  sprints?: {
    name: string;
  } | null;
};

const COLUMNS: { id: TaskStatus; color: string }[] = [
  { id: 'backlog', color: 'bg-gray-100 border-gray-300' },
  { id: 'todo', color: 'bg-blue-50 border-blue-300' },
  { id: 'in_progress', color: 'bg-orange-50 border-orange-300' },
  { id: 'review', color: 'bg-purple-50 border-purple-300' },
  { id: 'done', color: 'bg-green-50 border-green-300' },
];

export function TaskBoard({
  tasks,
  loading,
  canManage,
  onStatusChange,
  onExternalDrop,
  moveTargets,
  activityCounts,
  excludeStatuses = [],
}: {
  tasks: TaskBoardTask[];
  loading: boolean;
  canManage?: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onExternalDrop?: (taskId: string, status: TaskStatus) => void;
  moveTargets?: TaskStatus[];
  activityCounts?: Record<string, { comments: number; submissions: number; contributors: number }>;
  excludeStatuses?: TaskStatus[];
}) {
  const t = useTranslations('Tasks');
  const [draggedTask, setDraggedTask] = useState<TaskBoardTask | null>(null);
  const visibleColumns = COLUMNS.filter((column) => !excludeStatuses.includes(column.id));
  const availableStatuses = moveTargets ?? visibleColumns.map((column) => column.id);
  const gridClass =
    visibleColumns.length === 4
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5';

  const handleDragStart = (task: TaskBoardTask, event: DragEvent) => {
    setDraggedTask(task);
    event.dataTransfer.setData('text/task-id', task.id);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: TaskStatus, event: DragEvent) => {
    if (draggedTask && draggedTask.status !== status) {
      onStatusChange(draggedTask.id, status);
      setDraggedTask(null);
      return;
    }
    if (!draggedTask && onExternalDrop) {
      const taskId =
        event.dataTransfer.getData('text/task-id') ||
        event.dataTransfer.getData('text/plain');
      if (taskId) {
        onExternalDrop(taskId, status);
      }
    }
    setDraggedTask(null);
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  if (loading) {
    return (
      <div className={`grid ${gridClass} gap-4`}>
        {visibleColumns.map((col) => (
          <div key={col.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {visibleColumns.map((column) => {
        const columnTasks = getTasksByStatus(column.id);
        const isDropTarget = draggedTask && draggedTask.status !== column.id;
        return (
          <div
            key={column.id}
            className={`rounded-lg border-2 p-4 ${column.color} min-h-[500px] transition-all ${
              isDropTarget ? 'ring-2 ring-organic-orange ring-offset-2 scale-[1.02]' : ''
            }`}
            onDragOver={handleDragOver}
            onDrop={(event) => handleDrop(column.id, event)}
          >
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                {t(`column.${column.id}`)}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {t('columnCount', { count: columnTasks.length })}
              </p>
            </div>

            <div className="space-y-3">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={onStatusChange}
                  onDragStart={handleDragStart}
                  canManage={canManage}
                  isDragging={draggedTask?.id === task.id}
                  availableStatuses={availableStatuses}
                  activityCounts={activityCounts?.[task.id]}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  onStatusChange,
  onDragStart,
  canManage,
  isDragging,
  availableStatuses,
  activityCounts,
}: {
  task: TaskBoardTask;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDragStart: (task: TaskBoardTask, event: DragEvent) => void;
  canManage?: boolean;
  isDragging: boolean;
  availableStatuses: TaskStatus[];
  activityCounts?: { comments: number; submissions: number; contributors: number };
}) {
  const router = useRouter();
  const t = useTranslations('Tasks');
  const [showActions, setShowActions] = useState(false);

  const getPriorityColor = (priority: TaskPriority | null) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const activity = activityCounts ?? { comments: 0, submissions: 0, contributors: 0 };

  return (
    <div
      draggable={canManage}
      onDragStart={(event) => onDragStart(task, event)}
      className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all group relative ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${canManage ? 'cursor-move' : ''}`}
    >
      <Link href={`/tasks/${task.id}`} className="block p-3">
        {task.priority && (
          <div className="mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}
            >
              <AlertCircle className="w-3 h-3" />
              {t(`priority.${task.priority}`)}
            </span>
          </div>
        )}

        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1 group-hover:text-organic-orange transition-colors">
            {task.title}
          </h4>
        </div>

        {task.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
        )}

        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.labels.map((label, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs"
              >
                <Tag className="w-3 h-3" />
                {label}
              </span>
            ))}
          </div>
        )}

        {task.due_date && (
          <div
            className={`flex items-center gap-1 mb-2 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}
          >
            <Clock className="w-3 h-3" />
            {t('dueLabel', { date: new Date(task.due_date).toLocaleDateString() })}
            {isOverdue && ` (${t('overdue')})`}
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {task.points && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-medium">
                {t('pointsShort', { points: task.points })}
              </span>
            )}
            {task.sprints && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {task.sprints.name}
              </span>
            )}
          </div>
          {task.assignee && (
            <div className="flex items-center gap-1 text-gray-500">
              <User className="w-3 h-3" />
              <span className="text-xs">
                {task.assignee.organic_id
                  ? t('assigneeId', { id: task.assignee.organic_id })
                  : task.assignee.email.split('@')[0]}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
          <span>💬 {activity.comments}</span>
          <span>📤 {activity.submissions}</span>
          <span>👥 {activity.contributors}</span>
        </div>
      </Link>

      {canManage && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="text-gray-400 hover:text-gray-600 p-1 bg-white rounded hover:bg-gray-50"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showActions && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowActions(false);
                  router.push(`/tasks/${task.id}`);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
              >
                <Edit2 className="w-3.5 h-3.5" />
                {t('editTask')}
              </button>
              <div className="py-1">
                <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">
                  {t('moveTo')}
                </div>
                {availableStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onStatusChange(task.id, status);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {t(`column.${status}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
