'use client';

import { useState } from 'react';
import { Zap, Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/context';
import { useCompleteOnboardingStep } from '@/features/onboarding/hooks';
import { useQuery } from '@tanstack/react-query';

interface StepJoinSprintProps {
  completed: boolean;
  onComplete: () => void;
}

interface SprintTask {
  id: string;
  title: string;
  points: number;
  sprint_id: string;
  sprint_name: string;
}

export function StepJoinSprint({ completed, onComplete }: StepJoinSprintProps) {
  const t = useTranslations('Onboarding');
  const { user } = useAuth();
  const completeMutation = useCompleteOnboardingStep();
  const [joiningTaskId, setJoiningTaskId] = useState<string | null>(null);

  // Check if user already has a task in an active sprint
  const { data: existingSprint } = useQuery({
    queryKey: ['onboarding', 'user-sprint-check'],
    queryFn: async () => {
      const supabase = createClient();
      if (!user) return null;

      const { data } = await supabase
        .from('tasks')
        .select('id, sprint_id, sprints!inner(id, name)')
        .eq('assignee_id', user.id)
        .not('sprint_id', 'is', null)
        .limit(1)
        .maybeSingle();

      return data;
    },
    enabled: !completed && !!user,
  });

  // Auto-complete if user already has sprint task
  const hasSprintTask = !!existingSprint?.sprint_id;

  const { data: sprintTasks, isLoading } = useQuery({
    queryKey: ['onboarding', 'sprint-tasks'],
    queryFn: async (): Promise<SprintTask[]> => {
      const supabase = createClient();

      // Get active sprints
      const { data: sprints } = await supabase
        .from('sprints')
        .select('id, name')
        .eq('status', 'active')
        .limit(3);

      if (!sprints?.length) return [];

      const sprintIds = sprints.map((s) => s.id);
      const sprintMap = new Map(sprints.map((s) => [s.id, s.name]));

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, points, sprint_id')
        .in('sprint_id', sprintIds)
        .eq('status', 'todo')
        .is('assignee_id', null)
        .limit(5);

      return (tasks ?? []).map((t) => ({
        ...t,
        sprint_id: t.sprint_id!,
        sprint_name: sprintMap.get(t.sprint_id!) ?? '',
      }));
    },
    enabled: !completed && !hasSprintTask,
  });

  // Auto-complete if already has sprint task
  if (hasSprintTask && !completed && !completeMutation.isPending) {
    completeMutation.mutate(
      { step: 'join_sprint', sprint_id: existingSprint.sprint_id! },
      { onSuccess: () => onComplete() }
    );
  }

  const handleJoinSprintTask = async (task: SprintTask) => {
    if (!user || completeMutation.isPending) return;

    setJoiningTaskId(task.id);

    const supabase = createClient();
    const { error } = await supabase
      .from('task_assignees')
      .insert({ task_id: task.id, user_id: user.id });

    if (error) {
      setJoiningTaskId(null);
      return;
    }

    await supabase
      .from('tasks')
      .update({ assignee_id: user.id, status: 'in_progress' })
      .eq('id', task.id);

    completeMutation.mutate(
      { step: 'join_sprint', sprint_id: task.sprint_id },
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
        <p className="text-green-400 font-medium">{t('steps.join_sprint.completed')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="w-14 h-14 rounded-full bg-organic-orange/20 flex items-center justify-center">
        <Zap className="w-7 h-7 text-organic-orange" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-white">{t('steps.join_sprint.title')}</h3>
        <p className="text-sm text-gray-400 max-w-sm">{t('steps.join_sprint.description')}</p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('loading')}</span>
        </div>
      )}

      {!isLoading && sprintTasks && sprintTasks.length === 0 && (
        <p className="text-sm text-gray-500">{t('steps.join_sprint.noSprints')}</p>
      )}

      {!isLoading && sprintTasks && sprintTasks.length > 0 && (
        <div className="w-full space-y-2 max-h-[240px] overflow-y-auto">
          {sprintTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium text-white truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                    {task.sprint_name}
                  </span>
                  <span className="text-[11px] text-gray-500">{task.points} pts</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleJoinSprintTask(task)}
                disabled={joiningTaskId !== null}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-organic-orange hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {joiningTaskId === task.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  t('steps.join_sprint.joinButton')
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
