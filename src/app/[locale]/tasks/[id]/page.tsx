'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import {
  canSubmitTask,
  TaskSubmissionWithReviewer,
  TaskWithRelations,
  TaskAssigneeWithUser,
  TaskComment,
  Member,
} from '@/features/tasks';

import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Edit2, Send, AlertCircle, UserPlus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ClaimButton, TeamClaimStatus } from '@/components/tasks/claim-button';
import { TaskSubmissionForm } from '@/components/tasks/task-submission-form';
import { TaskContributorsModal } from '@/components/tasks/task-contributors-modal';
import { TaskAssignModal } from '@/components/tasks/task-assign-modal';
import { TaskDeleteConfirmModal } from '@/components/tasks/task-delete-confirm-modal';
import { TaskCommentsSection } from '@/components/tasks/task-comments-section';
import { TaskSubmissionsSection } from '@/components/tasks/task-submissions-section';
import dynamic from 'next/dynamic';
const TaskEditForm = dynamic(() => import('@/components/tasks/task-edit-form').then(m => m.TaskEditForm), { ssr: false });
import { TaskDetailSummary } from '@/components/tasks/task-detail-summary';
import { BlockedBadge } from '@/components/tasks/blocked-badge';
import { SubtaskList } from '@/components/tasks/subtask-list';
import { DependencyPicker } from '@/components/tasks/dependency-picker';
import { useTaskDependencies } from '@/features/tasks';
import { PageContainer } from '@/components/layout';
import { FollowButton } from '@/components/notifications/follow-button';

// Local type alias for the task shape used in this page
type Task = TaskWithRelations;

// Sprint type for edit form
type Sprint = {
  id: string;
  name: string;
  status: string;
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const t = useTranslations('TaskDetail');
  const taskId = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? '');
  const { data: dependencyData } = useTaskDependencies(taskId);
  const canLike = !!profile?.role && ['member', 'council', 'admin'].includes(profile.role);
  const standardLabels = [
    t('standardLabels.growth'),
    t('standardLabels.design'),
    t('standardLabels.dev'),
    t('standardLabels.research'),
  ];

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likedByUser, setLikedByUser] = useState(false);
  const [showAllContributors, setShowAllContributors] = useState(false);
  const [showContributorsModal, setShowContributorsModal] = useState(false);
  const submitEligibility = task
    ? canSubmitTask(task, Boolean(profile?.organic_id))
    : { canSubmit: false };
  const dependenciesTotal = dependencyData?.dependencies?.length ?? 0;
  const unresolvedDependencies = (dependencyData?.dependencies ?? []).filter(
    (dependency) => dependency.blocking_task?.status !== 'done'
  ).length;

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status: 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
    points: 0,
    assignee_id: '',
    sprint_id: '',
    labels: [] as string[],
  });
  const [labelInput, setLabelInput] = useState('');

  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const handleAddLabel = () => {
    const nextLabel = labelInput.trim();
    if (!nextLabel || editForm.labels.includes(nextLabel)) {
      setLabelInput('');
      return;
    }
    setEditForm({ ...editForm, labels: [...editForm.labels, nextLabel] });
    setLabelInput('');
  };

  const handleToggleLabel = (label: string) => {
    if (editForm.labels.includes(label)) {
      setEditForm({ ...editForm, labels: editForm.labels.filter((item) => item !== label) });
    } else {
      setEditForm({ ...editForm, labels: [...editForm.labels, label] });
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setEditForm({ ...editForm, labels: editForm.labels.filter((item) => item !== labelToRemove) });
  };

  const fetchTaskDetails = useCallback(async () => {
    try {
      const supabase = createClient();

      const { data: taskData, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          assignee:user_profiles!tasks_assignee_id_fkey(
            id,
            name,
            email,
            organic_id,
            avatar_url
          ),
          sprint:sprints(
            id,
            name,
            status
          ),
          proposal:proposals(
            id,
            title,
            status,
            result
          ),
          proposal_version:proposal_versions!tasks_proposal_version_id_fkey(
            id,
            version_number,
            created_at
          )
        `
        )
        .eq('id', taskId)
        .single();

      if (!error && taskData) {
        const typedTask = taskData as unknown as Task;

        // Fetch assignees (all tasks use task_assignees now)
        const { data: assigneesData } = await supabase
          .from('task_assignees')
          .select(
            `
            *,
            user:user_profiles(id, name, email, organic_id, avatar_url)
          `
          )
          .eq('task_id', taskId);
        const assignees = (assigneesData ?? []) as unknown as TaskAssigneeWithUser[];

        // Fetch submissions
        const { data: submissionsData } = await supabase
          .from('task_submissions')
          .select(
            `
            *,
            user:user_profiles!task_submissions_user_id_fkey(
              id, name, email, organic_id, avatar_url
            ),
            reviewer:user_profiles!task_submissions_reviewer_id_fkey(
              id, name, email, organic_id
            )
          `
          )
          .eq('task_id', taskId)
          .order('submitted_at', { ascending: false });

        const fullTask = {
          ...typedTask,
          assignees,
          submissions: (submissionsData ?? []) as unknown as TaskSubmissionWithReviewer[],
        };

        setTask(fullTask);
        setEditForm({
          title: fullTask.title,
          description: fullTask.description || '',
          status: fullTask.status,
          priority: fullTask.priority,
          points: fullTask.points ?? 0,
          assignee_id: fullTask.assignee_id || '',
          sprint_id: fullTask.sprint_id || '',
          labels: fullTask.labels ?? [],
        });
      }
    } catch {
      // Task fetch failed
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const fetchTaskLikes = useCallback(async () => {
    try {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('task_likes')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId);

      if (error) throw error;
      setLikeCount(count ?? 0);

      if (user?.id) {
        const { data: liked, error: likedError } = await supabase
          .from('task_likes')
          .select('task_id')
          .eq('task_id', taskId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (likedError) throw likedError;
        setLikedByUser(!!liked);
      } else {
        setLikedByUser(false);
      }
    } catch {
      // Failed to load likes
    }
  }, [taskId, user?.id]);

  const fetchComments = useCallback(async () => {
    try {
      const supabase = createClient();

      const { data: commentsData, error } = await supabase
        .from('task_comments')
        .select('id, task_id, user_id, content, created_at, updated_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error || !commentsData) {
        return;
      }

      const userIds = Array.from(new Set(commentsData.map((comment) => comment.user_id)));
      if (userIds.length === 0) {
        setComments([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, name, email, organic_id, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(
        (profiles ?? []).map((profileItem) => [profileItem.id, profileItem])
      );

      const hydratedComments = commentsData.map((comment) => {
        const profileItem = profileMap.get(comment.user_id);
        return {
          ...comment,
          user: profileItem ?? {
            id: comment.user_id,
            name: null,
            email: 'unknown@organic.app',
            organic_id: null,
            avatar_url: null,
          },
        } as TaskComment;
      });

      setComments(hydratedComments);
    } catch {
      // Failed to fetch comments
    }
  }, [taskId]);

  const fetchMembers = useCallback(async () => {
    try {
      const supabase = createClient();

      const { data: members, error } = await supabase
        .from('user_profiles')
        .select('id, name, email, organic_id')
        .in('role', ['member', 'council', 'admin'])
        .order('name');

      if (!error && members) {
        setMembers(members as Member[]);
      }
    } catch {
      // Failed to fetch members
    }
  }, []);

  const fetchSprints = useCallback(async () => {
    try {
      const supabase = createClient();

      const { data: sprints, error } = await supabase
        .from('sprints')
        .select('id, name, status')
        .order('start_at', { ascending: false });

      if (!error && sprints) {
        setSprints(sprints as unknown as Sprint[]);
      }
    } catch {
      // Failed to fetch sprints
    }
  }, []);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
      fetchComments();
      fetchMembers();
      fetchSprints();
      fetchTaskLikes();
    }
  }, [taskId, fetchTaskDetails, fetchComments, fetchMembers, fetchSprints, fetchTaskLikes]);

  const handleSaveTask = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const normalizedSprintId = editForm.status === 'backlog' ? null : editForm.sprint_id || null;
      const normalizedStatus =
        editForm.status === 'backlog' && editForm.sprint_id ? 'todo' : editForm.status;

      const { data: updatedTask, error } = await supabase
        .from('tasks')
        .update({
          ...editForm,
          assignee_id: editForm.assignee_id || null,
          sprint_id: normalizedSprintId,
          status: normalizedStatus,
        })
        .eq('id', taskId)
        .select(
          `
          *,
          assignee:user_profiles!tasks_assignee_id_fkey(
            id,
            name,
            email,
            organic_id,
            avatar_url
          ),
          sprint:sprints(
            id,
            name,
            status
          ),
          proposal:proposals(
            id,
            title,
            status,
            result
          ),
          proposal_version:proposal_versions!tasks_proposal_version_id_fkey(
            id,
            version_number,
            created_at
          )
        `
        )
        .single();

      if (!error && updatedTask) {
        setTask(updatedTask as unknown as Task);
        setIsEditing(false);
      } else {
        alert(error?.message || t('alertUpdateTaskFailed'));
      }
    } catch {
      alert(t('alertSaveTaskFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleLike = async () => {
    if (!user || !canLike) return;

    try {
      const supabase = createClient();
      if (likedByUser) {
        const { error } = await supabase
          .from('task_likes')
          .delete()
          .eq('task_id', taskId)
          .eq('user_id', user.id);

        if (error) throw error;
        setLikedByUser(false);
        setLikeCount((prev) => Math.max(prev - 1, 0));
      } else {
        const { error } = await supabase.from('task_likes').insert({
          task_id: taskId,
          user_id: user.id,
        });

        if (error) throw error;
        setLikedByUser(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch {
      // Failed to toggle like
    }
  };

  const contributors = task?.submissions
    ? Array.from(
        task.submissions.reduce((map, submission) => {
          if (submission.user?.id) {
            map.set(submission.user.id, submission.user);
          }
          return map;
        }, new Map<string, TaskSubmissionWithReviewer['user']>())
      )
        .map((entry) => entry[1])
        .filter((user): user is NonNullable<TaskSubmissionWithReviewer['user']> => !!user)
    : [];

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setIsSubmittingComment(true);
    try {
      const supabase = createClient();

      const { data: comment, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          content: newComment.trim(),
        })
        .select('id, task_id, user_id, content, created_at, updated_at')
        .single();

      if (!error && comment) {
        const commentUser = profile
          ? {
              id: profile.id,
              name: profile.name,
              email: profile.email ?? user.email ?? 'unknown@organic.app',
              organic_id: profile.organic_id,
              avatar_url: profile.avatar_url,
            }
          : {
              id: user.id,
              name: null,
              email: user.email ?? 'unknown@organic.app',
              organic_id: null,
              avatar_url: null,
            };

        setComments([
          {
            ...(comment as unknown as TaskComment),
            user: commentUser,
          },
          ...comments,
        ]);
        setNewComment('');
      } else {
        alert(error?.message || t('alertPostCommentFailed'));
      }
    } catch {
      alert(t('alertPostCommentFailed'));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAssignUser = async (assigneeId: string) => {
    setIsAssigning(true);
    try {
      const supabase = createClient();

      const { data: updatedTask, error } = await supabase
        .from('tasks')
        .update({ assignee_id: assigneeId || null })
        .eq('id', taskId)
        .select(
          `
          *,
          assignee:user_profiles!tasks_assignee_id_fkey(
            id,
            name,
            email,
            organic_id,
            avatar_url
          ),
          sprint:sprints(
            id,
            name,
            status
          ),
          proposal:proposals(
            id,
            title,
            status,
            result
          ),
          proposal_version:proposal_versions!tasks_proposal_version_id_fkey(
            id,
            version_number,
            created_at
          )
        `
        )
        .single();

      if (!error && updatedTask) {
        setTask(updatedTask as unknown as Task);
        setShowAssignModal(false);
        alert(assigneeId ? t('alertUserAssigned') : t('alertUserUnassigned'));
      } else {
        alert(error?.message || t('alertAssignUserFailed'));
      }
    } catch {
      alert(t('alertAssignUserFailed'));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteTask = async () => {
    setIsDeleting(true);
    try {
      // Check if user has admin role
      if (profile?.role !== 'admin') {
        alert(t('alertAdminOnlyDelete'));
        return;
      }

      const supabase = createClient();

      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) {
        alert(t('alertDeleteTaskFailedWithReason', { reason: error.message }));
      } else {
        alert(t('alertTaskDeleted'));
        router.push('/tasks');
      }
    } catch {
      alert(t('alertDeleteTaskFailed'));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      backlog: 'bg-gray-100 text-gray-700 border-gray-200',
      todo: 'bg-blue-100 text-blue-700 border-blue-200',
      in_progress: 'bg-orange-100 text-orange-700 border-orange-200',
      review: 'bg-purple-100 text-purple-700 border-purple-200',
      done: 'bg-green-100 text-green-700 border-green-200',
    };
    return styles[status as keyof typeof styles] || styles.backlog;
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-green-100 text-green-600',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    };
    return styles[priority as keyof typeof styles] || styles.medium;
  };

  const getDisplayName = (user: any) => {
    if (!user) return t('unassigned');
    if (user.name) return user.name;
    if (user.organic_id) return t('organicId', { id: user.organic_id });
    return user.email.split('@')[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-organic-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500">{t('loading')}</p>
        </div>
      </PageContainer>
    );
  }

  if (!task) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('notFoundTitle')}</h3>
          <Link href="/tasks" className="text-organic-orange hover:text-orange-600">
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            {t('backToTasks')}
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-6" data-testid="task-detail-header">
        <Link href="/tasks" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
          {t('backToTasks')}
        </Link>

        {!isEditing && (
          <div className="flex gap-3">
            {user && <FollowButton subjectType="task" subjectId={taskId} />}
            {profile?.role && ['admin', 'council'].includes(profile.role) && (
              <>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  {t('assign')}
                </button>
                {profile.role === 'admin' && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('delete')}
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              {t('editTask')}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" data-testid="task-operator-layout">
        <div className="min-w-0 space-y-6">
          {/* Task Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6" data-testid="task-summary-surface">
            {/* Blocked Badge - show if task has incomplete blockers */}
            {dependencyData?.dependencies && dependencyData.dependencies.length > 0 && (
              <BlockedBadge dependencies={dependencyData.dependencies} className="mb-4" />
            )}

            {isEditing ? (
              <TaskEditForm
                editForm={editForm}
                labelInput={labelInput}
                standardLabels={standardLabels}
                members={members}
                sprints={sprints}
                isSaving={isSaving}
                onChange={setEditForm}
                onLabelInputChange={setLabelInput}
                onAddLabel={handleAddLabel}
                onToggleLabel={handleToggleLabel}
                onRemoveLabel={handleRemoveLabel}
                onCancel={() => setIsEditing(false)}
                onSave={handleSaveTask}
                getDisplayName={getDisplayName}
              />
            ) : (
              <TaskDetailSummary
                task={task}
                contributors={contributors}
                showAllContributors={showAllContributors}
                likeCount={likeCount}
                likedByUser={likedByUser}
                canLike={canLike}
                onToggleLike={handleToggleLike}
                onToggleContributors={() => setShowAllContributors((prev) => !prev)}
                onOpenContributorsModal={() => setShowContributorsModal(true)}
                getStatusBadge={getStatusBadge}
                getPriorityBadge={getPriorityBadge}
                getDisplayName={getDisplayName}
                formatDate={formatDate}
              />
            )}
          </div>

          {/* Dependencies - shown for non-subtask tasks, admin/council/creator can manage */}
          {!task.parent_task_id && (
            (profile?.role && ['admin', 'council'].includes(profile.role)) ||
            (user && task.created_by === user.id)
          ) && (
            <div
              className="bg-white rounded-xl border border-gray-200 p-6"
              data-testid="task-dependency-surface"
            >
              <DependencyPicker taskId={taskId} />
            </div>
          )}

          {/* Subtasks - shown for non-subtask tasks */}
          {!task.parent_task_id && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <SubtaskList parentTaskId={taskId} />
            </div>
          )}

          <TaskCommentsSection
            comments={comments}
            newComment={newComment}
            isSubmitting={isSubmittingComment}
            onChange={setNewComment}
            onSubmit={handleSubmitComment}
            getDisplayName={getDisplayName}
            formatDate={formatDate}
          />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 self-start">
          <div
            className="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 to-white p-5"
            data-testid="task-delivery-checklist"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              {t('deliveryChecklistLabel')}
            </p>
            <h3 className="mt-1 text-base font-bold text-slate-900">{t('deliveryChecklistTitle')}</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p className="flex items-center justify-between gap-2">
                <span>{t('checkAssignee')}</span>
                <span className={task.assignee_id ? 'text-emerald-700' : 'text-amber-700'}>
                  {task.assignee_id ? t('checkDone') : t('checkPending')}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span>{t('checkSprint')}</span>
                <span className={task.sprint_id ? 'text-emerald-700' : 'text-amber-700'}>
                  {task.sprint_id ? t('checkDone') : t('checkPending')}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span>{t('checkDependencies')}</span>
                <span className={unresolvedDependencies === 0 ? 'text-emerald-700' : 'text-amber-700'}>
                  {t('dependenciesOpenCount', { count: unresolvedDependencies })}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span>{t('checkSubmissions')}</span>
                <span className="text-slate-700">
                  {t('submissionsCount', { count: task.submissions?.length ?? 0 })}
                </span>
              </p>
            </div>
            {dependenciesTotal > 0 && (
              <p className="mt-3 rounded-lg border border-sky-100 bg-white px-3 py-2 text-xs text-slate-600">
                {t('dependencyHint', { count: dependenciesTotal })}
              </p>
            )}
          </div>

          {/* Task Actions - Claim and Submit */}
          {user && profile?.organic_id && (
            <div className="bg-white rounded-xl border border-gray-200 p-5" data-testid="task-submission-cta-block">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('actions')}</h2>

              <div className="flex flex-wrap gap-3">
                {/* Claim button - converts task to TaskWithRelations format for the component */}
                <ClaimButton task={task} onSuccess={() => fetchTaskDetails()} />

                {/* Submit work button - show for assigned users when task is in progress */}
                {submitEligibility.canSubmit && !showSubmissionForm && (
                  <button
                    onClick={() => setShowSubmissionForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                    data-testid="task-submit-work-cta"
                  >
                    <Send className="w-4 h-4" />
                    {t('submitWork')}
                  </button>
                )}
              </div>

              {/* Team task status */}
              {task.is_team_task && (
                <div className="mt-4">
                  <TeamClaimStatus task={task} />
                </div>
              )}
            </div>
          )}

          {/* Submission Form */}
          {showSubmissionForm && (
            <TaskSubmissionForm
              task={task}
              onSuccess={() => {
                setShowSubmissionForm(false);
                fetchTaskDetails();
              }}
              onCancel={() => setShowSubmissionForm(false)}
              className="mb-0"
            />
          )}

          <TaskSubmissionsSection
            submissions={task.submissions ?? []}
            getDisplayName={getDisplayName}
            currentUserId={user?.id}
            onDisputeCreated={() => fetchTaskDetails()}
          />
        </aside>
      </div>

      <TaskContributorsModal
        open={showContributorsModal}
        contributors={contributors}
        submissionCount={task?.submissions?.length ?? 0}
        onClose={() => setShowContributorsModal(false)}
      />

      <TaskAssignModal
        open={showAssignModal}
        members={members}
        assigneeId={task?.assignee_id ?? null}
        isAssigning={isAssigning}
        onAssign={handleAssignUser}
        onClose={() => setShowAssignModal(false)}
        getDisplayName={getDisplayName}
      />

      <TaskDeleteConfirmModal
        open={showDeleteConfirm}
        isDeleting={isDeleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTask}
      />
    </PageContainer>
  );
}
