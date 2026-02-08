'use client';

import { useState } from 'react';
import {
  Link2,
  Unlink,
  Search,
  Loader2,
  CheckCircle2,
  Circle,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useTasks,
  useTaskDependencies,
  useAddDependency,
  useRemoveDependency,
  TaskDependency,
} from '@/features/tasks';
import toast from 'react-hot-toast';

interface DependencyPickerProps {
  taskId: string;
  className?: string;
}

export function DependencyPicker({ taskId, className }: DependencyPickerProps) {
  const { data: deps, isLoading: depsLoading } = useTaskDependencies(taskId);
  const { data: allTasks } = useTasks({});
  const addDep = useAddDependency();
  const removeDep = useRemoveDependency();
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const dependencies = (deps as TaskDependency[] | undefined) ?? [];
  const blockerIds = new Set(dependencies.map((d) => d.depends_on_task_id));

  // Filter tasks for the picker (exclude self, already-added)
  const availableTasks = (allTasks ?? []).filter(
    (t) =>
      t.id !== taskId &&
      !blockerIds.has(t.id) &&
      (search
        ? t.title?.toLowerCase().includes(search.toLowerCase())
        : true)
  );

  const handleAdd = async (dependsOnTaskId: string) => {
    try {
      await addDep.mutateAsync({
        taskId,
        input: { depends_on_task_id: dependsOnTaskId },
      });
      toast.success('Dependency added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add dependency');
    }
  };

  const handleRemove = async (dep: TaskDependency) => {
    try {
      await removeDep.mutateAsync({
        taskId,
        dependencyId: dep.id,
        dependsOnTaskId: dep.depends_on_task_id,
      });
      toast.success('Dependency removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove dependency');
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Dependencies
        </h4>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs text-organic-orange hover:text-orange-600 font-medium"
        >
          {isAdding ? 'Done' : '+ Add blocker'}
        </button>
      </div>

      {/* Current dependencies list */}
      {depsLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      ) : dependencies.length > 0 ? (
        <div className="space-y-1">
          {dependencies.map((dep) => {
            const isDone = dep.blocking_task?.status === 'done';
            return (
              <div
                key={dep.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded bg-gray-50 group"
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span
                  className={cn(
                    'text-sm flex-1 truncate',
                    isDone ? 'text-gray-400 line-through' : 'text-gray-700'
                  )}
                >
                  {dep.blocking_task?.title || 'Unknown task'}
                </span>
                <button
                  onClick={() => handleRemove(dep)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                  title="Remove dependency"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        !isAdding && (
          <p className="text-xs text-gray-400">No dependencies</p>
        )
      )}

      {/* Add dependency picker */}
      {isAdding && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-3 py-2 text-sm border-b border-gray-200 focus:outline-none focus:border-organic-orange"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {availableTasks.slice(0, 20).map((task) => (
              <button
                key={task.id}
                onClick={() => handleAdd(task.id)}
                disabled={addDep.isPending}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    task.status === 'done' ? 'bg-green-500' : 'bg-gray-300'
                  )}
                />
                <span className="truncate">{task.title}</span>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">
                  {task.status}
                </span>
              </button>
            ))}
            {availableTasks.length === 0 && (
              <p className="text-xs text-gray-400 py-3 text-center">No matching tasks</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
