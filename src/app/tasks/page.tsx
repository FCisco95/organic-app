'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/context';
import { Navigation } from '@/components/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, Calendar, User, MoreVertical, AlertCircle, Clock, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

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

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'bg-gray-100 border-gray-300' },
  { id: 'todo', title: 'To Do', color: 'bg-blue-50 border-blue-300' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-orange-50 border-orange-300' },
  { id: 'review', title: 'Review', color: 'bg-purple-50 border-purple-300' },
  { id: 'done', title: 'Done', color: 'bg-green-50 border-green-300' },
];

export default function TasksPage() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showNewSprintModal, setShowNewSprintModal] = useState(false);

  const canManage = profile?.role && ['member', 'council', 'admin'].includes(profile.role);

  useEffect(() => {
    loadSprints();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [selectedSprint]);

  async function loadSprints() {
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
  }

  async function loadTasks() {
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

      if (selectedSprint !== 'all') {
        if (selectedSprint === 'unassigned') {
          query = query.is('sprint_id', null);
        } else {
          query = query.eq('sprint_id', selectedSprint);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data as Task[]);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
      toast.success('Task updated');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  }

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  if (!user || !profile?.organic_id) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Member Access Required
          </h1>
          <p className="text-gray-600 mb-6">
            You need to be a member with an Organic ID to access tasks.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Task Board</h1>
            <p className="text-gray-600 mt-1">
              Track and manage tasks across epochs
            </p>
          </div>

          <div className="flex gap-3">
            {canManage && (
              <>
                <button
                  onClick={() => setShowNewSprintModal(true)}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  New Epoch
                </button>
                <button
                  onClick={() => setShowNewTaskModal(true)}
                  className="flex items-center gap-2 bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Task
                </button>
              </>
            )}
          </div>
        </div>

        {/* Epoch Selector */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedSprint('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
              selectedSprint === 'all'
                ? 'bg-organic-orange text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            All Tasks
          </button>
          <button
            onClick={() => setSelectedSprint('unassigned')}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
              selectedSprint === 'unassigned'
                ? 'bg-organic-orange text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            No Epoch
          </button>
          {sprints.map((sprint) => (
            <button
              key={sprint.id}
              onClick={() => setSelectedSprint(sprint.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                selectedSprint === sprint.id
                  ? 'bg-organic-orange text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {sprint.name}
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  selectedSprint === sprint.id
                    ? 'bg-white/20 text-white'
                    : sprint.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : sprint.status === 'planning'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {sprint.status}
              </span>
            </button>
          ))}
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 bg-gray-100 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {COLUMNS.map((column) => {
              const columnTasks = getTasksByStatus(column.id);
              return (
                <div
                  key={column.id}
                  className={`rounded-lg border-2 p-4 ${column.color} min-h-[500px]`}
                >
                  {/* Column Header */}
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                      {column.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {columnTasks.length} {columnTasks.length === 1 ? 'task' : 'tasks'}
                    </p>
                  </div>

                  {/* Tasks */}
                  <div className="space-y-3">
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={updateTaskStatus}
                        canManage={canManage}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
        />
      )}

      {showNewSprintModal && (
        <NewSprintModal
          onClose={() => setShowNewSprintModal(false)}
          onSuccess={() => {
            setShowNewSprintModal(false);
            loadSprints();
          }}
        />
      )}
    </main>
  );
}

// Task Card Component
function TaskCard({
  task,
  onStatusChange,
  canManage,
}: {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  canManage: boolean | undefined;
}) {
  const [showActions, setShowActions] = useState(false);

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

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow group">
      {/* Priority Badge */}
      {task.priority && (
        <div className="mb-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
            <AlertCircle className="w-3 h-3" />
            {task.priority}
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">
          {task.title}
        </h4>
        {canManage && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showActions && (
              <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                {COLUMNS.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => {
                      onStatusChange(task.id, col.id);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Move to {col.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((label, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
              <Tag className="w-3 h-3" />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Due Date */}
      {task.due_date && (
        <div className={`flex items-center gap-1 mb-2 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
          <Clock className="w-3 h-3" />
          Due: {new Date(task.due_date).toLocaleDateString()}
          {isOverdue && ' (Overdue)'}
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {task.points && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-medium">
              {task.points}pt
            </span>
          )}
          {task.sprints && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              {task.sprints.name}
            </span>
          )}
        </div>
        {task.assignee && (
          <div className="flex items-center gap-1 text-gray-500">
            <User className="w-3 h-3" />
            <span className="text-xs">
              {task.assignee.organic_id
                ? `#${task.assignee.organic_id}`
                : task.assignee.email.split('@')[0]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// New Task Modal Component
function NewTaskModal({
  onClose,
  onSuccess,
  sprints,
}: {
  onClose: () => void;
  onSuccess: () => void;
  sprints: Sprint[];
}) {
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
    if (labelInput.trim() && !labels.includes(labelInput.trim())) {
      setLabels([...labels, labelInput.trim()]);
      setLabelInput('');
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter(l => l !== labelToRemove));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setSubmitting(true);
      const supabase = createClient();

      const { error } = await supabase.from('tasks').insert({
        title: title.trim(),
        description: description.trim() || null,
        points: points ? parseInt(points) : null,
        sprint_id: sprintId || null,
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        labels: labels.length > 0 ? labels : null,
        status: 'backlog',
      });

      if (error) throw error;

      toast.success('Task created!');
      onSuccess();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Task</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
              placeholder="Task title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none"
              placeholder="Task description (optional)"
            />
          </div>

          {/* Priority and Points Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Points
              </label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          {/* Assignee and Epoch Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
                disabled={loadingAssignees}
              >
                <option value="">Unassigned</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.organic_id ? `#${assignee.organic_id}` : assignee.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Epoch
              </label>
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
              >
                <option value="">None</option>
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
              Due Date
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
              Labels
            </label>
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
                placeholder="Add a label"
              />
              <button
                type="button"
                onClick={handleAddLabel}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Add
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// New Sprint Modal Component
function NewSprintModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !startDate || !endDate) {
      toast.error('All fields are required');
      return;
    }

    try {
      setSubmitting(true);
      const supabase = createClient();

      const { error } = await supabase.from('sprints').insert({
        name: name.trim(),
        start_at: startDate,
        end_at: endDate,
        status: 'planning',
      });

      if (error) throw error;

      toast.success('Epoch created!');
      onSuccess();
    } catch (error) {
      console.error('Error creating sprint:', error);
      toast.error('Failed to create epoch');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Epoch</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Epoch Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
              placeholder="e.g., Epoch 1, Q1 2024"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Epoch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
