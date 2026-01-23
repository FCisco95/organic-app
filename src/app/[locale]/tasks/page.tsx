'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/context';

import { createClient } from '@/lib/supabase/client';
import { Plus, AlertCircle, Clock, Tag, User, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
type TaskTab = 'all' | 'backlog' | 'activeSprint' | 'completed';

type Task = {
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

type TaskSubmissionSummary = {
  task_id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
  } | null;
};

type Assignee = {
  id: string;
  email: string;
  organic_id: number | null;
  role: string;
};

type Sprint = {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
  status: 'planning' | 'active' | 'completed';
  created_at: string;
};

export default function TasksPage() {
  const { user, profile } = useAuth();
  const t = useTranslations('Tasks');
  const standardLabels = ['📣 Growth', '🎨 Design', '💻 Dev', '🧠 Research'];
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeView, setActiveView] = useState<TaskTab>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [contributorFilter, setContributorFilter] = useState('all');
  const [sprintFilter, setSprintFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [submissions, setSubmissions] = useState<TaskSubmissionSummary[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedTasks, setLikedTasks] = useState<Record<string, boolean>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [contributorCounts, setContributorCounts] = useState<Record<string, number>>({});

  const isOrgMember = !!profile?.organic_id;
  const canManage = profile?.role === 'admin';
  const canReview = !!profile?.role && ['admin', 'council'].includes(profile.role);
  const canLike = !!profile?.role && ['member', 'council', 'admin'].includes(profile.role);

  const loadSprints = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSprints(data || []);
    } catch (error) {
      console.error('Error loading sprints:', error);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
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
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data as unknown as Task[]);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubmissions = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: submissionRows, error } = await supabase
        .from('task_submissions')
        .select('task_id, user_id');

      if (error) throw error;

      const userIds = Array.from(
        new Set((submissionRows ?? []).map((row) => row.user_id).filter(Boolean))
      );
      const { data: users, error: usersError } = userIds.length
        ? await supabase
            .from('user_profiles')
            .select('id, name, email, organic_id')
            .in('id', userIds)
        : { data: [], error: null };

      if (usersError) throw usersError;

      const userMap = new Map((users ?? []).map((user) => [user.id, user]));
      const summaries = (submissionRows ?? []).map((row) => ({
        task_id: row.task_id,
        user: userMap.get(row.user_id) ?? null,
      }));

      setSubmissions(summaries as TaskSubmissionSummary[]);
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  }, []);

  const loadCommentCounts = useCallback(async (taskIds: string[]) => {
    if (taskIds.length === 0) {
      setCommentCounts({});
      return;
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('task_comments')
        .select('task_id')
        .in('task_id', taskIds);

      if (error) throw error;

      const counts = (data ?? []).reduce<Record<string, number>>((acc, row) => {
        const taskId = (row as { task_id: string }).task_id;
        acc[taskId] = (acc[taskId] ?? 0) + 1;
        return acc;
      }, {});
      setCommentCounts(counts);
    } catch (error) {
      console.error('Error loading comment counts:', error);
    }
  }, []);

  const loadLikes = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('task_likes').select('task_id, user_id');

      if (error) throw error;

      const counts: Record<string, number> = {};
      const liked: Record<string, boolean> = {};
      (data ?? []).forEach((like) => {
        const taskId = (like as { task_id: string }).task_id;
        const userId = (like as { user_id: string }).user_id;
        counts[taskId] = (counts[taskId] ?? 0) + 1;
        if (user?.id && userId === user.id) {
          liked[taskId] = true;
        }
      });

      setLikeCounts(counts);
      setLikedTasks(liked);
    } catch (error) {
      console.error('Error loading task likes:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSprints();
  }, [loadSprints]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const taskIds = tasks.map((task) => task.id);
    loadCommentCounts(taskIds);
  }, [loadCommentCounts, tasks]);

  useEffect(() => {
    loadSubmissions();
    loadLikes();
  }, [loadSubmissions, loadLikes]);

  useEffect(() => {
    const submissionCountMap = submissions.reduce<Record<string, number>>((acc, submission) => {
      acc[submission.task_id] = (acc[submission.task_id] ?? 0) + 1;
      return acc;
    }, {});
    const contributorCountMap = submissions.reduce<Record<string, Set<string>>>((acc, submission) => {
      if (!submission.user?.id) return acc;
      acc[submission.task_id] = acc[submission.task_id] ?? new Set<string>();
      acc[submission.task_id].add(submission.user.id);
      return acc;
    }, {});

    setSubmissionCounts(submissionCountMap);
    setContributorCounts(
      Object.fromEntries(
        Object.entries(contributorCountMap).map(([taskId, userSet]) => [
          taskId,
          userSet.size,
        ])
      )
    );
  }, [submissions]);

  const currentSprint =
    sprints.find((s) => s.status === 'active') || sprints.find((s) => s.status === 'planning');
  const tabOptions: TaskTab[] = ['all', 'backlog', 'activeSprint', 'completed'];
  const visibleTabs = isOrgMember ? tabOptions : tabOptions.filter((tab) => tab !== 'backlog');
  const categoryOptions = [
    ...standardLabels,
    ...Array.from(
      new Set(
        tasks
          .flatMap((task) => task.labels ?? [])
          .filter((label) => !standardLabels.includes(label))
      )
    ).sort((a, b) => a.localeCompare(b)),
  ];
  const contributorOptions = Array.from(
    submissions.reduce((map, submission) => {
      if (submission.user?.id) {
        map.set(submission.user.id, submission.user);
      }
      return map;
    }, new Map<string, TaskSubmissionSummary['user']>())
  )
    .map((entry) => entry[1])
    .filter((user): user is NonNullable<TaskSubmissionSummary['user']> => !!user)
    .sort((a, b) => {
      const nameA = a.name ?? a.email;
      const nameB = b.name ?? b.email;
      return nameA.localeCompare(nameB);
    });
  const taskContributorMap = submissions.reduce<Record<string, string[]>>((acc, submission) => {
    if (!submission.user?.id) return acc;
    acc[submission.task_id] = acc[submission.task_id] ?? [];
    if (!acc[submission.task_id].includes(submission.user.id)) {
      acc[submission.task_id].push(submission.user.id);
    }
    return acc;
  }, {});

  useEffect(() => {
    if (!isOrgMember && activeView === 'backlog') {
      setActiveView('all');
    }
  }, [activeView, isOrgMember]);

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

  const getAssigneeLabel = (assignee: Task['assignee']) => {
    if (!assignee) return t('unassigned');
    return assignee.organic_id ? t('assigneeId', { id: assignee.organic_id }) : assignee.email;
  };

  const getContributorLabel = (user: TaskSubmissionSummary['user']) => {
    if (!user) return t('unknownContributor');
    if (user.organic_id) return t('assigneeId', { id: user.organic_id });
    return user.name ?? user.email;
  };

  const tabStatusMap: Record<TaskTab, TaskStatus[]> = {
    all: ['backlog', 'todo', 'in_progress', 'review', 'done'],
    backlog: ['backlog'],
    activeSprint: ['todo', 'in_progress', 'review', 'done'],
    completed: ['done'],
  };

  const isVisibleToNonOrg = (status: TaskStatus) =>
    ['todo', 'in_progress', 'review', 'done'].includes(status);

  const parseDate = (value: string | null) => (value ? new Date(value) : null);

  const applyFilters = (source: Task[], tab: TaskTab) => {
    return source
      .filter((task) => {
        const matchesSearch =
          searchFilter.trim().length === 0 ||
          task.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
          (task.description ?? '').toLowerCase().includes(searchFilter.toLowerCase());
        const matchesCategory =
          categoryFilter === 'all' || (task.labels ?? []).includes(categoryFilter);
        const matchesContributor =
          contributorFilter === 'all' ||
          (taskContributorMap[task.id] ?? []).includes(contributorFilter);
        const matchesSprint =
          tab === 'backlog'
            ? task.sprint_id === null
            : tab === 'activeSprint'
              ? !!currentSprint && task.sprint_id === currentSprint.id
              : sprintFilter === 'all' || task.sprint_id === sprintFilter;

        const dateTarget =
          tab === 'completed'
            ? parseDate(task.completed_at) ?? parseDate(task.created_at)
            : parseDate(task.created_at);

        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
        const matchesDate =
          !dateTarget ||
          ((!fromDate || dateTarget >= fromDate) && (!toDate || dateTarget <= toDate));

        return (
          matchesSearch &&
          matchesCategory &&
          matchesContributor &&
          matchesSprint &&
          matchesDate
        );
      })
      .sort((a, b) => {
        const activityA = parseDate(a.created_at)?.getTime() ?? 0;
        const activityB = parseDate(b.created_at)?.getTime() ?? 0;

        if (tab === 'completed') {
          const completedA = parseDate(a.completed_at)?.getTime() ?? activityA;
          const completedB = parseDate(b.completed_at)?.getTime() ?? activityB;
          return completedB - completedA;
        }

        if (tab === 'backlog') {
          const likesA = likeCounts[a.id] ?? 0;
          const likesB = likeCounts[b.id] ?? 0;
          if (likesB !== likesA) return likesB - likesA;
        }

        return activityB - activityA;
      });
  };

  const getTabTasks = (tab: TaskTab) => {
    const filteredByStatus = tasks.filter((task) => tabStatusMap[tab].includes(task.status));
    const visibleByRole = isOrgMember
      ? filteredByStatus
      : filteredByStatus.filter((task) => isVisibleToNonOrg(task.status));

    return applyFilters(visibleByRole, tab);
  };

  const tabTasks = getTabTasks(activeView);

  const getActivityCounts = (taskId: string) => ({
    comments: commentCounts[taskId] ?? 0,
    submissions: submissionCounts[taskId] ?? 0,
    contributors: contributorCounts[taskId] ?? 0,
  });

  const handleToggleLike = async (taskId: string) => {
    if (!user || !canLike) return;

    const supabase = createClient();
    const isLiked = likedTasks[taskId];

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('task_likes')
          .delete()
          .eq('task_id', taskId)
          .eq('user_id', user.id);

        if (error) throw error;
        setLikedTasks((prev) => ({ ...prev, [taskId]: false }));
        setLikeCounts((prev) => ({ ...prev, [taskId]: Math.max((prev[taskId] ?? 1) - 1, 0) }));
      } else {
        const { error } = await supabase.from('task_likes').insert({
          task_id: taskId,
          user_id: user.id,
        });

        if (error) throw error;
        setLikedTasks((prev) => ({ ...prev, [taskId]: true }));
        setLikeCounts((prev) => ({ ...prev, [taskId]: (prev[taskId] ?? 0) + 1 }));
      }
    } catch (error) {
      console.error('Error toggling task like:', error);
    }
  };

  async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)));
      toast.success(t('toastTaskUpdated'));
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error(t('toastTaskUpdateFailed'));
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-600 mt-1">{t('subtitle')}</p>
          </div>

          <div className="flex gap-3">
            {canReview && (
              <Link
                href="/admin/submissions"
                className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors hover:bg-gray-50"
              >
                {t('reviewQueue')}
              </Link>
            )}
            {canManage && (
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="flex items-center gap-2 bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('newTask')}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveView(tab)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                activeView === tab
                  ? 'bg-organic-orange text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {t(`tab.${tab}`)}
            </button>
          ))}
        </div>
        {activeView === 'backlog' && (
          <p className="mb-4 text-xs text-gray-500">{t('backlogSortHint')}</p>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium text-gray-700">{t('filters')}</div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              {t('search')}
              <input
                type="search"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                placeholder={t('searchPlaceholder')}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              {t('categoryFilter')}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="all">{t('allCategories')}</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              {t('contributorFilter')}
              <select
                value={contributorFilter}
                onChange={(e) => setContributorFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="all">{t('allContributors')}</option>
                {contributorOptions.map((contributor) => (
                  <option key={contributor.id} value={contributor.id}>
                    {getContributorLabel(contributor)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              {t('sprintFilter')}
              <select
                value={sprintFilter}
                onChange={(e) => setSprintFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="all">{t('allSprints')}</option>
                {sprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              {t('dateFrom')}
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              {t('dateTo')}
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              />
            </label>
          </div>
        </div>

        {/* Task List */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t(`tab.${activeView}`)}
              </h2>
              {sprintFilter !== 'all' && (
                <p className="text-sm text-gray-500">
                  {sprints.find((sprint) => sprint.id === sprintFilter)?.name ??
                    t('sprintUnknown')}
                </p>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {t('listCount', { count: tabTasks.length })}
            </span>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          ) : tabTasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {activeView === 'activeSprint' && !currentSprint
                ? t('noActiveSprint')
                : t('noTasksInView')}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tabTasks.map((task) => {
                const isOverdue =
                  task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                return (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-medium text-gray-900 hover:text-organic-orange transition-colors">
                            {task.title}
                          </h3>
                          {task.priority && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}
                            >
                              <AlertCircle className="w-3 h-3" />
                              {t(`priority.${task.priority}`)}
                            </span>
                          )}
                          {task.sprints && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                              {task.sprints.name}
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
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{getAssigneeLabel(task.assignee)}</span>
                            </div>
                          )}
                          {task.due_date && (
                            <div
                              className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}
                            >
                              <Clock className="w-3 h-3" />
                              {t('dueLabel', {
                                date: new Date(task.due_date).toLocaleDateString(),
                              })}
                              {isOverdue && ` (${t('overdue')})`}
                            </div>
                          )}
                          {task.labels && task.labels.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              <span>{task.labels.join(', ')}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
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
                      <div className="flex items-center gap-2">
                        {task.points && (
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                            {t('pointsShort', { points: task.points })}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            handleToggleLike(task.id);
                          }}
                          disabled={!canLike}
                          aria-label={
                            likedTasks[task.id] ? t('likedTask') : t('likeTask')
                          }
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${
                            likedTasks[task.id]
                              ? 'border-organic-orange text-organic-orange bg-orange-50'
                              : 'border-gray-200 text-gray-500 bg-white'
                          } ${canLike ? 'hover:border-organic-orange hover:text-organic-orange' : 'cursor-default'}`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              likedTasks[task.id] ? 'fill-organic-orange' : ''
                            }`}
                          />
                          {likeCounts[task.id] ?? 0}
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showNewTaskModal && (
        <NewTaskModal
          onClose={() => setShowNewTaskModal(false)}
          onSuccess={() => {
            setShowNewTaskModal(false);
            loadTasks();
          }}
          sprints={sprints}
          userId={user?.id ?? null}
        />
      )}

    </main>
  );
}

// New Task Modal Component
function NewTaskModal({
  onClose,
  onSuccess,
  sprints,
  userId,
}: {
  onClose: () => void;
  onSuccess: () => void;
  sprints: Sprint[];
  userId: string | null;
}) {
  const t = useTranslations('Tasks');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const standardLabels = ['📣 Growth', '🎨 Design', '💻 Dev', '🧠 Research'];

  // Load assignees
  useEffect(() => {
    async function fetchAssignees() {
      try {
        const response = await fetch('/api/tasks/assignees');
        const data = await response.json();
        setAssignees(data.assignees || []);
      } catch (error) {
        console.error('Error fetching assignees:', error);
      } finally {
        setLoadingAssignees(false);
      }
    }
    fetchAssignees();
  }, []);

  const handleAddLabel = () => {
    const nextLabel = labelInput.trim();
    if (nextLabel && !labels.includes(nextLabel)) {
      setLabels([...labels, nextLabel]);
    }
    setLabelInput('');
  };

  const handleToggleLabel = (label: string) => {
    if (labels.includes(label)) {
      setLabels(labels.filter((item) => item !== label));
    } else {
      setLabels([...labels, label]);
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter((l) => l !== labelToRemove));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(t('toastTitleRequired'));
      return;
    }

    try {
      if (!userId) {
        toast.error(t('toastTaskCreateFailed'));
        return;
      }

      setSubmitting(true);
      const supabase = createClient();

      const { error } = await supabase.from('tasks').insert({
        title: title.trim(),
        description: description.trim() || null,
        points: points ? parseInt(points) : null,
        sprint_id: sprintId || null,
        assignee_id: assigneeId || null,
        priority,
        due_date: dueDate || null,
        labels,
        status: 'backlog' as const,
      });

      if (error) throw error;

      toast.success(t('toastTaskCreated'));
      onSuccess();
    } catch (error) {
      const supabaseError = error as { message?: string };
      const message =
        error instanceof Error
          ? error.message
          : supabaseError?.message ?? t('toastTaskCreateFailed');
      console.error('Error creating task:', error);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('createTaskTitle')}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('labelTitle')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
              placeholder={t('placeholderTitle')}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('labelDescription')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none"
              placeholder={t('placeholderDescription')}
            />
          </div>

          {/* Priority and Points Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                {t('labelPriority')}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
              >
                <option value="low">{t('priority.low')}</option>
                <option value="medium">{t('priority.medium')}</option>
                <option value="high">{t('priority.high')}</option>
                <option value="critical">{t('priority.critical')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                {t('labelPoints')}
              </label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
                placeholder={t('pointsPlaceholder')}
                min="0"
              />
            </div>
          </div>

          {/* Assignee and Epoch Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                {t('labelAssignee')}
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
                disabled={loadingAssignees}
              >
                <option value="">{t('unassigned')}</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.organic_id
                      ? t('assigneeId', { id: assignee.organic_id })
                      : assignee.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                {t('labelEpoch')}
              </label>
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
              >
                <option value="">{t('epochNone')}</option>
                {sprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('labelDueDate')}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
            />
          </div>

          {/* Labels */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('labelLabels')}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {standardLabels.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleToggleLabel(label)}
                  className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                    labels.includes(label)
                      ? 'border-organic-orange bg-orange-50 text-organic-orange'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLabel();
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
                placeholder={t('labelPlaceholder')}
              />
              <button
                type="button"
                onClick={handleAddLabel}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                {t('addLabel')}
              </button>
            </div>
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-sm"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="text-purple-500 hover:text-purple-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? t('creating') : t('createTask')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
