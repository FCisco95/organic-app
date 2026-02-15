'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useCreateTask, type Assignee, type Sprint, type TaskPriority } from '@/features/tasks';

type TaskNewModalProps = {
  onClose: () => void;
  onSuccess: () => void;
  sprints: Sprint[];
  userId: string | null;
};

export function TaskNewModal({ onClose, onSuccess, sprints, userId }: TaskNewModalProps) {
  const t = useTranslations('Tasks');
  const createTask = useCreateTask();
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

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

      await createTask.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        task_type: 'custom',
        is_team_task: false,
        max_assignees: 1,
        base_points: points ? parseInt(points, 10) : undefined,
        sprint_id: sprintId || undefined,
        assignee_id: assigneeId || undefined,
        priority,
        // API schema expects datetime; normalize date input to ISO.
        due_date: dueDate ? new Date(`${dueDate}T00:00:00.000Z`).toISOString() : undefined,
        labels,
      });

      toast.success(t('toastTaskCreated'));
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('toastTaskCreateFailed');
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
