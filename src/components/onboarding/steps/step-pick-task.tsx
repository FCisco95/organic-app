'use client';

import { useState } from 'react';
import { ClipboardList, Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/context';
import { useCompleteOnboardingStep } from '@/features/onboarding/hooks';
import { useQuery } from '@tanstack/react-query';

interface StepPickTaskProps {
  completed: boolean;
  onComplete: () => void;
}

interface OpenTask {
  id: string;
  title: string;
  task_type: string | null;
  points: number | null;
}

export function StepPickTask({ completed, onComplete }: StepPickTaskProps) {
  const t = useTranslations('Onboarding');
  const { user } = useAuth();
  const completeMutation = useCompleteOnboardingStep();
  const [joiningTaskId, setJoiningTaskId] = useState<string | null>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['onboarding', 'open-tasks'],
    queryFn: async (): Promise<OpenTask[]> => {
      const supabase = createClient();
      const { data } = await supabase
        .from('tasks')
        .select('id, title, task_type, points')
        .eq('status', 'todo')
        .is('assignee_id', null)
        .order('created_at', { ascending: false })
        .limit(5);
      return (data ?? []) as OpenTask[];
    },
    enabled: !completed,
  });

  const handleJoinTask = async (taskId: string) => {
    if (!user || completeMutation.isPending) return;

    setJoiningTaskId(taskId);

    // Assign self to the task
    const supabase = createClient();
    const { error } = await supabase
      .from('task_assignees')
      .insert({ task_id: taskId, user_id: user.id });

    if (error) {
      setJoiningTaskId(null);
      return;
    }

    // Also update the task's assignee_id
    await supabase
      .from('tasks')
      .update({ assignee_id: user.id, status: 'in_progress' })
      .eq('id', taskId);

    completeMutation.mutate(
      { step: 'pick_task', task_id: taskId },
      {
        onSuccess: () => onComplete(),
        onSettled: () => setJoiningTaskId(null),
      }
    );
  };

  if (completed) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <p className="text-green-400 font-medium">{t('steps.pick_task.completed')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="w-14 h-14 rounded-full bg-organic-orange/20 flex items-center justify-center">
        <ClipboardList className="w-7 h-7 text-organic-orange" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-white">{t('steps.pick_task.title')}</h3>
        <p className="text-sm text-gray-400 max-w-sm">{t('steps.pick_task.description')}</p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('loading')}</span>
        </div>
      )}

      {!isLoading && tasks && tasks.length === 0 && (
        <p className="text-sm text-gray-500">{t('steps.pick_task.noTasks')}</p>
      )}

      {!isLoading && tasks && tasks.length > 0 && (
        <div className="w-full space-y-2 max-h-[240px] overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium text-white truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {task.task_type && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                      {task.task_type}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-500">{task.points ?? 0} pts</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleJoinTask(task.id)}
                disabled={joiningTaskId !== null}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-organic-orange hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {joiningTaskId === task.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  t('steps.pick_task.joinButton')
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
