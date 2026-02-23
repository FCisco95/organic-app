'use client';

import { Save, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Task, Member } from '@/features/tasks';

type EditFormState = {
  title: string;
  description: string;
  status: Task['status'];
  priority: Task['priority'];
  points: number;
  assignee_id: string;
  sprint_id: string;
  labels: string[];
};

type SprintOption = {
  id: string;
  name: string;
  status: string;
};

type TaskEditFormProps = {
  editForm: EditFormState;
  labelInput: string;
  standardLabels: string[];
  members: Member[];
  sprints: SprintOption[];
  isSaving: boolean;
  onChange: (next: EditFormState) => void;
  onLabelInputChange: (value: string) => void;
  onAddLabel: () => void;
  onToggleLabel: (label: string) => void;
  onRemoveLabel: (label: string) => void;
  onCancel: () => void;
  onSave: () => void;
  getDisplayName: (member: Member) => string;
};

export function TaskEditForm({
  editForm,
  labelInput,
  standardLabels,
  members,
  sprints,
  isSaving,
  onChange,
  onLabelInputChange,
  onAddLabel,
  onToggleLabel,
  onRemoveLabel,
  onCancel,
  onSave,
  getDisplayName,
}: TaskEditFormProps) {
  const t = useTranslations('TaskDetail');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('labelTitle')}</label>
        <input
          type="text"
          value={editForm.title}
          onChange={(e) => onChange({ ...editForm, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('labelDescription')}
        </label>
        <textarea
          value={editForm.description}
          onChange={(e) => onChange({ ...editForm, description: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('labelStatus')}</label>
          <select
            value={editForm.status ?? 'backlog'}
            onChange={(e) => {
              const nextStatus = e.target.value as Task['status'];
              onChange({
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
            value={editForm.priority ?? 'medium'}
            onChange={(e) =>
              onChange({ ...editForm, priority: e.target.value as Task['priority'] })
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('labelPoints')}</label>
          <input
            type="number"
            min="0"
            value={editForm.points}
            onChange={(e) => onChange({ ...editForm, points: parseInt(e.target.value, 10) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('labelAssignee')}
          </label>
          <select
            value={editForm.assignee_id}
            onChange={(e) => onChange({ ...editForm, assignee_id: e.target.value })}
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
          onChange={(e) => {
            const nextSprintId = e.target.value;
            onChange({
              ...editForm,
              sprint_id: nextSprintId,
              status: nextSprintId && editForm.status === 'backlog' ? 'todo' : editForm.status,
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
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('labelLabels')}</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {standardLabels.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => onToggleLabel(label)}
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
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <input
            type="text"
            value={labelInput}
            onChange={(e) => onLabelInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddLabel();
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange"
            placeholder={t('labelPlaceholder')}
          />
          <button
            type="button"
            onClick={onAddLabel}
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
                  onClick={() => onRemoveLabel(label)}
                  className="text-purple-500 hover:text-purple-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X className="w-4 h-4 inline mr-2" />
          {t('cancel')}
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4 inline mr-2" />
          {isSaving ? t('saving') : t('saveChanges')}
        </button>
      </div>
    </div>
  );
}
