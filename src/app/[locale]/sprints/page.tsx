'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/context';
import {
  Sprint,
  SprintFormData,
  SPRINT_PHASE_SEQUENCE,
  SprintStats,
  getNextSprintPhase,
  isSprintExecutionPhase,
} from '@/features/sprints';
import { useSprints, useStartSprint, useCompleteSprint } from '@/features/sprints';
import {
  formatSprintDate,
  getCapacityPercent,
  getCompletionPercent,
} from '@/features/sprints/utils';

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Play,
  Plus,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { TaskBoardTask, TaskStatus } from '@/components/tasks/task-board';
import { useSearchParams } from 'next/navigation';
import { SprintCreateModal } from '@/components/sprints/sprint-create-modal';
import { SprintBoardView } from '@/components/sprints/sprint-board-view';
import { SprintListView } from '@/components/sprints/sprint-list-view';
import { SprintTimeline } from '@/components/sprints/sprint-timeline';
import { SprintStartDialog } from '@/components/sprints/sprint-start-dialog';
import { SprintCompleteDialog } from '@/components/sprints/sprint-complete-dialog';
import { PageContainer } from '@/components/layout';

export default function SprintsPage() {
  const { profile } = useAuth();
  const t = useTranslations('Sprints');
  const tTasks = useTranslations('Tasks');
  const searchParams = useSearchParams();

  // Use React Query for sprints
  const { data: sprintsData, isLoading: sprintsLoading, refetch: refetchSprints } = useSprints();
  const sprints = useMemo(() => sprintsData ?? [], [sprintsData]);

  const [sprintStats, setSprintStats] = useState<SprintStats>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'board' | 'list' | 'timeline'>('board');
  const [currentSprintTasks, setCurrentSprintTasks] = useState<TaskBoardTask[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<TaskBoardTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [selectedBacklogIds, setSelectedBacklogIds] = useState<string[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [contributorCounts, setContributorCounts] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState<SprintFormData>({
    name: '',
    start_at: '',
    end_at: '',
    status: 'planning',
    capacity_points: '',
    goal: '',
  });

  // Lifecycle dialogs
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const startSprintMutation = useStartSprint();
  const completeSprintMutation = useCompleteSprint();

  // Fetch stats when sprints change
  useEffect(() => {
    if (!sprints.length) {
      setSprintStats({});
      setLoading(false);
      return;
    }
    const fetchStats = async () => {
      try {
        const supabase = createClient();
        const sprintIds = sprints.map((sprint) => sprint.id);
        const { data, error } = await supabase.rpc('get_sprint_stats', {
          p_sprint_ids: sprintIds,
        });

        if (error) throw error;

        const stats: SprintStats = {};
        (data ?? []).forEach(
          (row: {
            sprint_id: string;
            total: number;
            completed: number;
            in_progress: number;
            points: number;
            total_points: number;
          }) => {
            stats[row.sprint_id] = {
              total: row.total,
              completed: row.completed,
              inProgress: row.in_progress,
              points: row.points,
              totalPoints: row.total_points,
            };
          }
        );

        setSprintStats(stats);
      } catch (err) {
        console.error('Error fetching sprint stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [sprints]);

  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  };

  const formatPhaseCountdown = (deadlineIso: string) => {
    const diffMs = new Date(deadlineIso).getTime() - Date.now();
    if (diffMs <= 0) return t('phaseDeadlinePassed');

    const totalMinutes = Math.ceil(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${Math.max(1, minutes)}m`;
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const supabase = createClient();

      if (!profile || !profile.role || !['council', 'admin'].includes(profile.role)) {
        throw new Error(t('errorOnlyCouncil'));
      }

      const { error: insertError } = await supabase
        .from('sprints')
        .insert({
          name: formData.name,
          start_at: formData.start_at,
          end_at: formData.end_at,
          status: formData.status || 'planning',
          capacity_points: formData.capacity_points ? Number(formData.capacity_points) : null,
          goal: formData.goal || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating sprint:', insertError);
        throw new Error(insertError.message || 'Failed to create sprint');
      }

      setFormData({
        name: '',
        start_at: '',
        end_at: '',
        status: 'planning',
        capacity_points: '',
        goal: '',
      });
      setShowCreateModal(false);

      await refetchSprints();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setError(null);
    setFormData({
      name: '',
      start_at: '',
      end_at: '',
      status: 'planning',
      capacity_points: '',
      goal: '',
    });
  };

  const canCreateSprint = profile?.role === 'admin' || profile?.role === 'council';

  const activeSprint = useMemo(
    () => sprints.find((s) => isSprintExecutionPhase(s.status)),
    [sprints]
  );
  const planningSprints = useMemo(
    () =>
      sprints
        .filter((s) => s.status === 'planning')
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
    [sprints]
  );
  const pastSprints = useMemo(
    () =>
      sprints
        .filter((s) => s.status === 'completed')
        .sort((a, b) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime()),
    [sprints]
  );

  const selectedSprint = useMemo(() => {
    if (selectedSprintId) {
      return sprints.find((sprint) => sprint.id === selectedSprintId) ?? null;
    }
    return activeSprint ?? planningSprints[0] ?? null;
  }, [activeSprint, planningSprints, selectedSprintId, sprints]);

  const boardTasks = currentSprintTasks.filter((task) => task.status !== 'backlog');
  const canAssignToSprint = Boolean(
    profile?.role === 'admin' && selectedSprint?.status !== 'completed'
  );
  const currentSprintPoints = useMemo(
    () => currentSprintTasks.reduce((sum, task) => sum + (task.points || 0), 0),
    [currentSprintTasks]
  );
  const activityCountsMap = useMemo(() => {
    const ids = new Set([
      ...currentSprintTasks.map((task) => task.id),
      ...backlogTasks.map((task) => task.id),
    ]);
    const map: Record<string, { comments: number; submissions: number; contributors: number }> = {};
    ids.forEach((id) => {
      map[id] = {
        comments: commentCounts[id] ?? 0,
        submissions: submissionCounts[id] ?? 0,
        contributors: contributorCounts[id] ?? 0,
      };
    });
    return map;
  }, [backlogTasks, commentCounts, contributorCounts, currentSprintTasks, submissionCounts]);

  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'list') {
      setActiveView('list');
    } else if (view === 'timeline') {
      setActiveView('timeline');
    }
  }, [searchParams]);

  useEffect(() => {
    setSelectedBacklogIds([]);
  }, [selectedSprint?.id, profile?.role]);

  useEffect(() => {
    if (!sprints.length) return;
    const selectionStillExists = selectedSprintId
      ? sprints.some((sprint) => sprint.id === selectedSprintId)
      : false;
    if (selectionStillExists) return;
    const nextDefault = activeSprint?.id ?? planningSprints[0]?.id ?? null;
    setSelectedSprintId(nextDefault);
  }, [activeSprint?.id, planningSprints, selectedSprintId, sprints]);

  useEffect(() => {
    const loadTasks = async () => {
      setTasksLoading(true);
      try {
        const supabase = createClient();

        let sprintTasks: TaskBoardTask[] = [];
        if (selectedSprint) {
          const { data, error: tasksError } = await supabase
            .from('tasks')
            .select(
              `
              *,
              assignee:user_profiles!tasks_assignee_id_fkey (
                organic_id,
                email
              ),
              sprints (
                name
              )
            `
            )
            .eq('sprint_id', selectedSprint.id)
            .order('created_at', { ascending: false });

          if (tasksError) throw tasksError;
          sprintTasks = (data as unknown as TaskBoardTask[]) || [];
          const backlogInSprint = sprintTasks.filter((task) => task.status === 'backlog');

          if (backlogInSprint.length > 0 && profile?.role === 'admin') {
            const backlogIds = backlogInSprint.map((task) => task.id);
            const { error: normalizeError } = await supabase
              .from('tasks')
              .update({ status: 'todo' })
              .in('id', backlogIds);

            if (normalizeError) throw normalizeError;
            setCurrentSprintTasks(
              sprintTasks.map((task) =>
                backlogIds.includes(task.id) ? { ...task, status: 'todo' } : task
              )
            );
          } else {
            setCurrentSprintTasks(sprintTasks);
          }
        } else {
          setCurrentSprintTasks([]);
        }

        const { data: backlogData, error: backlogError } = await supabase
          .from('tasks')
          .select(
            `
            *,
            assignee:user_profiles!tasks_assignee_id_fkey (
              organic_id,
              email
            ),
            sprints (
              name
            )}
          `
          )
          .eq('status', 'backlog')
          .is('sprint_id', null)
          .order('created_at', { ascending: false });

        if (backlogError) throw backlogError;
        const backlogList = (backlogData as unknown as TaskBoardTask[]) || [];
        setBacklogTasks(backlogList);

        const allTaskIds = [
          ...new Set([
            ...sprintTasks.map((task) => task.id),
            ...backlogList.map((task) => task.id),
          ]),
        ];

        if (allTaskIds.length > 0) {
          const [
            { data: commentsData, error: commentsError },
            { data: submissionsData, error: submissionsError },
          ] = await Promise.all([
            supabase.from('task_comments').select('task_id').in('task_id', allTaskIds),
            supabase.from('task_submissions').select('task_id, user_id').in('task_id', allTaskIds),
          ]);

          if (commentsError) throw commentsError;
          if (submissionsError) throw submissionsError;

          const nextCommentCounts = (commentsData ?? []).reduce<Record<string, number>>(
            (acc, row) => {
              const taskId = (row as { task_id: string }).task_id;
              acc[taskId] = (acc[taskId] ?? 0) + 1;
              return acc;
            },
            {}
          );

          const nextSubmissionCounts = (submissionsData ?? []).reduce<Record<string, number>>(
            (acc, row) => {
              const taskId = (row as { task_id: string }).task_id;
              acc[taskId] = (acc[taskId] ?? 0) + 1;
              return acc;
            },
            {}
          );

          const contributorMap = (submissionsData ?? []).reduce<Record<string, Set<string>>>(
            (acc, row) => {
              const entry = row as { task_id: string; user_id: string };
              acc[entry.task_id] = acc[entry.task_id] ?? new Set<string>();
              acc[entry.task_id].add(entry.user_id);
              return acc;
            },
            {}
          );

          setCommentCounts(nextCommentCounts);
          setSubmissionCounts(nextSubmissionCounts);
          setContributorCounts(
            Object.fromEntries(
              Object.entries(contributorMap).map(([taskId, userSet]) => [taskId, userSet.size])
            )
          );
        } else {
          setCommentCounts({});
          setSubmissionCounts({});
          setContributorCounts({});
        }
      } catch (fetchError) {
        console.error('Error loading sprint tasks:', fetchError);
      } finally {
        setTasksLoading(false);
      }
    };

    loadTasks();
  }, [profile?.role, selectedSprint]);

  const assignTasksToSprint = async (taskIds: string[]) => {
    if (!selectedSprint || taskIds.length === 0) return;
    setIsMoving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ sprint_id: selectedSprint.id, status: 'todo' })
        .in('id', taskIds);

      if (updateError) throw updateError;

      const movedTasks = backlogTasks
        .filter((task) => taskIds.includes(task.id))
        .map((task) => ({
          ...task,
          sprint_id: selectedSprint.id,
          status: 'todo' as TaskStatus,
          sprints: { name: selectedSprint.name },
        }));

      setBacklogTasks((prev) => prev.filter((task) => !taskIds.includes(task.id)));
      setCurrentSprintTasks((prev) => [...movedTasks, ...prev]);
      setSelectedBacklogIds([]);
      toast.success(tTasks('toastTaskUpdated'));
    } catch (moveError) {
      console.error('Error moving tasks to sprint:', moveError);
      toast.error(tTasks('toastTaskUpdateFailed'));
    } finally {
      setIsMoving(false);
    }
  };

  const handleMoveSelected = async () => {
    if (!canAssignToSprint) return;
    await assignTasksToSprint(selectedBacklogIds);
  };

  const handleDropToSprint = async (taskId: string) => {
    if (!canAssignToSprint) return;
    const isBacklogTask = backlogTasks.some((task) => task.id === taskId);
    if (!isBacklogTask) return;
    await assignTasksToSprint([taskId]);
  };

  const handleDropToBacklog = async (taskId: string) => {
    if (!canAssignToSprint) return;
    const sprintTask = currentSprintTasks.find((task) => task.id === taskId);
    if (!sprintTask) return;

    setIsMoving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ sprint_id: null, status: 'backlog', completed_at: null })
        .eq('id', taskId);

      if (updateError) throw updateError;

      setCurrentSprintTasks((prev) => prev.filter((task) => task.id !== taskId));
      setBacklogTasks((prev) => [
        { ...sprintTask, sprint_id: null, status: 'backlog', sprints: null },
        ...prev.filter((task) => task.id !== taskId),
      ]);
      toast.success(tTasks('toastTaskUpdated'));
    } catch (moveError) {
      console.error('Error moving task to backlog:', moveError);
      toast.error(tTasks('toastTaskUpdateFailed'));
    } finally {
      setIsMoving(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === 'backlog') {
      await handleDropToBacklog(taskId);
      return;
    }
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'done' ? new Date().toISOString() : null,
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      setCurrentSprintTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task))
      );
      toast.success(tTasks('toastTaskUpdated'));
    } catch (updateError) {
      console.error('Error updating task:', updateError);
      toast.error(tTasks('toastTaskUpdateFailed'));
    }
  };

  // Lifecycle handlers
  const handleStartSprint = async () => {
    if (!selectedSprint) return;
    try {
      await startSprintMutation.mutateAsync(selectedSprint.id);
      setShowStartDialog(false);
      toast.success(t('startSprintButton'));
      await refetchSprints();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCompleteSprint = async (
    incompleteAction?: 'backlog' | 'next_sprint',
    nextSprintId?: string
  ) => {
    if (!selectedSprint) return;
    try {
      const result = await completeSprintMutation.mutateAsync({
        sprintId: selectedSprint.id,
        incompleteAction,
        nextSprintId,
      });
      setShowCompleteDialog(false);
      const nextPhase = result.phase_transition?.to;
      if (nextPhase) {
        toast.success(t('phaseAdvancedTo', { phase: t(`status.${nextPhase}`) }));
      } else {
        toast.success(t('phaseAdvanced'));
      }
      await refetchSprints();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const canManageSprint = profile?.role === 'admin' || profile?.role === 'council';
  const showStartButton = canManageSprint && selectedSprint?.status === 'planning' && !activeSprint;
  const showCompleteButton =
    canManageSprint && isSprintExecutionPhase(selectedSprint?.status ?? null);
  const nextPhaseLabel = selectedSprint
    ? getNextSprintPhase(selectedSprint.status ?? 'planning')
    : null;
  const referenceSprint = selectedSprint ?? activeSprint ?? planningSprints[0] ?? pastSprints[0] ?? null;
  const referencePhase = referenceSprint?.status
    ? (referenceSprint.status as (typeof SPRINT_PHASE_SEQUENCE)[number])
    : null;
  const referencePhaseIndex = referencePhase ? SPRINT_PHASE_SEQUENCE.indexOf(referencePhase) : -1;
  const reviewDeadlineAt =
    referenceSprint?.review_started_at && referenceSprint.status === 'review'
      ? new Date(
          new Date(referenceSprint.review_started_at).getTime() + 72 * 60 * 60 * 1000
        ).toISOString()
      : null;
  const phaseDeadlineAt =
    referenceSprint?.status === 'review'
      ? reviewDeadlineAt
      : referenceSprint?.status === 'dispute_window'
        ? referenceSprint.dispute_window_ends_at
        : null;
  const phaseCountdown = phaseDeadlineAt ? formatPhaseCountdown(phaseDeadlineAt) : null;
  const openExecutionCount = sprints.filter((sprint) => isSprintExecutionPhase(sprint.status)).length;
  const blockedSettlementCount = sprints.filter((sprint) => Boolean(sprint.settlement_blocked_reason)).length;

  // Stats for complete dialog
  const completeStats = useMemo(() => {
    const total = currentSprintTasks.length;
    const done = currentSprintTasks.filter((t) => t.status === 'done').length;
    const incomplete = total - done;
    const totalPts = currentSprintTasks.reduce((sum, t) => sum + (t.points || 0), 0);
    const donePts = currentSprintTasks
      .filter((t) => t.status === 'done')
      .reduce((sum, t) => sum + (t.points || 0), 0);
    return {
      totalTasks: total,
      completedTasks: done,
      incompleteTasks: incomplete,
      totalPoints: totalPts,
      completedPoints: donePts,
      completionRate: total > 0 ? Number(((done / total) * 100).toFixed(1)) : 0,
    };
  }, [currentSprintTasks]);

  const isPageLoading = sprintsLoading || loading;

  return (
    <PageContainer width="wide">
      <div className="space-y-6" data-testid="sprints-page">
      {/* Header */}
      <div
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        data-testid="sprints-command-header"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {showStartButton && (
            <button
              onClick={() => setShowStartDialog(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Play className="w-4 h-4" />
              {t('startSprintButton')}
            </button>
          )}
          {showCompleteButton && (
            <button
              onClick={() => {
                if (selectedSprint?.status === 'settlement') {
                  setShowCompleteDialog(true);
                  return;
                }
                void handleCompleteSprint();
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <CheckCircle2 className="w-4 h-4" />
              {selectedSprint?.status === 'settlement'
                ? t('completeSprintButton')
                : t('advancePhaseButton', {
                    phase: nextPhaseLabel ? t(`status.${nextPhaseLabel}`) : t('status.review'),
                  })}
            </button>
          )}
          {canCreateSprint && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              {t('createSprint')}
            </button>
          )}
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-4 xl:grid-cols-[2.1fr_1fr]"
        data-testid="sprints-command-deck"
      >
        <section
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          data-testid="sprints-phase-rail"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t('phaseRailTitle')}
              </p>
              <p className="mt-1 text-sm text-gray-600">{t('phaseRailSubtitle')}</p>
            </div>
            {phaseCountdown && (
              <div
                className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                data-testid="sprints-phase-countdown"
              >
                <Timer className="h-3.5 w-3.5" />
                {t('phaseTimeRemaining', { time: phaseCountdown })}
              </div>
            )}
          </div>
          <p className="mt-4 text-xs text-gray-500">
            {referenceSprint
              ? t('phaseReferenceSprint', { name: referenceSprint.name })
              : t('phaseReferenceNone')}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SPRINT_PHASE_SEQUENCE.map((phase, index) => {
              const isCurrent = referencePhaseIndex === index;
              const isComplete = referencePhaseIndex > -1 && index < referencePhaseIndex;
              return (
                <div
                  key={phase}
                  data-testid={`sprints-phase-chip-${phase}`}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    isCurrent
                      ? 'border-organic-orange/40 bg-orange-50 text-orange-700'
                      : isComplete
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                >
                  <p className="font-semibold">{t(`status.${phase}`)}</p>
                  <p className="mt-0.5 text-xs">
                    {isCurrent
                      ? t('phaseCurrent')
                      : isComplete
                        ? t('phaseCompleted')
                        : t('phaseQueued')}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          data-testid="sprints-settlement-panel"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t('settlementPanelTitle')}
            </p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">{t('metricOpenExecution')}</p>
              <p className="text-2xl font-bold text-gray-900">{openExecutionCount}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">{t('settlementBlockedMetric')}</p>
              <p className="text-2xl font-bold text-gray-900">{blockedSettlementCount}</p>
            </div>
            <div
              data-testid="sprints-settlement-alert"
              className={`rounded-xl border px-3 py-2 text-sm ${
                referenceSprint?.settlement_blocked_reason
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {referenceSprint?.settlement_blocked_reason
                    ? t('settlementPanelBlocked', {
                        reason: referenceSprint.settlement_blocked_reason,
                      })
                    : t('settlementReady')}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {isPageLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-organic-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500">{t('loading')}</p>
        </div>
      ) : sprints.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('emptyTitle')}</h3>
          <p className="text-gray-500 mb-6">
            {canCreateSprint ? t('emptyAdmin') : t('emptyViewer')}
          </p>
          {canCreateSprint && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-organic-orange hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              {t('createFirstSprint')}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 overflow-x-auto pb-1" data-testid="sprints-view-tabs">
            <button
              onClick={() => setActiveView('board')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'board'
                  ? 'bg-organic-orange text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {t('currentSprintBoard')}
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'list'
                  ? 'bg-organic-orange text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {t('sprintList')}
            </button>
            <button
              onClick={() => setActiveView('timeline')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'timeline'
                  ? 'bg-organic-orange text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {t('timeline')}
            </button>
          </div>

          {activeView === 'board' ? (
            <SprintBoardView
              selectedSprint={selectedSprint}
              selectedSprintId={selectedSprintId}
              activeSprint={activeSprint}
              planningSprints={planningSprints}
              canCreateSprint={canCreateSprint}
              canAssignToSprint={canAssignToSprint}
              boardTasks={boardTasks}
              backlogTasks={backlogTasks}
              tasksLoading={tasksLoading}
              selectedBacklogIds={selectedBacklogIds}
              isMoving={isMoving}
              currentSprintPoints={currentSprintPoints}
              activityCounts={activityCountsMap}
              onSelectSprintId={setSelectedSprintId}
              onOpenCreate={() => setShowCreateModal(true)}
              onMoveSelected={handleMoveSelected}
              onToggleBacklogSelect={(taskId, checked) =>
                setSelectedBacklogIds((prev) =>
                  checked ? [...prev, taskId] : prev.filter((id) => id !== taskId)
                )
              }
              onDropToSprint={handleDropToSprint}
              onDropToBacklog={handleDropToBacklog}
              onStatusChange={updateTaskStatus}
              getCapacityPercent={getCapacityPercent}
              formatDate={formatSprintDate}
            />
          ) : activeView === 'list' ? (
            <SprintListView
              activeSprint={activeSprint}
              planningSprints={planningSprints}
              pastSprints={pastSprints}
              sprintStats={sprintStats}
              formatDate={formatSprintDate}
              getDuration={getDuration}
              getCompletionPercent={getCompletionPercent}
            />
          ) : (
            <SprintTimeline />
          )}
        </>
      )}

      <SprintCreateModal
        open={showCreateModal}
        error={error}
        submitting={submitting}
        formData={formData}
        onChange={setFormData}
        onClose={handleCloseModal}
        onSubmit={handleCreateSprint}
      />

      {showStartDialog && selectedSprint && (
        <SprintStartDialog
          open={showStartDialog}
          sprint={selectedSprint}
          taskCount={currentSprintTasks.length}
          loading={startSprintMutation.isPending}
          onClose={() => setShowStartDialog(false)}
          onConfirm={handleStartSprint}
        />
      )}

      {showCompleteDialog && selectedSprint && (
        <SprintCompleteDialog
          open={showCompleteDialog}
          sprint={selectedSprint}
          stats={completeStats}
          planningSprints={planningSprints}
          loading={completeSprintMutation.isPending}
          onClose={() => setShowCompleteDialog(false)}
          onConfirm={handleCompleteSprint}
        />
      )}
      </div>
    </PageContainer>
  );
}
