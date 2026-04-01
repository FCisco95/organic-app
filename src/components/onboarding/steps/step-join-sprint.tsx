'use client';

import { useState } from 'react';
import { Zap, Check, Loader2, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/context';
import { useCompleteOnboardingStep } from '@/features/onboarding/hooks';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';

interface StepJoinSprintProps {
  completed: boolean;
  onComplete: () => void;
}

interface SprintTask {
  id: string;
  title: string;
  points: number | null;
  sprint_id: string;
  sprint_name: string;
}

function SprintSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border animate-pulse">
      <div className="flex-1 min-w-0 mr-3 space-y-2">
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-3 w-2/5 bg-muted rounded" />
      </div>
      <div className="h-7 w-14 bg-muted rounded-md" />
    </div>
  );
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
      <div className="flex flex-col items-center gap-5 py-8 w-full">
        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
          <Check className="w-6 h-6 text-green-400" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-base font-medium text-green-400">{t('steps.join_sprint.completed')}</p>
          <span className="inline-block text-xs font-mono text-organic-terracotta bg-organic-terracotta/10 px-2 py-0.5 rounded">
            {t('xpEarned')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4 w-full">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Zap className="w-6 h-6 text-organic-terracotta" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-foreground">{t('steps.join_sprint.title')}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{t('steps.join_sprint.description')}</p>
      </div>

      {/* Skeleton loading */}
      {isLoading && (
        <div className="w-full space-y-2">
          <SprintSkeleton />
          <SprintSkeleton />
          <SprintSkeleton />
        </div>
      )}

      {/* Rich empty state */}
      {!isLoading && sprintTasks && sprintTasks.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Zap className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center">{t('steps.join_sprint.noSprints')}</p>
          <p className="text-xs text-muted-foreground text-center">{t('steps.join_sprint.noSprintsHint')}</p>
          <Link
            href="/sprints"
            className="inline-flex items-center gap-1.5 text-sm text-organic-terracotta hover:text-[#E8845C] transition-colors"
          >
            {t('noSprintsCta')}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Sprint task list */}
      {!isLoading && sprintTasks && sprintTasks.length > 0 && (
        <div className="w-full space-y-2 max-h-[240px] overflow-y-auto">
          {sprintTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:border-muted-foreground/30 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                    {task.sprint_name}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">{task.points ?? 0} pts</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleJoinSprintTask(task)}
                disabled={joiningTaskId !== null}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-cta hover:bg-cta-hover text-cta-fg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
