'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/context';

import { Calendar, Clock, CheckCircle2, Plus, Target, X, AlertCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { TaskBoard, TaskBoardTask, TaskStatus } from '@/components/tasks/task-board';
import { useSearchParams } from 'next/navigation';

type Sprint = {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
  status: 'planning' | 'active' | 'completed';
  created_at: string;
};

type CreateSprintForm = {
  name: string;
  start_at: string;
  end_at: string;
  status: 'planning' | 'active' | 'completed';
};

type SprintStats = {
  [sprintId: string]: {
    total: number;
    completed: number;
    inProgress: number;
    points: number;
  };
};

export default function SprintsPage() {
  const { user, profile } = useAuth();
  const t = useTranslations('Sprints');
  const tTasks = useTranslations('Tasks');
  const searchParams = useSearchParams();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintStats, setSprintStats] = useState<SprintStats>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'board' | 'list'>('board');
  const [currentSprintTasks, setCurrentSprintTasks] = useState<TaskBoardTask[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<TaskBoardTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [selectedBacklogIds, setSelectedBacklogIds] = useState<string[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [contributorCounts, setContributorCounts] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState<CreateSprintForm>({
    name: '',
    start_at: '',
    end_at: '',
    status: 'planning',
  });

  useEffect(() => {
    if (user) {
      fetchSprints();
    }
  }, [user]);

  const fetchSprints = async () => {
    try {
      const supabase = createClient();

      const { data: sprints, error } = await supabase
        .from('sprints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sprints:', error);
      } else {
        setSprints(sprints || []);

        // Fetch task stats for each sprint
        if (sprints && sprints.length > 0) {
          const stats: SprintStats = {};

          for (const sprint of sprints) {
            const { data: tasks } = await supabase
              .from('tasks')
              .select('id, status, points')
              .eq('sprint_id', sprint.id);

            if (tasks) {
              stats[sprint.id] = {
                total: tasks.length,
                completed: tasks.filter((t) => t.status === 'done').length,
                inProgress: tasks.filter((t) => t.status === 'in_progress').length,
                points: tasks
                  .filter((t) => t.status === 'done')
                  .reduce((sum, t) => sum + (t.points || 0), 0),
              };
            }
          }

          setSprintStats(stats);
        }
      }
    } catch (error) {
      console.error('Error fetching sprints:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      planning: 'bg-blue-100 text-blue-700 border-blue-200',
      active: 'bg-green-100 text-green-700 border-green-200',
      completed: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return styles[status as keyof typeof styles] || styles.planning;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Target className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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
    return `${days} days`;
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const supabase = createClient();

      // Check if user is council or admin
      if (!profile || !['council', 'admin'].includes(profile.role)) {
        throw new Error(t('errorOnlyCouncil'));
      }

      // Create the sprint directly with Supabase client
      const { data: sprint, error: insertError } = await supabase
        .from('sprints')
        .insert({
          name: formData.name,
          start_at: formData.start_at,
          end_at: formData.end_at,
          status: formData.status || 'planning',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating sprint:', insertError);
        throw new Error(insertError.message || 'Failed to create sprint');
      }

      // Reset form and close modal
      setFormData({
        name: '',
        start_at: '',
        end_at: '',
        status: 'planning',
      });
      setShowCreateModal(false);

      // Refresh sprints list
      await fetchSprints();
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
    });
  };

  const canCreateSprint = profile?.role === 'admin' || profile?.role === 'council';
  const canManageTasks = profile?.role === 'admin';

  // Separate current/active sprint from past sprints
  const currentSprint =
    sprints.find((s) => s.status === 'active') || sprints.find((s) => s.status === 'planning');
  const pastSprints = sprints.filter((s) => s.status === 'completed');
  const boardTasks = currentSprintTasks.filter((task) => task.status !== 'backlog');
  const canAssignToSprint = profile?.role === 'admin' && currentSprint?.status === 'planning';
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
    }
  }, [searchParams]);

  useEffect(() => {
    setSelectedBacklogIds([]);
  }, [currentSprint?.id, profile?.role]);

  useEffect(() => {
    const loadTasks = async () => {
      setTasksLoading(true);
      try {
        const supabase = createClient();

        let sprintTasks: TaskBoardTask[] = [];
        if (currentSprint) {
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
            .eq('sprint_id', currentSprint.id)
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
            )
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
  }, [currentSprint, profile?.role]);

  const assignTasksToSprint = async (taskIds: string[]) => {
    if (!currentSprint || taskIds.length === 0) return;
    setIsMoving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ sprint_id: currentSprint.id, status: 'todo' })
        .in('id', taskIds);

      if (updateError) throw updateError;

      const movedTasks = backlogTasks
        .filter((task) => taskIds.includes(task.id))
        .map((task) => ({
          ...task,
          sprint_id: currentSprint.id,
          status: 'todo' as TaskStatus,
          sprints: { name: currentSprint.name },
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
    if (!canManageTasks) return;
    const sprintTask = currentSprintTasks.find((task) => task.id === taskId);
    if (!sprintTask) return;

    setIsMoving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ sprint_id: null, status: 'backlog' })
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

  const getActivityCounts = (taskId: string) => ({
    comments: commentCounts[taskId] ?? 0,
    submissions: submissionCounts[taskId] ?? 0,
    contributors: contributorCounts[taskId] ?? 0,
  });

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === 'backlog') {
      await handleDropToBacklog(taskId);
      return;
    }
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: newStatus })
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-600 mt-1">{t('subtitle')}</p>
          </div>
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

        {loading ? (
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
            <div className="flex items-center gap-2 mb-6">
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
            </div>

            {activeView === 'board' ? (
              currentSprint ? (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500">{t('currentSprint')}</p>
                      <h2 className="text-xl font-semibold text-gray-900">{currentSprint.name}</h2>
                      <div className="text-sm text-gray-500">
                        {formatDate(currentSprint.start_at)} - {formatDate(currentSprint.end_at)}
                      </div>
                    </div>
                    <Link
                      href={`/sprints/${currentSprint.id}`}
                      className="inline-flex items-center gap-2 text-organic-orange font-medium hover:text-orange-600"
                    >
                      {t('viewDetails')}
                      <Target className="w-4 h-4" />
                    </Link>
                  </div>

                  <TaskBoard
                    tasks={boardTasks}
                    loading={tasksLoading}
                    canManage={canManageTasks}
                    onStatusChange={updateTaskStatus}
                    onExternalDrop={handleDropToSprint}
                    moveTargets={['backlog', 'todo', 'in_progress', 'review', 'done']}
                    activityCounts={activityCountsMap}
                    excludeStatuses={['backlog']}
                  />

                  <div
                    className="mt-8 bg-white rounded-xl border border-gray-200"
                    onDragOver={(event) => {
                      if (!canManageTasks) return;
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      if (!canManageTasks) return;
                      const taskId =
                        event.dataTransfer.getData('text/task-id') ||
                        event.dataTransfer.getData('text/plain');
                      if (taskId) {
                        handleDropToBacklog(taskId);
                      }
                    }}
                  >
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {tTasks('column.backlog')}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          {tTasks('listCount', { count: backlogTasks.length })}
                        </span>
                        {canAssignToSprint && (
                          <button
                            onClick={handleMoveSelected}
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
                          if (!canManageTasks) return;
                          event.preventDefault();
                        }}
                        onDrop={(event) => {
                          if (!canManageTasks) return;
                          const taskId =
                            event.dataTransfer.getData('text/task-id') ||
                            event.dataTransfer.getData('text/plain');
                          if (taskId) {
                            handleDropToBacklog(taskId);
                          }
                        }}
                      >
                        {backlogTasks.map((task) => {
                          const isOverdue =
                            task.due_date &&
                            new Date(task.due_date) < new Date() &&
                            task.status !== 'done';
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
                                    onChange={(event) => {
                                      const isChecked = event.target.checked;
                                      setSelectedBacklogIds((prev) =>
                                        isChecked
                                          ? [...prev, task.id]
                                          : prev.filter((id) => id !== task.id)
                                      );
                                    }}
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
                                          ? tTasks('assigneeId', {
                                              id: task.assignee.organic_id,
                                            })
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
                                    {(() => {
                                      const activity = getActivityCounts(task.id);
                                      return (
                                        <>
                                          <span>💬 {activity.comments}</span>
                                          <span>📤 {activity.submissions}</span>
                                          <span>👥 {activity.contributors}</span>
                                        </>
                                      );
                                    })()}
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
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('noCurrentSprint')}</p>
                </div>
              )
            ) : (
              <>
                {/* Current Sprint Canvas */}
                {currentSprint &&
                  (() => {
                    const stats = sprintStats[currentSprint.id] || {
                      total: 0,
                      completed: 0,
                      inProgress: 0,
                      points: 0,
                    };
                    const progress =
                      stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

                    return (
                      <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                          {t('currentSprint')}
                        </h2>
                        <Link
                          href={`/sprints/${currentSprint.id}`}
                          className="block bg-gradient-to-br from-organic-orange/5 via-organic-yellow/5 to-white border-2 border-organic-orange/20 rounded-2xl p-8 hover:shadow-xl transition-all group"
                        >
                          {/* Sprint Header */}
                          <div className="flex items-start justify-between mb-6">
                            <div>
                              <h3 className="text-2xl font-bold text-gray-900 group-hover:text-organic-orange transition-colors mb-2">
                                {currentSprint.name}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-organic-orange" />
                                  <span>
                                    {formatDate(currentSprint.start_at)} -{' '}
                                    {formatDate(currentSprint.end_at)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-organic-orange" />
                                  <span>
                                    {getDuration(currentSprint.start_at, currentSprint.end_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span
                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border-2 ${
                                currentSprint.status === 'active'
                                  ? 'bg-green-100 text-green-700 border-green-300'
                                  : 'bg-blue-100 text-blue-700 border-blue-300'
                              }`}
                            >
                              {getStatusIcon(currentSprint.status)}
                              {t(`status.${currentSprint.status}`)}
                            </span>
                          </div>

                          {/* Progress Section */}
                          <div className="bg-white/80 backdrop-blur rounded-xl p-6 border border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700">
                                {t('progressLabel')}
                              </span>
                              <span className="text-2xl font-bold text-organic-orange">
                                {progress}%
                              </span>
                            </div>
                            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
                              <div
                                className="h-full bg-gradient-to-r from-organic-orange to-organic-yellow transition-all"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">
                                  {stats.total}
                                </div>
                                <div className="text-xs text-gray-500">{t('totalTasks')}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                  {stats.completed}
                                </div>
                                <div className="text-xs text-gray-500">{t('completed')}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                  {stats.inProgress}
                                </div>
                                <div className="text-xs text-gray-500">{t('inProgress')}</div>
                              </div>
                            </div>
                          </div>

                          {/* View Details Link */}
                          <div className="mt-6 text-center">
                            <span className="inline-flex items-center gap-2 text-organic-orange font-medium group-hover:gap-3 transition-all">
                              {t('viewDetails')}
                              <Target className="w-4 h-4" />
                            </span>
                          </div>
                        </Link>
                      </div>
                    );
                  })()}

                {/* Past Sprints */}
                {pastSprints.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('pastSprints')}</h2>
                    <div className="space-y-3">
                      {pastSprints.map((sprint) => {
                        const stats = sprintStats[sprint.id] || {
                          total: 0,
                          completed: 0,
                          inProgress: 0,
                          points: 0,
                        };

                        return (
                          <Link
                            key={sprint.id}
                            href={`/sprints/${sprint.id}`}
                            className="block bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-organic-orange transition-colors mb-1">
                                  {sprint.name}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>
                                      {formatDate(sprint.start_at)} - {formatDate(sprint.end_at)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{getDuration(sprint.start_at, sprint.end_at)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-sm font-medium text-gray-900">
                                    {t('tasksCompleted', {
                                      completed: stats.completed,
                                      total: stats.total,
                                    })}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {t('pointsEarned', { points: stats.points })}
                                  </div>
                                </div>
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No Past Sprints Message */}
                {!currentSprint && pastSprints.length === 0 && sprints.length > 0 && (
                  <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">{t('noPastSprints')}</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Create Sprint Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t('modalTitle')}</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateSprint} className="space-y-4">
              {/* Sprint Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('formName')}
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('formNamePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
                />
              </div>

              {/* Start Date */}
              <div>
                <label htmlFor="start_at" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('formStartDate')}
                </label>
                <input
                  type="date"
                  id="start_at"
                  required
                  value={formData.start_at}
                  onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
                />
              </div>

              {/* End Date */}
              <div>
                <label htmlFor="end_at" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('formEndDate')}
                </label>
                <input
                  type="date"
                  id="end_at"
                  required
                  value={formData.end_at}
                  onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
                />
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('formStatus')}
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'planning' | 'active' | 'completed',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
                >
                  <option value="planning">{t('status.planning')}</option>
                  <option value="active">{t('status.active')}</option>
                  <option value="completed">{t('status.completed')}</option>
                </select>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t('creating')}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {t('createSprint')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
