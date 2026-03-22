'use client';

import { useState } from 'react';
import { ClipboardList, Check, Loader2, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/context';
import { useCompleteOnboardingStep } from '@/features/onboarding/hooks';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';

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

function TaskSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border animate-pulse">
      <div className="flex-1 min-w-0 mr-3 space-y-2">
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-3 w-1/3 bg-muted rounded" />
      </div>
      <div className="h-7 w-14 bg-muted rounded-md" />
    </div>
  );
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
      <div className="flex flex-col items-center gap-5 py-8 w-full">
        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
          <Check className="w-6 h-6 text-green-400" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-base font-medium text-green-400">{t('steps.pick_task.completed')}</p>
          <span className="inline-block text-xs font-mono text-organic-orange bg-organic-orange/10 px-2 py-0.5 rounded">
            {t('xpEarned')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4 w-full">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <ClipboardList className="w-6 h-6 text-organic-orange" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-foreground">{t('steps.pick_task.title')}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{t('steps.pick_task.description')}</p>
      </div>

      {/* Skeleton loading */}
      {isLoading && (
        <div className="w-full space-y-2">
          <TaskSkeleton />
          <TaskSkeleton />
          <TaskSkeleton />
        </div>
      )}

      {/* Rich empty state */}
      {!isLoading && tasks && tasks.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center">{t('steps.pick_task.noTasks')}</p>
          <p className="text-xs text-muted-foreground text-center">{t('steps.pick_task.noTasksHint')}</p>
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1.5 text-sm text-organic-orange hover:text-orange-400 transition-colors"
          >
            {t('noTasksCta')}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Task list */}
      {!isLoading && tasks && tasks.length > 0 && (
        <div className="w-full space-y-2 max-h-[240px] overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:border-muted-foreground/30 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {task.task_type && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {task.task_type}
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-muted-foreground">{task.points ?? 0} pts</span>
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
