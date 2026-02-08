'use client';

import { useState } from 'react';
import { Plus, CheckCircle2, Circle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubtasks, useCreateSubtask, TaskWithRelations } from '@/features/tasks';
import toast from 'react-hot-toast';

interface SubtaskListProps {
  parentTaskId: string;
  className?: string;
}

export function SubtaskList({ parentTaskId, className }: SubtaskListProps) {
  const { data: subtasks, isLoading } = useSubtasks(parentTaskId);
  const createSubtask = useCreateSubtask();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const total = subtasks?.length ?? 0;
  const completed = subtasks?.filter((t) => t.status === 'done').length ?? 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleAdd = async () => {
    if (!newTitle.trim()) return;

    try {
      await createSubtask.mutateAsync({
        parentTaskId,
        input: { title: newTitle.trim() },
      });
      setNewTitle('');
      setIsAdding(false);
      toast.success('Subtask created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create subtask');
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          Subtasks
          {total > 0 && (
            <span className="text-xs text-gray-500">
              ({completed}/{total})
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setIsAdding(true);
            setIsExpanded(true);
          }}
          className="flex items-center gap-1 text-xs text-organic-orange hover:text-orange-600 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Subtask list */}
      {isExpanded && (
        <div className="space-y-1">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : (
            subtasks?.map((subtask) => (
              <SubtaskItem key={subtask.id} subtask={subtask} />
            ))
          )}

          {/* Inline add form */}
          {isAdding && (
            <div className="flex items-center gap-2 py-1">
              <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewTitle('');
                  }
                }}
                placeholder="New subtask title..."
                className="flex-1 text-sm bg-transparent border-b border-gray-300 focus:border-organic-orange outline-none py-1"
                autoFocus
              />
              <button
                onClick={handleAdd}
                disabled={createSubtask.isPending || !newTitle.trim()}
                className="text-xs text-organic-orange hover:text-orange-600 font-medium disabled:opacity-50"
              >
                {createSubtask.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Save'
                )}
              </button>
            </div>
          )}

          {!isLoading && total === 0 && !isAdding && (
            <p className="text-xs text-gray-400 py-1">No subtasks yet</p>
          )}
        </div>
      )}
    </div>
  );
}

function SubtaskItem({ subtask }: { subtask: TaskWithRelations }) {
  const isDone = subtask.status === 'done';

  return (
    <a
      href={`/tasks/${subtask.id}`}
      className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-gray-50 group"
    >
      {isDone ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
      )}
      <span
        className={cn(
          'text-sm flex-1 truncate',
          isDone ? 'text-gray-400 line-through' : 'text-gray-700'
        )}
      >
        {subtask.title}
      </span>
      {subtask.assignee && (
        <span className="text-xs text-gray-400 hidden group-hover:inline">
          {subtask.assignee.name || subtask.assignee.email}
        </span>
      )}
    </a>
  );
}
