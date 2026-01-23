'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';

import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  MessageSquare,
  Send,
  Calendar,
  User,
  AlertCircle,
  UserPlus,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Users,
  Tag,
  Heart,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ClaimButton, TeamClaimStatus } from '@/components/tasks/claim-button';
import { TaskSubmissionForm } from '@/components/tasks/task-submission-form';
import {
  useTask,
  canSubmitTask,
  TASK_TYPE_LABELS,
  TaskSubmissionWithReviewer,
} from '@/features/tasks';

type TaskType = 'development' | 'content' | 'design' | 'custom';
type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'disputed';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  points: number;
  base_points: number | null;
  sprint_id: string | null;
  assignee_id: string | null;
  task_type: TaskType;
  is_team_task: boolean;
  max_assignees: number;
  due_date: string | null;
  labels: string[] | null;
  claimed_at: string | null;
  completed_at: string | null;
  created_at: string;
  assignee?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
  sprint?: {
    id: string;
    name: string;
    status: string;
  };
  assignees?: TaskAssigneeWithUser[];
  submissions?: TaskSubmission[];
};

type TaskAssigneeWithUser = {
  id: string;
  task_id: string;
  user_id: string;
  claimed_at: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
};

type TaskSubmission = {
  id: string;
  task_id: string;
  user_id: string;
  submission_type: TaskType;
  pr_link: string | null;
  content_link: string | null;
  content_text: string | null;
  file_urls: string[] | null;
  description: string | null;
  review_status: ReviewStatus;
  quality_score: number | null;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  rejection_reason: string | null;
  earned_points: number | null;
  submitted_at: string;
  reviewed_at: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
  reviewer?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
  } | null;
};

type Comment = {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
};

type Member = {
  id: string;
  name: string | null;
  email: string;
  organic_id: number | null;
};

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
  const canLike = !!profile?.role && ['member', 'council', 'admin'].includes(profile.role);
  const standardLabels = ['📣 Growth', '🎨 Design', '💻 Dev', '🧠 Research'];

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
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
    ? canSubmitTask(task as any, Boolean(profile?.organic_id))
    : { canSubmit: false };

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
      console.log('[Task Detail] Fetching task with ID:', taskId);
      const supabase = createClient();

      // Check if we have a session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log('[Task Detail] Session status:', session ? 'authenticated' : 'no session');

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
          )
        `
        )
        .eq('id', taskId)
        .single();

      console.log('[Task Detail] Query result:', { taskData, error });

      if (!error && taskData) {
        console.log('[Task Detail] Task loaded successfully:', taskData.title);
        const typedTask = taskData as unknown as Task;

        // Fetch assignees for team tasks
        let assignees: TaskAssigneeWithUser[] = [];
        if (typedTask.is_team_task) {
          const { data: assigneesData } = await supabase
            .from('task_assignees')
            .select(
              `
              *,
              user:user_profiles(id, name, email, organic_id, avatar_url)
            `
            )
            .eq('task_id', taskId);
          assignees = (assigneesData ?? []) as unknown as TaskAssigneeWithUser[];
        }

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
          submissions: (submissionsData ?? []) as unknown as TaskSubmission[],
        };

        setTask(fullTask);
        setEditForm({
          title: fullTask.title,
          description: fullTask.description || '',
          status: fullTask.status,
          priority: fullTask.priority,
          points: fullTask.points,
          assignee_id: fullTask.assignee_id || '',
          sprint_id: fullTask.sprint_id || '',
          labels: fullTask.labels ?? [],
        });
      } else {
        console.error('[Task Detail] Error fetching task:', error);
      }
    } catch (error) {
      console.error('[Task Detail] Exception fetching task:', error);
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
    } catch (error) {
      console.error('Error loading task likes:', error);
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
        console.error('Error fetching comments:', error);
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

      if (profilesError) {
        console.error('Error fetching comment profiles:', profilesError);
      }

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
        } as Comment;
      });

      setComments(hydratedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
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
      } else {
        console.error('Error fetching members:', error);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
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
      } else {
        console.error('Error fetching sprints:', error);
      }
    } catch (error) {
      console.error('Error fetching sprints:', error);
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
          )
        `
        )
        .single();

      if (!error && updatedTask) {
        setTask(updatedTask as unknown as Task);
        setIsEditing(false);
      } else {
        console.error('Error saving task:', error);
        alert(error?.message || t('alertUpdateTaskFailed'));
      }
    } catch (error) {
      console.error('Error saving task:', error);
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
    } catch (error) {
      console.error('Error toggling task like:', error);
    }
  };

  const contributors = task?.submissions
    ? Array.from(
        task.submissions.reduce((map, submission) => {
          if (submission.user?.id) {
            map.set(submission.user.id, submission.user);
          }
          return map;
        }, new Map<string, TaskSubmission['user']>())
      )
        .map((entry) => entry[1])
        .filter((user): user is NonNullable<TaskSubmission['user']> => !!user)
    : [];

  const getContributorName = (contributor: NonNullable<TaskSubmission['user']>) => {
    if (contributor.organic_id) return t('organicId', { id: contributor.organic_id });
    return contributor.name ?? contributor.email;
  };

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
            ...(comment as unknown as Comment),
            user: commentUser,
          },
          ...comments,
        ]);
        setNewComment('');
      } else {
        console.error('Error posting comment:', error);
        alert(error?.message || t('alertPostCommentFailed'));
      }
    } catch (error) {
      console.error('Error posting comment:', error);
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
          )
        `
        )
        .single();

      if (!error && updatedTask) {
        setTask(updatedTask as unknown as Task);
        setShowAssignModal(false);
        alert(assigneeId ? t('alertUserAssigned') : t('alertUserUnassigned'));
      } else {
        console.error('Error assigning user:', error);
        alert(error?.message || t('alertAssignUserFailed'));
      }
    } catch (error) {
      console.error('Error assigning user:', error);
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
        console.error('Error deleting task:', error);
        alert(t('alertDeleteTaskFailedWithReason', { reason: error.message }));
      } else {
        alert(t('alertTaskDeleted'));
        router.push('/tasks');
      }
    } catch (error: any) {
      console.error('Error deleting task:', error);
      alert(error.message || t('alertDeleteTaskFailed'));
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto py-8 px-4">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-3 border-organic-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-500">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto py-8 px-4">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('notFoundTitle')}</h3>
            <Link href="/tasks" className="text-organic-orange hover:text-orange-600">
              <ArrowLeft className="w-4 h-4 inline mr-2" />
              {t('backToTasks')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/tasks" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            {t('backToTasks')}
          </Link>

          {!isEditing && (
            <div className="flex gap-3">
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

        {/* Task Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('labelTitle')}
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('labelDescription')}
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('labelStatus')}
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as Task['status'];
                      setEditForm({
                        ...editForm,
                        status: nextStatus,
                        sprint_id: nextStatus === 'backlog' ? '' : editForm.sprint_id,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
                  >
                    <option value="backlog">{t('status.backlog')}</option>
                    <option value="todo">{t('status.todo')}</option>
                    <option value="in_progress">{t('status.in_progress')}</option>
                    <option value="review">{t('status.review')}</option>
                    <option value="done">{t('status.done')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('labelPriority')}
                  </label>
                  <select
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm({ ...editForm, priority: e.target.value as Task['priority'] })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
                  >
                    <option value="low">{t('priority.low')}</option>
                    <option value="medium">{t('priority.medium')}</option>
                    <option value="high">{t('priority.high')}</option>
                    <option value="critical">{t('priority.critical')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('labelPoints')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.points}
                    onChange={(e) =>
                      setEditForm({ ...editForm, points: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('labelAssignee')}
                  </label>
                  <select
                    value={editForm.assignee_id}
                    onChange={(e) => setEditForm({ ...editForm, assignee_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
                  >
                    <option value="">{t('unassigned')}</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {getDisplayName(member)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('labelSprint')}
                </label>
                <select
                  value={editForm.sprint_id}
                  onChange={(e) => {
                    const nextSprintId = e.target.value;
                    setEditForm({
                      ...editForm,
                      sprint_id: nextSprintId,
                      status:
                        nextSprintId && editForm.status === 'backlog' ? 'todo' : editForm.status,
                    });
                  }}
                  disabled={editForm.status === 'backlog'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
                >
                  <option value="">{t('noSprint')}</option>
                  {sprints.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name} ({t(`sprintStatus.${sprint.status}`)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('labelLabels')}
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {standardLabels.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleToggleLabel(label)}
                      className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                        editForm.labels.includes(label)
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
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
                {editForm.labels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editForm.labels.map((label) => (
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
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4 inline mr-2" />
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSaveTask}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  {isSaving ? t('saving') : t('saveChanges')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
                  <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                    <Heart className={`w-4 h-4 ${likedByUser ? 'fill-organic-orange' : ''}`} />
                    {t('favoritesCount', { count: likeCount })}
                  </span>
                </div>
                {task.description && (
                  <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(task.status)}`}
                >
                  {t(`status.${task.status}`)}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityBadge(task.priority)}`}
                >
                  {t('priorityLabel', { priority: t(`priority.${task.priority}`) })}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                  {t('pointsLabel', { points: task.points })}
                </span>
                <button
                  type="button"
                  onClick={handleToggleLike}
                  disabled={!canLike}
                  aria-label={likedByUser ? t('likedTask') : t('likeTask')}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${
                    likedByUser
                      ? 'border-organic-orange text-organic-orange bg-orange-50'
                      : 'border-gray-200 text-gray-600 bg-white'
                  } ${canLike ? 'hover:border-organic-orange hover:text-organic-orange' : 'cursor-default'}`}
                >
                  <Heart className={`w-4 h-4 ${likedByUser ? 'fill-organic-orange' : ''}`} />
                  {likeCount}
                </button>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                  {TASK_TYPE_LABELS[task.task_type]}
                </span>
                {task.is_team_task && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
                    <Users className="w-3 h-3" />
                    {t('teamTask')}
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600">
                <div>
                  <span className="font-medium text-gray-700">{t('category')}</span>{' '}
                  {task.labels && task.labels.length > 0 ? task.labels[0] : t('noCategory')}
                </div>
                <div>
                  <span className="font-medium text-gray-700">{t('sprint')}</span>{' '}
                  {task.sprint ? task.sprint.name : t('noSprint')}
                </div>
                <div>
                  <span className="font-medium text-gray-700">{t('submissions')}</span>{' '}
                  <button
                    type="button"
                    onClick={() => setShowContributorsModal(true)}
                    className="text-organic-orange hover:text-orange-600"
                  >
                    {t('submissionsCount', { count: task.submissions?.length ?? 0 })}
                  </button>
                </div>
              </div>

              {/* Labels */}
              {task.labels && task.labels.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {task.labels.map((label, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      <Tag className="w-3 h-3" />
                      {label}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">{t('contributors')}</p>
                  {contributors.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllContributors((prev) => !prev)}
                      className="text-xs text-organic-orange hover:text-orange-600"
                    >
                      {showAllContributors ? t('showLess') : t('viewAll')}
                    </button>
                  )}
                </div>
                {contributors.length === 0 ? (
                  <p className="text-sm text-gray-500 mt-2">{t('noContributors')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(showAllContributors ? contributors : contributors.slice(0, 3)).map(
                      (contributor) => (
                        <span
                          key={contributor.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                        >
                          {getContributorName(contributor)}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('assignee')}</p>
                  <div className="flex items-center gap-2">
                    {task.assignee?.avatar_url ? (
                      <Image
                        src={task.assignee.avatar_url}
                        alt={getDisplayName(task.assignee)}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                    <span className="font-medium">{getDisplayName(task.assignee)}</span>
                  </div>
                </div>

                {task.sprint && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('sprint')}</p>
                    <Link
                      href={`/sprints/${task.sprint.id}`}
                      className="font-medium text-organic-orange hover:text-orange-600"
                    >
                      {task.sprint.name}
                    </Link>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('created')}</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{formatDate(task.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Task Actions - Claim and Submit */}
        {user && profile?.organic_id && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('actions')}</h2>

            <div className="flex flex-wrap gap-3">
              {/* Claim button - converts task to TaskWithRelations format for the component */}
              <ClaimButton task={task as any} onSuccess={() => fetchTaskDetails()} />

              {/* Submit work button - show for assigned users when task is in progress */}
              {submitEligibility.canSubmit && !showSubmissionForm && (
                <button
                  onClick={() => setShowSubmissionForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {t('submitWork')}
                </button>
              )}
            </div>

            {/* Team task status */}
            {task.is_team_task && (
              <div className="mt-4">
                <TeamClaimStatus task={task as any} />
              </div>
            )}
          </div>
        )}

        {/* Submission Form */}
        {showSubmissionForm && (
          <TaskSubmissionForm
            task={task as any}
            onSuccess={() => {
              setShowSubmissionForm(false);
              fetchTaskDetails();
            }}
            onCancel={() => setShowSubmissionForm(false)}
            className="mb-6"
          />
        )}

        {/* Submissions History */}
        {task.submissions && task.submissions.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('submissions')} ({task.submissions.length})
            </h2>

            <div className="space-y-4">
              {task.submissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  getDisplayName={getDisplayName}
                />
              ))}
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {t('commentsTitle', { count: comments.length })}
          </h2>

          {/* Comment Form */}
          <form onSubmit={handleSubmitComment} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('commentPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange mb-2"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingComment || !newComment.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmittingComment ? t('posting') : t('postComment')}
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">{t('noComments')}</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-gray-200 pl-4 py-2">
                  <div className="flex items-start gap-3">
                    {comment.user.avatar_url ? (
                      <Image
                        src={comment.user.avatar_url}
                        alt={getDisplayName(comment.user)}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {getDisplayName(comment.user)[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {getDisplayName(comment.user)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showContributorsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t('contributorsModalTitle')}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {t('submissionsCount', { count: task?.submissions?.length ?? 0 })}
            </p>
            <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
              {contributors.length === 0 ? (
                <p className="text-sm text-gray-500">{t('noContributors')}</p>
              ) : (
                contributors.map((contributor) => (
                  <div
                    key={contributor.id}
                    className="px-3 py-2 rounded-md bg-gray-50 text-sm text-gray-700"
                  >
                    {getContributorName(contributor)}
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowContributorsModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign User Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{t('assignTitle')}</h3>
            <p className="text-gray-600 mb-4">{t('assignDescription')}</p>

            <div className="space-y-2 max-h-96 overflow-y-auto mb-6">
              {/* Unassign option */}
              <button
                onClick={() => handleAssignUser('')}
                disabled={isAssigning}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                  !task?.assignee_id
                    ? 'border-organic-orange bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                } ${isAssigning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{t('unassigned')}</div>
                    <div className="text-sm text-gray-500">{t('unassignedHelp')}</div>
                  </div>
                </div>
              </button>

              {/* Member list */}
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleAssignUser(member.id)}
                  disabled={isAssigning}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                    task?.assignee_id === member.id
                      ? 'border-organic-orange bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${isAssigning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow flex items-center justify-center">
                      <span className="text-white font-bold">
                        {getDisplayName(member)[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{getDisplayName(member)}</div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAssignModal(false)}
                disabled={isAssigning}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{t('deleteTitle')}</h3>
            <p className="text-gray-600 mb-6">{t('deleteDescription')}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeleteTask}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isDeleting ? t('deleting') : t('deleteTask')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Submission Card Component
function SubmissionCard({
  submission,
  getDisplayName,
}: {
  submission: TaskSubmission;
  getDisplayName: (user: any) => string;
}) {
  const t = useTranslations('TaskDetail');

  const statusIcon = {
    pending: <Clock className="w-4 h-4 text-yellow-500" />,
    approved: <CheckCircle className="w-4 h-4 text-green-500" />,
    rejected: <XCircle className="w-4 h-4 text-red-500" />,
    disputed: <AlertCircle className="w-4 h-4 text-purple-500" />,
  };

  const statusColors = {
    pending: 'bg-yellow-50 border-yellow-200',
    approved: 'bg-green-50 border-green-200',
    rejected: 'bg-red-50 border-red-200',
    disputed: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${statusColors[submission.review_status]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {statusIcon[submission.review_status]}
            <span className="font-medium text-gray-900">
              {t(`reviewStatus.${submission.review_status}`)}
            </span>
            {submission.quality_score && (
              <span className="text-sm text-gray-500">
                ({t('qualityScore')}: {submission.quality_score}/5)
              </span>
            )}
          </div>

          <div className="text-sm text-gray-600 mb-2">
            {t('submittedBy')}{' '}
            <span className="font-medium">{getDisplayName(submission.user)}</span> {t('on')}{' '}
            {new Date(submission.submitted_at).toLocaleDateString()}
          </div>

          {submission.description && (
            <p className="text-sm text-gray-600 mb-2">{submission.description}</p>
          )}

          {/* Submission-type specific fields */}
          {submission.pr_link && (
            <a
              href={submission.pr_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-organic-orange hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {t('viewPullRequest')}
            </a>
          )}

          {submission.content_link && (
            <a
              href={submission.content_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-organic-orange hover:underline ml-2"
            >
              <ExternalLink className="w-3 h-3" />
              {t('viewContent')}
            </a>
          )}

          {submission.file_urls && submission.file_urls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {submission.file_urls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-organic-orange hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {t('file')} {idx + 1}
                </a>
              ))}
            </div>
          )}

          {/* Reviewer notes */}
          {submission.reviewer_notes && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700">{t('reviewerNotes')}:</p>
              <p className="text-sm text-gray-600 mt-1">{submission.reviewer_notes}</p>
            </div>
          )}

          {/* Rejection reason */}
          {submission.rejection_reason && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm font-medium text-red-700">{t('rejectionReason')}:</p>
              <p className="text-sm text-red-600 mt-1">{submission.rejection_reason}</p>
            </div>
          )}

          {/* Earned points */}
          {submission.earned_points !== null && submission.earned_points > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                +{submission.earned_points} {t('pointsEarned')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
