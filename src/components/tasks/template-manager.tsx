'use client';

import { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Repeat,
  FileText,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useTaskTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  TaskTemplateWithCreator,
  RECURRENCE_RULE_LABELS,
  TASK_TYPE_LABELS,
} from '@/features/tasks';
import { CreateTemplateInput } from '@/features/tasks/schemas';
import toast from 'react-hot-toast';

interface TemplateManagerProps {
  className?: string;
}

const EMPTY_FORM: CreateTemplateInput = {
  name: '',
  description: '',
  task_type: 'custom',
  priority: 'medium',
  base_points: 0,
  labels: [],
  is_team_task: false,
  max_assignees: 1,
  is_recurring: false,
  recurrence_rule: null,
};

export function TemplateManager({ className }: TemplateManagerProps) {
  const { data: templates, isLoading } = useTaskTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateTemplateInput>(EMPTY_FORM);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      if (editingId) {
        await updateTemplate.mutateAsync({ templateId: editingId, input: form });
        toast.success('Template updated');
      } else {
        await createTemplate.mutateAsync(form);
        toast.success('Template created');
      }
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save template');
    }
  };

  const handleEdit = (template: TaskTemplateWithCreator) => {
    setForm({
      name: template.name,
      description: template.description || '',
      task_type: template.task_type,
      priority: template.priority,
      base_points: template.base_points,
      labels: template.labels,
      is_team_task: template.is_team_task,
      max_assignees: template.max_assignees,
      is_recurring: template.is_recurring,
      recurrence_rule: template.recurrence_rule,
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteTemplate.mutateAsync(templateId);
      toast.success('Template deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete template');
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Task Templates
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-organic-orange text-white hover:bg-orange-600"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              {editingId ? 'Edit Template' : 'New Template'}
            </h4>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Template name..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-organic-orange"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Template description..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-organic-orange resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={form.task_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    task_type: e.target.value as CreateTemplateInput['task_type'],
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-organic-orange"
              >
                {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: e.target.value as CreateTemplateInput['priority'],
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-organic-orange"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Base Points</label>
              <input
                type="number"
                value={form.base_points}
                onChange={(e) => setForm({ ...form, base_points: Number(e.target.value) })}
                min={0}
                max={10000}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-organic-orange"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_recurring}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      is_recurring: e.target.checked,
                      recurrence_rule: e.target.checked ? 'sprint_start' : null,
                    })
                  }
                  className="rounded border-gray-300 text-organic-orange focus:ring-organic-orange"
                />
                Recurring
              </label>
            </div>

            {form.is_recurring && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Recurrence</label>
                <select
                  value={form.recurrence_rule || 'sprint_start'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      recurrence_rule: e.target.value as CreateTemplateInput['recurrence_rule'],
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-organic-orange"
                >
                  {Object.entries(RECURRENCE_RULE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={createTemplate.isPending || updateTemplate.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-organic-orange text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {(createTemplate.isPending || updateTemplate.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Templates list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading templates...
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {template.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {TASK_TYPE_LABELS[template.task_type]}
                  </span>
                  {template.is_recurring && template.recurrence_rule && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                      <Repeat className="w-3 h-3" />
                      {RECURRENCE_RULE_LABELS[template.recurrence_rule]}
                    </span>
                  )}
                </div>
                {template.description && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{template.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(template)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  disabled={deleteTemplate.isPending}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <p className="text-sm text-gray-400 text-center py-4">No templates yet</p>
        )
      )}
    </div>
  );
}
