'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/context';
import { Navigation } from '@/components/navigation';
import { Calendar, Clock, CheckCircle2, Plus, Users, Target, X, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

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
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintStats, setSprintStats] = useState<SprintStats>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
                points: tasks.filter((t) => t.status === 'done').reduce((sum, t) => sum + (t.points || 0), 0),
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
        throw new Error('Only council and admin members can create sprints');
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

  // Separate current/active sprint from past sprints
  const currentSprint = sprints.find((s) => s.status === 'active') || sprints.find((s) => s.status === 'planning');
  const pastSprints = sprints.filter((s) => s.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sprints</h1>
            <p className="text-gray-600 mt-1">Track current sprint and view sprint history</p>
          </div>
          {canCreateSprint && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Sprint
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-3 border-organic-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading sprints...</p>
          </div>
        ) : sprints.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sprints yet</h3>
            <p className="text-gray-500 mb-6">
              {canCreateSprint
                ? 'Create your first sprint to start tracking development progress'
                : 'Sprints will appear here once created by council or admin members'}
            </p>
            {canCreateSprint && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-organic-orange hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Create First Sprint
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Current Sprint Canvas */}
            {currentSprint && (() => {
              const stats = sprintStats[currentSprint.id] || { total: 0, completed: 0, inProgress: 0, points: 0 };
              const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

              return (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Sprint</h2>
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
                              {formatDate(currentSprint.start_at)} - {formatDate(currentSprint.end_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-organic-orange" />
                            <span>{getDuration(currentSprint.start_at, currentSprint.end_at)}</span>
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
                        {currentSprint.status.charAt(0).toUpperCase() + currentSprint.status.slice(1)}
                      </span>
                    </div>

                    {/* Progress Section */}
                    <div className="bg-white/80 backdrop-blur rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Sprint Progress</span>
                        <span className="text-2xl font-bold text-organic-orange">{progress}%</span>
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
                          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                          <div className="text-xs text-gray-500">Total Tasks</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                          <div className="text-xs text-gray-500">Completed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                          <div className="text-xs text-gray-500">In Progress</div>
                        </div>
                      </div>
                    </div>

                    {/* View Details Link */}
                    <div className="mt-6 text-center">
                      <span className="inline-flex items-center gap-2 text-organic-orange font-medium group-hover:gap-3 transition-all">
                        View Sprint Details
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Past Sprints</h2>
                <div className="space-y-3">
                  {pastSprints.map((sprint) => {
                    const stats = sprintStats[sprint.id] || { total: 0, completed: 0, inProgress: 0, points: 0 };

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
                                {stats.completed} / {stats.total} tasks completed
                              </div>
                              <div className="text-xs text-gray-500">{stats.points} points earned</div>
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
                <p className="text-gray-500">All sprints are in planning or active status</p>
              </div>
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
              <h2 className="text-xl font-bold text-gray-900">Create New Sprint</h2>
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
                  Sprint Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Sprint 1, Q1 Development"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
                />
              </div>

              {/* Start Date */}
              <div>
                <label htmlFor="start_at" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
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
                  End Date *
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
                  Status
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
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Sprint
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
