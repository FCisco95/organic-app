'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/features/auth/context';
import {
  TaskTab,
  TaskListItem,
  TaskSubmissionSummary,
  TaskAssigneeWithUser,
  Sprint,
  TaskPriority,
  TaskStatus,
  buildTaskStatusLaneCounts,
} from '@/features/tasks';

import { createClient } from '@/lib/supabase/client';
import { ChevronDown, ChevronUp, Info, Plus, X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { TaskFiltersBar } from '@/components/tasks/task-filters-bar';
import { TaskListSection } from '@/components/tasks/task-list-section';
import dynamic from 'next/dynamic';
const TaskNewModal = dynamic(() => import('@/components/tasks/task-new-modal').then(m => m.TaskNewModal), { ssr: false });
import { PageContainer } from '@/components/layout';

const TASK_STATUS_LANES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];

export default function TasksPage() {
  const { user, profile } = useAuth();
  const t = useTranslations('Tasks');
  const standardLabels = [
    t('standardLabels.growth'),
    t('standardLabels.design'),
    t('standardLabels.dev'),
    t('standardLabels.research'),
  ];
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
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
  const [showInfoBanner, setShowInfoBanner] = useState(false);
  const [isInfoBannerExpanded, setIsInfoBannerExpanded] = useState(true);

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

      const { data, error } = await supabase
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

      if (error) throw error;

      const baseTasks = (data ?? []) as unknown as TaskListItem[];
      if (baseTasks.length === 0) {
        setTasks([]);
        return;
      }

      const taskIds = baseTasks.map((task) => task.id);
      const { data: assigneeRows, error: assigneesError } = await supabase
        .from('task_assignees')
        .select('id, task_id, user_id, claimed_at, submission_id')
        .in('task_id', taskIds);

      if (assigneesError) {
        console.error('Error loading task assignees:', assigneesError);
        setTasks(baseTasks);
        return;
      }

      const userIds = Array.from(new Set((assigneeRows ?? []).map((row) => row.user_id)));
      const { data: userRows, error: usersError } = userIds.length
        ? await supabase
            .from('user_profiles')
            .select('id, name, email, organic_id, avatar_url')
            .in('id', userIds)
        : { data: [], error: null };

      if (usersError) {
        console.error('Error loading assignee profiles:', usersError);
        setTasks(baseTasks);
        return;
      }

      const userMap = new Map((userRows ?? []).map((profileRow) => [profileRow.id, profileRow]));
      const assigneesByTask = (assigneeRows ?? []).reduce<Record<string, TaskAssigneeWithUser[]>>(
        (acc, row) => {
          const assignment = row as {
            id: string;
            task_id: string;
            user_id: string;
            claimed_at: string | null;
            submission_id: string | null;
          };

          const assignee: TaskAssigneeWithUser = {
            id: assignment.id,
            task_id: assignment.task_id,
            user_id: assignment.user_id,
            claimed_at: assignment.claimed_at,
            submission_id: assignment.submission_id,
            user: userMap.get(assignment.user_id) ?? undefined,
          };

          acc[assignment.task_id] = acc[assignment.task_id] ?? [];
          acc[assignment.task_id].push(assignee);
          return acc;
        },
        {}
      );

      setTasks(
        baseTasks.map((task) => ({
          ...task,
          assignees: assigneesByTask[task.id] ?? [],
        }))
      );
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubmissions = useCallback(async (taskIds: string[]) => {
    try {
      if (taskIds.length === 0) {
        setSubmissions([]);
        return;
      }
      const supabase = createClient();
      const { data: submissionRows, error } = await supabase
        .from('task_submissions')
        .select('task_id, user_id')
        .in('task_id', taskIds);

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

  const loadLikes = useCallback(async (taskIds: string[]) => {
    try {
      if (taskIds.length === 0) {
        setLikeCounts({});
        setLikedTasks({});
        return;
      }
      const supabase = createClient();
      const { data, error } = await supabase
        .from('task_likes')
        .select('task_id, user_id')
        .in('task_id', taskIds);

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
    const isDismissed = window.localStorage.getItem('tasksInfoBannerDismissed') === 'true';
    setShowInfoBanner(!isDismissed);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const taskIds = tasks.map((task) => task.id);
    loadCommentCounts(taskIds);
  }, [loadCommentCounts, tasks]);

  useEffect(() => {
    const taskIds = tasks.map((task) => task.id);
    loadSubmissions(taskIds);
    loadLikes(taskIds);
  }, [loadSubmissions, loadLikes, tasks]);

  useEffect(() => {
    const submissionCountMap = submissions.reduce<Record<string, number>>((acc, submission) => {
      acc[submission.task_id] = (acc[submission.task_id] ?? 0) + 1;
      return acc;
    }, {});
    const contributorCountMap = submissions.reduce<Record<string, Set<string>>>(
      (acc, submission) => {
        if (!submission.user?.id) return acc;
        acc[submission.task_id] = acc[submission.task_id] ?? new Set<string>();
        acc[submission.task_id].add(submission.user.id);
        return acc;
      },
      {}
    );

    setSubmissionCounts(submissionCountMap);
    setContributorCounts(
      Object.fromEntries(
        Object.entries(contributorCountMap).map(([taskId, userSet]) => [taskId, userSet.size])
      )
    );
  }, [submissions]);

  const currentSprint =
    sprints.find((s) =>
      ['active', 'review', 'dispute_window', 'settlement'].includes(s.status ?? '')
    ) ||
    sprints.find((s) => s.status === 'planning');
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

  const getAssigneeLabel = (assignee: TaskListItem['assignee']) => {
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

  const normalizeTaskStatus = (status: TaskStatus | null): TaskStatus => status ?? 'backlog';

  const isVisibleToNonOrg = (status: TaskStatus) =>
    ['todo', 'in_progress', 'review', 'done'].includes(status);

  const parseDate = (value: string | null) => (value ? new Date(value) : null);

  const applyFilters = (source: TaskListItem[], tab: TaskTab) => {
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
            ? (parseDate(task.completed_at) ?? parseDate(task.created_at))
            : parseDate(task.created_at);

        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
        const matchesDate =
          !dateTarget ||
          ((!fromDate || dateTarget >= fromDate) && (!toDate || dateTarget <= toDate));

        return (
          matchesSearch && matchesCategory && matchesContributor && matchesSprint && matchesDate
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
    const filteredByStatus = tasks.filter((task) =>
      tabStatusMap[tab].includes(normalizeTaskStatus(task.status))
    );
    const visibleByRole = isOrgMember
      ? filteredByStatus
      : filteredByStatus.filter((task) => isVisibleToNonOrg(normalizeTaskStatus(task.status)));

    return applyFilters(visibleByRole, tab);
  };

  const tabTasks = getTabTasks(activeView);
  const laneCounts = useMemo(
    () => buildTaskStatusLaneCounts(tasks),
    [tasks]
  );
  const openExecutionCount =
    laneCounts.backlog + laneCounts.todo + laneCounts.in_progress + laneCounts.review;
  const tasksNeedingAssignee = tasks.filter(
    (task) => !task.assignee_id && normalizeTaskStatus(task.status) !== 'done'
  ).length;
  const communityQueueCount = laneCounts.backlog + laneCounts.todo;
  const hasActiveFilters =
    searchFilter.trim().length > 0 ||
    categoryFilter !== 'all' ||
    contributorFilter !== 'all' ||
    sprintFilter !== 'all' ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

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

  const handleDismissInfoBanner = () => {
    window.localStorage.setItem('tasksInfoBannerDismissed', 'true');
    setShowInfoBanner(false);
  };

  return (
    <PageContainer width="wide" className="space-y-6">
      <div data-testid="tasks-page" className="space-y-6">
      <section
        data-testid="tasks-execution-cockpit"
        className="relative overflow-hidden rounded-3xl border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 shadow-sm"
      >
        <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                {t('executionCockpitLabel')}
              </p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">{t('title')}</h1>
              <p className="mt-1 text-slate-700">{t('subtitle')}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{t('metricOpenExecution')}</p>
                <p className="text-2xl font-black text-slate-900">{openExecutionCount}</p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{t('metricPendingReview')}</p>
                <p className="text-2xl font-black text-slate-900">{laneCounts.review}</p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{t('metricNeedsAssignee')}</p>
                <p className="text-2xl font-black text-slate-900">{tasksNeedingAssignee}</p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{t('metricCommunityQueue')}</p>
                <p className="text-2xl font-black text-slate-900">{communityQueueCount}</p>
              </div>
            </div>
          </div>

          <div
            data-testid="tasks-status-lanes"
            className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-sky-100 bg-white/70 p-3"
          >
            {TASK_STATUS_LANES.map((lane) => (
              <button
                key={lane}
                type="button"
                onClick={() => {
                  if (lane === 'done') setActiveView('completed');
                  else if (lane === 'backlog') setActiveView('backlog');
                  else setActiveView('activeSprint');
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
                data-testid={`tasks-status-lane-${lane}`}
              >
                <span>{t(`statusLane.${lane}`)}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  {laneCounts[lane]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section
        data-testid="tasks-sprint-context-banner"
        className="rounded-2xl border border-gray-200 bg-white/85 p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
          {t('sprintContextLabel')}
        </p>
        <p className="mt-1 text-sm text-gray-700">
          {currentSprint
            ? t('sprintContextActive', {
                name: currentSprint.name,
                status: currentSprint.status ?? 'active',
              })
            : t('sprintContextNone')}
        </p>
      </section>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('executionBoardTitle')}</h2>
          <p className="text-gray-600 mt-1">{t('executionBoardSubtitle')}</p>
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

      {showInfoBanner && (
        <div className="mb-6 rounded-xl border border-organic-orange/30 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsInfoBannerExpanded((prev) => !prev)}
              className="flex flex-1 items-center gap-2 text-left"
            >
              <Info className="mt-0.5 h-4 w-4 text-organic-orange" />
              <span className="font-medium text-gray-900">{t('infoBanner.title')}</span>
              {isInfoBannerExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <button
              type="button"
              onClick={handleDismissInfoBanner}
              className="text-gray-500 hover:text-gray-700"
              aria-label={t('infoBanner.dismiss')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {isInfoBannerExpanded && (
            <ul className="mt-3 space-y-1 pl-6 text-sm text-gray-700 list-disc">
              <li>{t('infoBanner.browse')}</li>
              <li>{t('infoBanner.submit')}</li>
              <li>{t('infoBanner.earn')}</li>
            </ul>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2" data-testid="tasks-tab-bar">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveView(tab)}
            data-testid={`tasks-tab-${tab}`}
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

      <TaskFiltersBar
        dataTestIdPrefix="tasks-filter"
        searchFilter={searchFilter}
        onSearchChange={setSearchFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        categoryOptions={categoryOptions}
        contributorFilter={contributorFilter}
        onContributorChange={setContributorFilter}
        contributorOptions={contributorOptions}
        sprintFilter={sprintFilter}
        onSprintChange={setSprintFilter}
        sprints={sprints}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        getContributorLabel={getContributorLabel}
      />

      <TaskListSection
        activeView={activeView}
        sprintFilter={sprintFilter}
        sprints={sprints}
        currentSprint={currentSprint}
        loading={loading}
        tasks={tabTasks}
        hasActiveFilters={hasActiveFilters}
        canLike={canLike}
        likedTasks={likedTasks}
        likeCounts={likeCounts}
        getPriorityColor={getPriorityColor}
        getAssigneeLabel={getAssigneeLabel}
        getActivityCounts={getActivityCounts}
        onToggleLike={handleToggleLike}
      />

      {/* Modals */}
      {showNewTaskModal && (
        <TaskNewModal
          onClose={() => setShowNewTaskModal(false)}
          onSuccess={() => {
            setShowNewTaskModal(false);
            loadTasks();
          }}
          sprints={sprints}
          userId={user?.id ?? null}
        />
      )}
      </div>
    </PageContainer>
  );
}
