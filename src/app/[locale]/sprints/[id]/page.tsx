'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import {
  Sprint,
  SprintFormData,
  SPRINT_PHASE_SEQUENCE,
  SprintTask,
  SprintSnapshot,
  getNextSprintPhase,
  isSprintExecutionPhase,
} from '@/features/sprints';
import { useStartSprint, useCompleteSprint } from '@/features/sprints';

import {
  Calendar,
  CheckCircle2,
  ArrowLeft,
  Edit,
  Trash2,
  AlertCircle,
  Circle,
  Timer,
  ShieldAlert,
  ShieldCheck,
  X,
  Save,
  Play,
  Milestone,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { PageContainer } from '@/components/layout';
import { SprintSnapshotCard } from '@/components/sprints/sprint-snapshot-card';
import { SprintStartDialog } from '@/components/sprints/sprint-start-dialog';
import { SprintCompleteDialog } from '@/components/sprints/sprint-complete-dialog';

export default function SprintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const t = useTranslations('SprintDetail');
  const tSprints = useTranslations('Sprints');
  const sprintId = typeof params.id === 'string' ? params.id : params.id?.[0];
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [snapshot, setSnapshot] = useState<SprintSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit/Delete state
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState<SprintFormData>({
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
  const [planningSprints, setPlanningSprints] = useState<Sprint[]>([]);
  const startSprintMutation = useStartSprint();
  const completeSprintMutation = useCompleteSprint();

  const fetchSprintDetails = useCallback(async () => {
    if (!sprintId) return;

    try {
      const response = await fetch(`/api/sprints/${sprintId}`);
      const data = await response.json();

      if (response.ok) {
        setSprint(data.sprint);
        setTasks(data.tasks || []);
        setSnapshot(data.snapshot || null);
      } else {
        console.error('Error fetching sprint:', data.error);
      }
    } catch (error) {
      console.error('Error fetching sprint details:', error);
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    if (sprintId) {
      fetchSprintDetails();
    }
  }, [fetchSprintDetails, sprintId]);

  // Fetch planning sprints for complete dialog
  useEffect(() => {
    const fetchPlanningSprints = async () => {
      try {
        const response = await fetch('/api/sprints');
        const data = await response.json();
        if (response.ok) {
          setPlanningSprints((data.sprints || []).filter((s: Sprint) => s.status === 'planning'));
        }
      } catch {
        // ignore
      }
    };
    fetchPlanningSprints();
  }, []);

  const openEditModal = () => {
    if (sprint) {
      setEditForm({
        name: sprint.name,
        start_at: sprint.start_at.split('T')[0],
        end_at: sprint.end_at.split('T')[0],
        status: sprint.status ?? 'planning',
        capacity_points: sprint.capacity_points == null ? '' : String(sprint.capacity_points),
        goal: sprint.goal ?? '',
      });
      setShowEditModal(true);
    }
  };

  const handleEditSprint = async () => {
    if (!sprint) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/sprints/${sprint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          start_at: editForm.start_at,
          end_at: editForm.end_at,
          capacity_points: editForm.capacity_points ? Number(editForm.capacity_points) : null,
          goal: editForm.goal || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSprint(data.sprint);
        setShowEditModal(false);
      } else {
        alert(data.error || t('alertUpdateFailed'));
      }
    } catch (error) {
      console.error('Error updating sprint:', error);
      alert(t('alertUpdateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSprint = async () => {
    if (!sprint) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/sprints/${sprint.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/sprints');
      } else {
        const data = await response.json();
        alert(data.error || t('alertDeleteFailed'));
      }
    } catch (error) {
      console.error('Error deleting sprint:', error);
      alert(t('alertDeleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Lifecycle handlers
  const handleStartSprint = async () => {
    if (!sprint) return;
    try {
      await startSprintMutation.mutateAsync(sprint.id);
      setShowStartDialog(false);
      toast.success(tSprints('startSprintButton'));
      await fetchSprintDetails();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCompleteSprint = async (
    incompleteAction?: 'backlog' | 'next_sprint',
    nextSprintId?: string
  ) => {
    if (!sprint) return;
    try {
      const result = await completeSprintMutation.mutateAsync({
        sprintId: sprint.id,
        incompleteAction,
        nextSprintId,
      });
      setShowCompleteDialog(false);
      const nextPhase = result.phase_transition?.to;
      if (nextPhase) {
        toast.success(tSprints('phaseAdvancedTo', { phase: tSprints(`status.${nextPhase}`) }));
      } else {
        toast.success(tSprints('phaseAdvanced'));
      }
      await fetchSprintDetails();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const completeStats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const incomplete = total - done;
    const totalPts = tasks.reduce((sum, t) => sum + (t.points || 0), 0);
    const donePts = tasks
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
  }, [tasks]);

  if (loading) {
    return (
      <PageContainer width="wide">
        <div className="text-center py-12">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"></div>
          <p className="mt-4 text-sm text-gray-500">{t('loading')}</p>
        </div>
      </PageContainer>
    );
  }

  if (!sprint) {
    return (
      <PageContainer width="wide">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-base font-medium text-gray-900">{t('notFoundTitle')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('notFoundDescription')}</p>
          <Link
            href="/sprints"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('backToSprints')}
          </Link>
        </div>
      </PageContainer>
    );
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <div className="h-4 w-4 rounded-full border-2 border-orange-400 bg-orange-100" />;
      default:
        return <Circle className="h-4 w-4 text-gray-300" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${days}d`;
  };

  const getDisplayName = (assignee: SprintTask['assignee']) => {
    if (!assignee) return t('unassigned');
    if (assignee.name) return assignee.name;
    if (assignee.organic_id) return t('organicId', { id: assignee.organic_id });
    return assignee.email.split('@')[0];
  };

  // Calculate sprint statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const totalPoints = tasks.reduce((sum, t) => sum + (t.points || 0), 0);
  const completedPoints = tasks
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + (t.points || 0), 0);
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const canManageSprint = profile?.role === 'admin' || profile?.role === 'council';
  const capacityUsedLabel =
    sprint.capacity_points != null
      ? t('capacityValue', {
          used: totalPoints,
          capacity: sprint.capacity_points,
        })
      : t('capacityUncapped', { used: totalPoints });
  const showAdvanceButton = canManageSprint && isSprintExecutionPhase(sprint.status ?? null);
  const nextPhaseLabel = getNextSprintPhase(sprint.status ?? 'planning');
  const reviewDeadlineAt = sprint.review_started_at
    ? new Date(new Date(sprint.review_started_at).getTime() + 72 * 60 * 60 * 1000).toISOString()
    : null;
  const phaseDeadlineAt =
    sprint.status === 'review'
      ? reviewDeadlineAt
      : sprint.status === 'dispute_window'
        ? sprint.dispute_window_ends_at
        : null;
  const formatTimeRemaining = (deadlineIso: string): string => {
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
  const phaseTimeRemaining = phaseDeadlineAt ? formatTimeRemaining(phaseDeadlineAt) : null;
  const currentPhase = (sprint.status ?? 'planning') as (typeof SPRINT_PHASE_SEQUENCE)[number];
  const currentPhaseIndex = SPRINT_PHASE_SEQUENCE.indexOf(currentPhase);
  const hasUnassignedTasks = tasks.some((task) => !task.assignee_id);
  const hasIncompleteTasks = completeStats.incompleteTasks > 0;
  const deadlineOpen =
    phaseDeadlineAt != null ? new Date(phaseDeadlineAt).getTime() > Date.now() : false;
  const settlementBlocked = Boolean(sprint.settlement_blocked_reason);
  const readinessChecks = [
    {
      key: 'tasks',
      label: t('checkTasksAssigned'),
      ok: !hasUnassignedTasks,
    },
    {
      key: 'completion',
      label: t('checkCompletionReady'),
      ok: !hasIncompleteTasks || currentPhase !== 'settlement',
    },
    {
      key: 'deadline',
      label: t('checkDeadlineWindow'),
      ok: !deadlineOpen,
    },
    {
      key: 'settlement',
      label: t('checkSettlementBlocked'),
      ok: !settlementBlocked,
    },
  ];

  const normalizeDate = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const burndownDays = (() => {
    const start = normalizeDate(new Date(sprint.start_at));
    const end = normalizeDate(new Date(sprint.end_at));
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  })();

  const burndownActual = burndownDays.map((day) => {
    const completedPointsByDay = tasks
      .filter((task) => task.status === 'done')
      .reduce((sum, task) => {
        const completedDate = task.completed_at || task.updated_at;
        if (!completedDate) return sum;
        const completedDay = normalizeDate(new Date(completedDate));
        if (completedDay <= day) {
          return sum + (task.points || 0);
        }
        return sum;
      }, 0);
    return Math.max(totalPoints - completedPointsByDay, 0);
  });

  const burndownIdeal = burndownDays.map((_, index) => {
    if (burndownDays.length <= 1) return totalPoints;
    const ratio = index / (burndownDays.length - 1);
    return Math.max(Math.round(totalPoints * (1 - ratio)), 0);
  });

  const chartWidth = 640;
  const chartHeight = 220;
  const chartPadding = 24;
  const chartMax = Math.max(totalPoints, 1);
  const scaleX = (index: number) => {
    if (burndownDays.length <= 1) return chartPadding;
    const usableWidth = chartWidth - chartPadding * 2;
    return chartPadding + (usableWidth * index) / (burndownDays.length - 1);
  };
  const scaleY = (value: number) => {
    const usableHeight = chartHeight - chartPadding * 2;
    return chartPadding + usableHeight * (1 - value / chartMax);
  };
  const buildPolyline = (values: number[]) =>
    values.map((value, index) => `${scaleX(index)},${scaleY(value)}`).join(' ');

  return (
    <PageContainer width="wide">
      <div className="space-y-5" data-testid="sprint-detail-page">
      {/* Back link */}
      <Link
        href="/sprints"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('backToSprints')}
      </Link>

      {/* GitHub-style issue header */}
      <div className="rounded-md border border-gray-200 bg-white" data-testid="sprint-detail-header">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2.5">
                <Milestone className="h-5 w-5 text-gray-400" />
                <h1 className="text-xl font-semibold text-gray-900">{sprint.name}</h1>
              </div>
              {sprint.goal && (
                <p className="mt-1 ml-7.5 text-sm text-gray-500">{sprint.goal}</p>
              )}
              {/* Metadata row */}
              <div className="mt-2 ml-7.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                    sprint.status === 'completed'
                      ? 'border-gray-300 bg-gray-50 text-gray-600'
                      : 'border-green-300 bg-green-50 text-green-700'
                  }`}
                >
                  {t(`status.${sprint.status ?? 'planning'}`)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(sprint.start_at)} - {formatDate(sprint.end_at)}
                </span>
                <span>{getDuration(sprint.start_at, sprint.end_at)}</span>
                <span>{capacityUsedLabel}</span>
              </div>

              {phaseDeadlineAt && (
                <div className="mt-2 ml-7.5 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                  <Timer className="h-3 w-3" />
                  {t('phaseTimeRemaining', { time: phaseTimeRemaining ?? t('phaseDeadlinePassed') })}
                </div>
              )}

              {sprint.settlement_blocked_reason && (
                <div className="mt-2 ml-7.5 inline-flex items-center gap-1.5 rounded-md border-l-2 border-l-red-500 bg-red-50 px-2 py-1 text-xs text-red-700">
                  {t('settlementBlocked', { reason: sprint.settlement_blocked_reason })}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5">
              {canManageSprint && sprint.status === 'planning' && (
                <button
                  onClick={() => setShowStartDialog(true)}
                  className="flex items-center gap-1 rounded-md border border-green-600 bg-green-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700"
                  title={t('startSprint')}
                >
                  <Play className="h-3 w-3" />
                  {t('startSprint')}
                </button>
              )}
              {showAdvanceButton && (
                <button
                  onClick={() => {
                    if (sprint.status === 'settlement') {
                      setShowCompleteDialog(true);
                      return;
                    }
                    void handleCompleteSprint();
                  }}
                  className="flex items-center gap-1 rounded-md border border-blue-600 bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {sprint.status === 'settlement'
                    ? t('completeSprint')
                    : t('advancePhaseButton', {
                        phase: nextPhaseLabel ? t(`status.${nextPhaseLabel}`) : t('status.review'),
                      })}
                </button>
              )}
              {canManageSprint && sprint.status !== 'completed' && (
                <button
                  onClick={openEditModal}
                  className="rounded-md border border-gray-300 p-1.5 text-gray-500 transition-colors hover:bg-gray-50"
                  title={t('editSprint')}
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
              )}
              {profile?.role === 'admin' && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-md border border-red-200 p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title={t('deleteSprint')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* GitHub milestone-style progress bar */}
        <div className="px-5 py-3">
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
            {progressPercentage > 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white mix-blend-difference">
                {progressPercentage}%
              </span>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex divide-x divide-gray-200 border-t border-gray-200 text-center text-xs">
          <div className="flex-1 py-2">
            <span className="font-semibold text-gray-900">{totalTasks}</span>
            <span className="ml-1 text-gray-500">{t('totalTasks')}</span>
          </div>
          <div className="flex-1 py-2">
            <span className="font-semibold text-green-600">{completedTasks}</span>
            <span className="ml-1 text-gray-500">{t('completed')}</span>
          </div>
          <div className="flex-1 py-2">
            <span className="font-semibold text-blue-600">{inProgressTasks}</span>
            <span className="ml-1 text-gray-500">{t('inProgress')}</span>
          </div>
          <div className="flex-1 py-2">
            <span className="font-semibold text-gray-900">{completedPoints}/{totalPoints}</span>
            <span className="ml-1 text-gray-500">pts</span>
          </div>
          <div className="flex-1 py-2">
            <span className="font-semibold text-gray-900">
              {sprint.capacity_points != null ? sprint.capacity_points : t('uncapped')}
            </span>
            <span className="ml-1 text-gray-500">{t('capacity')}</span>
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-5 xl:grid-cols-[2.05fr_1fr]"
        data-testid="sprint-detail-operator-grid"
      >
        <div className="space-y-5">
          {/* Snapshot for completed sprints */}
          {sprint.status === 'completed' && snapshot && <SprintSnapshotCard snapshot={snapshot} />}

          {/* Burndown Chart */}
          <div className="rounded-md border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">{t('burndownTitle')}</h2>
              <div className="flex items-center gap-4 text-[10px] text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="block h-0.5 w-3 bg-gray-300"></span>
                  {t('burndownIdeal')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="block h-0.5 w-3 bg-green-500"></span>
                  {t('burndownActual')}
                </span>
              </div>
            </div>
            {totalPoints === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">{t('burndownEmpty')}</div>
            ) : (
              <div className="w-full overflow-x-auto p-4">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="h-48 w-full"
                  role="img"
                  aria-label={t('burndownChartLabel')}
                >
                  {/* Grid pattern */}
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect x={chartPadding} y={chartPadding} width={chartWidth - chartPadding * 2} height={chartHeight - chartPadding * 2} fill="url(#grid)" rx="4" />

                  <line
                    x1={chartPadding}
                    y1={chartPadding}
                    x2={chartPadding}
                    y2={chartHeight - chartPadding}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <line
                    x1={chartPadding}
                    y1={chartHeight - chartPadding}
                    x2={chartWidth - chartPadding}
                    y2={chartHeight - chartPadding}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <polyline
                    fill="none"
                    stroke="#d1d5db"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    points={buildPolyline(burndownIdeal)}
                  />
                  <polyline
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={buildPolyline(burndownActual)}
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Tasks List — GitHub issue list style */}
          <div className="rounded-md border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">{t('sprintTasks')}</h2>
            </div>

            {tasks.length === 0 ? (
              <div className="py-12 text-center">
                <Circle className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                <h3 className="text-sm font-medium text-gray-900">{t('noTasksTitle')}</h3>
                <p className="mt-0.5 text-xs text-gray-500">{t('noTasksDescription')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
                  >
                    {/* Status icon */}
                    {getTaskStatusIcon(task.status)}

                    {/* Title + metadata */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 hover:text-blue-600">
                        {task.title}
                      </span>
                    </div>

                    {/* Priority label */}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        task.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : task.priority === 'medium'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {t(`priority.${task.priority}`)}
                    </span>

                    {/* Points badge */}
                    <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                      {t('pointsLabel', { points: task.points ?? 0 })}
                    </span>

                    {/* Assignee avatar */}
                    {task.assignee && (
                      <div className="flex items-center gap-1.5" title={getDisplayName(task.assignee)}>
                        {task.assignee.avatar_url ? (
                          <Image
                            src={task.assignee.avatar_url}
                            alt={getDisplayName(task.assignee)}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-[10px] font-bold text-white">
                            {getDisplayName(task.assignee)[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Phase timeline — GitHub metadata sidebar style */}
          <section
            className="rounded-md border border-gray-200 bg-white"
            data-testid="sprint-detail-phase-timeline"
          >
            <div className="border-b border-gray-200 px-4 py-2.5">
              <p className="text-xs font-semibold text-gray-500">{t('phaseTimelineTitle')}</p>
            </div>
            <div className="px-4 py-3 space-y-1">
              {SPRINT_PHASE_SEQUENCE.map((phase, index) => {
                const isCurrent = currentPhaseIndex === index;
                const isComplete = currentPhaseIndex > -1 && index < currentPhaseIndex;
                return (
                  <div
                    key={phase}
                    className="flex items-center gap-2 py-1"
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : isCurrent ? (
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-blue-500 bg-blue-100" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-gray-300" />
                    )}
                    <span className={`text-xs ${
                      isCurrent
                        ? 'font-semibold text-blue-600'
                        : isComplete
                          ? 'text-green-600'
                          : 'text-gray-400'
                    }`}>
                      {t(`status.${phase}`)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Health panel — merged settlement + readiness as GitHub Checks */}
          <section
            className="rounded-md border border-gray-200 bg-white"
            data-testid="sprint-detail-blockers-panel"
          >
            <div className="flex items-center gap-1.5 border-b border-gray-200 px-4 py-2.5">
              {settlementBlocked ? (
                <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
              )}
              <p className="text-xs font-semibold text-gray-500">{t('readinessChecklistTitle')}</p>
            </div>

            {/* Settlement status */}
            <div
              className={`flex items-center gap-2 border-b border-gray-100 px-4 py-2 text-xs ${
                settlementBlocked ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {settlementBlocked ? (
                <AlertCircle className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>
                {settlementBlocked
                  ? t('blockersPanelActive', { reason: sprint.settlement_blocked_reason ?? '' })
                  : t('blockersPanelClear')}
              </span>
            </div>

            {/* Readiness checks */}
            <div className="px-4 py-2 space-y-1">
              {readinessChecks.map((item) => (
                <div
                  key={item.key}
                  data-testid={`sprint-readiness-item-${item.key}`}
                  className="flex items-center gap-2 py-1 text-xs"
                >
                  {item.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span className={item.ok ? 'text-gray-600' : 'text-amber-700'}>{item.label}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Edit Sprint Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <h3 className="text-base font-semibold text-gray-900">{t('editSprintTitle')}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('formName')}
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={t('formNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('formGoal')}
                </label>
                <textarea
                  rows={2}
                  value={editForm.goal}
                  onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder={t('formGoalPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('formStartDate')}
                  </label>
                  <input
                    type="date"
                    value={editForm.start_at}
                    onChange={(e) => setEditForm({ ...editForm, start_at: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('formEndDate')}
                  </label>
                  <input
                    type="date"
                    value={editForm.end_at}
                    onChange={(e) => setEditForm({ ...editForm, end_at: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('formCapacity')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.capacity_points}
                  onChange={(e) => setEditForm({ ...editForm, capacity_points: e.target.value })}
                  placeholder={t('formCapacityPlaceholder')}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-gray-400">{t('formCapacityHelper')}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={isSaving}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleEditSprint}
                disabled={isSaving || !editForm.name || !editForm.start_at || !editForm.end_at}
                className="flex items-center gap-1.5 rounded-md border border-green-600 bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {isSaving ? t('saving') : t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">{t('deleteTitle')}</h3>
            <p className="mt-2 text-sm text-gray-600">{t('deleteDescription')}</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeleteSprint}
                disabled={isDeleting}
                className="rounded-md border border-red-600 bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? t('deleting') : t('deleteSprint')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Sprint Dialog */}
      {showStartDialog && sprint && (
        <SprintStartDialog
          open={showStartDialog}
          sprint={sprint}
          taskCount={tasks.length}
          loading={startSprintMutation.isPending}
          onClose={() => setShowStartDialog(false)}
          onConfirm={handleStartSprint}
        />
      )}

      {/* Complete Sprint Dialog */}
      {showCompleteDialog && sprint && (
        <SprintCompleteDialog
          open={showCompleteDialog}
          sprint={sprint}
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
