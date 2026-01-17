'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import { Navigation } from '@/components/navigation';
import {
  Calendar,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Edit,
  Trash2,
  Target,
  AlertCircle,
  Circle,
  Timer,
  X,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type Sprint = {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
  status: 'planning' | 'active' | 'completed';
  created_at: string;
};

type EditFormData = {
  name: string;
  start_at: string;
  end_at: string;
  status: 'planning' | 'active' | 'completed';
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  points: number;
  sprint_id: string | null;
  assignee_id: string | null;
  created_by: string;
  created_at: string;
  assignee?: {
    id: string;
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
};

export default function SprintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit/Delete state
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    start_at: '',
    end_at: '',
    status: 'planning',
  });

  useEffect(() => {
    if (params.id) {
      fetchSprintDetails();
    }
  }, [params.id]);

  const fetchSprintDetails = async () => {
    try {
      const response = await fetch(`/api/sprints/${params.id}`);
      const data = await response.json();

      if (response.ok) {
        setSprint(data.sprint);
        setTasks(data.tasks || []);
      } else {
        console.error('Error fetching sprint:', data.error);
      }
    } catch (error) {
      console.error('Error fetching sprint details:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    if (sprint) {
      setEditForm({
        name: sprint.name,
        start_at: sprint.start_at.split('T')[0],
        end_at: sprint.end_at.split('T')[0],
        status: sprint.status,
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
          status: editForm.status,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSprint(data.sprint);
        setShowEditModal(false);
      } else {
        alert(data.error || 'Failed to update sprint');
      }
    } catch (error) {
      console.error('Error updating sprint:', error);
      alert('Failed to update sprint');
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
        alert(data.error || 'Failed to delete sprint');
      }
    } catch (error) {
      console.error('Error deleting sprint:', error);
      alert('Failed to delete sprint');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-3 border-organic-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading sprint details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sprint not found</h3>
            <p className="text-gray-500 mb-6">This sprint may have been deleted or does not exist.</p>
            <Link
              href="/sprints"
              className="inline-flex items-center gap-2 text-organic-orange hover:text-orange-600"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sprints
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      planning: 'bg-blue-100 text-blue-700 border-blue-200',
      active: 'bg-green-100 text-green-700 border-green-200',
      completed: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return styles[status as keyof typeof styles] || styles.planning;
  };

  const getTaskStatusBadge = (status: string) => {
    const styles = {
      todo: 'bg-gray-100 text-gray-700 border-gray-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      done: 'bg-green-100 text-green-700 border-green-200',
    };
    return styles[status as keyof typeof styles] || styles.todo;
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'in_progress':
        return <Timer className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-orange-100 text-orange-700',
      high: 'bg-red-100 text-red-700',
    };
    return styles[priority as keyof typeof styles] || styles.low;
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

  const getDisplayName = (assignee: Task['assignee']) => {
    if (!assignee) return 'Unassigned';
    if (assignee.name) return assignee.name;
    if (assignee.organic_id) return `Organic #${assignee.organic_id}`;
    return assignee.email.split('@')[0];
  };

  // Calculate sprint statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const totalPoints = tasks.reduce((sum, t) => sum + t.points, 0);
  const completedPoints = tasks.filter((t) => t.status === 'done').reduce((sum, t) => sum + t.points, 0);
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const canManageSprint = profile?.role === 'admin' || profile?.role === 'council';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href="/sprints"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sprints
        </Link>

        {/* Sprint Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{sprint.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>
                    {formatDate(sprint.start_at)} - {formatDate(sprint.end_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{getDuration(sprint.start_at, sprint.end_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusBadge(
                  sprint.status
                )}`}
              >
                {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
              </span>
              {canManageSprint && (
                <button
                  onClick={openEditModal}
                  className="p-2 text-gray-400 hover:text-organic-orange transition-colors"
                  title="Edit sprint"
                >
                  <Edit className="w-5 h-5" />
                </button>
              )}
              {profile?.role === 'admin' && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete sprint"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">Overall Progress</span>
              <span className="font-bold text-gray-900">{progressPercentage}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-organic-orange to-organic-yellow transition-all"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Sprint Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{completedTasks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Timer className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{inProgressTasks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-organic-orange/10 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-organic-orange">★</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Points</p>
                <p className="text-2xl font-bold text-gray-900">
                  {completedPoints}/{totalPoints}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Sprint Tasks</h2>
          </div>

          {tasks.length === 0 ? (
            <div className="p-8 text-center">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
              <p className="text-gray-500">Tasks assigned to this sprint will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 hover:text-organic-orange transition-colors">
                          {task.title}
                        </h3>
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getTaskStatusBadge(
                            task.status
                          )}`}
                        >
                          {getTaskStatusIcon(task.status)}
                          {task.status.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {task.assignee && (
                          <div className="flex items-center gap-2">
                            {task.assignee.avatar_url ? (
                              <Image
                                src={task.assignee.avatar_url}
                                alt={getDisplayName(task.assignee)}
                                width={20}
                                height={20}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow flex items-center justify-center">
                                <span className="text-white text-xs font-bold">
                                  {getDisplayName(task.assignee)[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span>{getDisplayName(task.assignee)}</span>
                          </div>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="text-organic-orange">★</span>
                          {task.points} pts
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Sprint Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Edit Sprint</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sprint Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
                  placeholder="Sprint name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editForm.start_at}
                    onChange={(e) => setEditForm({ ...editForm, start_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editForm.end_at}
                    onChange={(e) => setEditForm({ ...editForm, end_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value as EditFormData['status'] })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSprint}
                disabled={isSaving || !editForm.name || !editForm.start_at || !editForm.end_at}
                className="flex items-center gap-2 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Sprint</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this sprint? Tasks assigned to this sprint will be
              unassigned but not deleted. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSprint}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Sprint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
