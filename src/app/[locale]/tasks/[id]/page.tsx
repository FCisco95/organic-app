'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  points: number;
  sprint_id: string | null;
  assignee_id: string | null;
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
  const taskId = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';

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

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status: 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
    points: 0,
    assignee_id: '',
    sprint_id: '',
  });

  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
      fetchComments();
      fetchMembers();
      fetchSprints();
    }
  }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      console.log('[Task Detail] Fetching task with ID:', taskId);
      const supabase = createClient();

      // Check if we have a session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Task Detail] Session status:', session ? 'authenticated' : 'no session');

      const { data: task, error } = await supabase
        .from('tasks')
        .select(`
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
        `)
        .eq('id', taskId)
        .single();

      console.log('[Task Detail] Query result:', { task, error });

      if (!error && task) {
        console.log('[Task Detail] Task loaded successfully:', task.title);
        const typedTask = task as unknown as Task;
        setTask(typedTask);
        setEditForm({
          title: typedTask.title,
          description: typedTask.description || '',
          status: typedTask.status,
          priority: typedTask.priority,
          points: typedTask.points,
          assignee_id: typedTask.assignee_id || '',
          sprint_id: typedTask.sprint_id || '',
        });
      } else {
        console.error('[Task Detail] Error fetching task:', error);
      }
    } catch (error) {
      console.error('[Task Detail] Exception fetching task:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const supabase = createClient();

      const { data: comments, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:user_profiles(
            id,
            name,
            email,
            organic_id,
            avatar_url
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (!error && comments) {
        setComments(comments as unknown as Comment[]);
      } else {
        console.error('Error fetching comments:', error);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchMembers = async () => {
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
  };

  const fetchSprints = async () => {
    try {
      const supabase = createClient();

      const { data: sprints, error } = await supabase
        .from('sprints')
        .select('id, name, status')
        .order('start_date', { ascending: false });

      if (!error && sprints) {
        setSprints(sprints as unknown as Sprint[]);
      } else {
        console.error('Error fetching sprints:', error);
      }
    } catch (error) {
      console.error('Error fetching sprints:', error);
    }
  };

  const handleSaveTask = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();

      const { data: updatedTask, error } = await supabase
        .from('tasks')
        .update({
          ...editForm,
          assignee_id: editForm.assignee_id || null,
          sprint_id: editForm.sprint_id || null,
        })
        .eq('id', taskId)
        .select(`
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
        `)
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
        .select(`
          *,
          user:user_profiles!task_comments_user_id_fkey(
            id,
            name,
            email,
            organic_id,
            avatar_url
          )
        `)
        .single();

      if (!error && comment) {
        setComments([...comments, comment as unknown as Comment]);
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
        .select(`
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
        `)
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

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

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
          <Link
            href="/tasks"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('labelTitle')}</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('labelDescription')}</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('labelStatus')}</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Task['status'] })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('labelPriority')}</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as Task['priority'] })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('labelPoints')}</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.points}
                    onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('labelAssignee')}</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('labelSprint')}</label>
                <select
                  value={editForm.sprint_id}
                  onChange={(e) => setEditForm({ ...editForm, sprint_id: e.target.value })}
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
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{task.title}</h1>
                {task.description && (
                  <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(task.status)}`}>
                  {t(`status.${task.status}`)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityBadge(task.priority)}`}>
                  {t('priorityLabel', { priority: t(`priority.${task.priority}`) })}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                  {t('pointsLabel', { points: task.points })}
                </span>
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
                        <span className="font-medium text-gray-900">{getDisplayName(comment.user)}</span>
                        <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
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

      {/* Assign User Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{t('assignTitle')}</h3>
            <p className="text-gray-600 mb-4">
              {t('assignDescription')}
            </p>

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
            <p className="text-gray-600 mb-6">
              {t('deleteDescription')}
            </p>
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
