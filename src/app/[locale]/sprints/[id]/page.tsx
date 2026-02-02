'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { Sprint, SprintFormData, SprintTask } from '@/features/tasks';

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
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';

export default function SprintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const t = useTranslations('SprintDetail');
  const sprintId = typeof params.id === 'string' ? params.id : params.id?.[0];
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<SprintTask[]>([]);
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
  });

  const fetchSprintDetails = useCallback(async () => {
    if (!sprintId) return;

    try {
      const response = await fetch(`/api/sprints/${sprintId}`);
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
  }, [sprintId]);

  useEffect(() => {
    if (sprintId) {
      fetchSprintDetails();
    }
  }, [fetchSprintDetails, sprintId]);

  const openEditModal = () => {
    if (sprint) {
      setEditForm({
        name: sprint.name,
        start_at: sprint.start_at.split('T')[0],
        end_at: sprint.end_at.split('T')[0],
        status: sprint.status ?? 'planning',
        capacity_points: sprint.capacity_points == null ? '' : String(sprint.capacity_points),
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
          capacity_points: editForm.capacity_points ? Number(editForm.capacity_points) : null,
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

  if (loading) {
    return (
      <PageContainer width="wide">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-organic-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500">{t('loading')}</p>
        </div>
      </PageContainer>
    );
  }

  if (!sprint) {
    return (
      <PageContainer width="wide">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('notFoundTitle')}</h3>
            <p className="text-gray-500 mb-6">{t('notFoundDescription')}</p>
            <Link
              href="/sprints"
              className="inline-flex items-center gap-2 text-organic-orange hover:text-orange-600"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('backToSprints')}
            </Link>
          </div>
      </PageContainer>
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
        {/* Back Button */}
        <Link
          href="/sprints"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToSprints')}
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
              <div className="text-sm text-gray-500 mt-2">{capacityUsedLabel}</div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusBadge(
                  sprint.status ?? 'planning'
                )}`}
              >
                {t(`status.${sprint.status ?? 'planning'}`)}
              </span>
              {canManageSprint && (
                <button
                  onClick={openEditModal}
                  className="p-2 text-gray-400 hover:text-organic-orange transition-colors"
                  title={t('editSprint')}
                >
                  <Edit className="w-5 h-5" />
                </button>
              )}
              {profile?.role === 'admin' && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title={t('deleteSprint')}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">{t('overallProgress')}</span>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('totalTasks')}</p>
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
                <p className="text-sm text-gray-600">{t('completed')}</p>
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
                <p className="text-sm text-gray-600">{t('inProgress')}</p>
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
                <p className="text-sm text-gray-600">{t('points')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {completedPoints}/{totalPoints}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('capacity')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sprint.capacity_points != null ? sprint.capacity_points : t('uncapped')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Burndown Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('burndownTitle')}</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-0.5 bg-gray-300 block"></span>
                {t('burndownIdeal')}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-0.5 bg-organic-orange block"></span>
                {t('burndownActual')}
              </span>
            </div>
          </div>
          {totalPoints === 0 ? (
            <div className="text-sm text-gray-500">{t('burndownEmpty')}</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-56"
                role="img"
                aria-label={t('burndownChartLabel')}
              >
                <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#ffffff" />
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
                  strokeWidth="2"
                  points={buildPolyline(burndownIdeal)}
                />
                <polyline
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="3"
                  points={buildPolyline(burndownActual)}
                />
              </svg>
            </div>
          )}
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('sprintTasks')}</h2>
          </div>

          {tasks.length === 0 ? (
            <div className="p-8 text-center">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noTasksTitle')}</h3>
              <p className="text-gray-500">{t('noTasksDescription')}</p>
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
                          {t(`taskStatus.${task.status}`)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(task.priority)}`}
                        >
                          {t(`priority.${task.priority}`)}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {task.description}
                        </p>
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
                          {t('pointsLabel', { points: task.points ?? 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      {/* Edit Sprint Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">{t('editSprintTitle')}</h3>
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
                  {t('formName')}
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
                  placeholder={t('formNamePlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('formStartDate')}
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
                    {t('formEndDate')}
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
                  {t('formStatus')}
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value as SprintFormData['status'] })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
                >
                  <option value="planning">{t('status.planning')}</option>
                  <option value="active">{t('status.active')}</option>
                  <option value="completed">{t('status.completed')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('formCapacity')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.capacity_points}
                  onChange={(e) => setEditForm({ ...editForm, capacity_points: e.target.value })}
                  placeholder={t('formCapacityPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
                />
                <p className="mt-1 text-xs text-gray-500">{t('formCapacityHelper')}</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleEditSprint}
                disabled={isSaving || !editForm.name || !editForm.start_at || !editForm.end_at}
                className="flex items-center gap-2 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? t('saving') : t('saveChanges')}
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
                onClick={handleDeleteSprint}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isDeleting ? t('deleting') : t('deleteSprint')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
