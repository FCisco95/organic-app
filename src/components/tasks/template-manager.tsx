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
import { useTranslations } from 'next-intl';
import {
  useTaskTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  TaskTemplateWithCreator,
} from '@/features/tasks';
import type { TaskType, RecurrenceRule } from '@/features/tasks';
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
  const t = useTranslations('Tasks.templates');
  const tTasks = useTranslations('Tasks');
  const { data: templates, isLoading } = useTaskTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateTemplateInput>(EMPTY_FORM);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(t('nameRequired'));
      return;
    }

    try {
      if (editingId) {
        await updateTemplate.mutateAsync({ templateId: editingId, input: form });
        toast.success(t('updated'));
      } else {
        await createTemplate.mutateAsync(form);
        toast.success(t('created'));
      }
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('saveFailed'));
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
    if (!confirm(t('confirmDelete'))) return;
    try {
      await deleteTemplate.mutateAsync(templateId);
      toast.success(t('deleted'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('deleteFailed'));
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 bg-white/80 shadow-sm backdrop-blur',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-organic-orange/10 via-white to-organic-yellow/10 px-5 py-4 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100">
            <FileText className="w-5 h-5 text-organic-orange" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
            {typeof templates?.length === 'number' && (
              <span className="text-xs text-gray-500">{templates.length}</span>
            )}
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-organic-orange text-white hover:bg-orange-600 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('newTemplate')}
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mx-5 mt-5 border border-gray-200 rounded-xl p-4 space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              {editingId ? t('editTemplate') : t('newTemplate')}
            </h4>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('nameLabel')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white/70 focus:outline-none focus:border-organic-orange focus:ring-2 focus:ring-organic-orange/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('descriptionLabel')}</label>
              <textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white/70 focus:outline-none focus:border-organic-orange focus:ring-2 focus:ring-organic-orange/20 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('typeLabel')}</label>
              <select
                value={form.task_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    task_type: e.target.value as CreateTemplateInput['task_type'],
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white/70 focus:outline-none focus:border-organic-orange focus:ring-2 focus:ring-organic-orange/20"
              >
                {(['development', 'content', 'design', 'custom'] as TaskType[]).map((value) => (
                  <option key={value} value={value}>
                    {tTasks(`taskTypes.${value}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('priorityLabel')}</label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: e.target.value as CreateTemplateInput['priority'],
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white/70 focus:outline-none focus:border-organic-orange focus:ring-2 focus:ring-organic-orange/20"
              >
                <option value="low">{tTasks('priorities.low')}</option>
                <option value="medium">{tTasks('priorities.medium')}</option>
                <option value="high">{tTasks('priorities.high')}</option>
                <option value="critical">{tTasks('priorities.critical')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('basePointsLabel')}</label>
              <input
                type="number"
                value={form.base_points}
                onChange={(e) => setForm({ ...form, base_points: Number(e.target.value) })}
                min={0}
                max={10000}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white/70 focus:outline-none focus:border-organic-orange focus:ring-2 focus:ring-organic-orange/20"
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
                {t('recurring')}
              </label>
            </div>

            {form.is_recurring && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('recurrence')}</label>
                <select
                  value={form.recurrence_rule || 'sprint_start'}
                onChange={(e) =>
                  setForm({
                    ...form,
                    recurrence_rule: e.target.value as CreateTemplateInput['recurrence_rule'],
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white/70 focus:outline-none focus:border-organic-orange focus:ring-2 focus:ring-organic-orange/20"
              >
                {(['sprint_start', 'daily', 'weekly', 'biweekly', 'monthly'] as RecurrenceRule[]).map((value) => (
                  <option key={value} value={value}>
                    {t(`recurrenceRules.${value}`)}
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
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={createTemplate.isPending || updateTemplate.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-organic-orange text-white hover:bg-orange-600 shadow-sm disabled:opacity-50"
            >
              {(createTemplate.isPending || updateTemplate.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {editingId ? t('update') : t('create')}
            </button>
          </div>
        </div>
      )}

      {/* Templates list */}
      <div className="px-5 pb-5">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-16 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white animate-pulse"
              />
            ))}
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="group flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-organic-orange/40 hover:shadow-sm transition-all"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-organic-orange/10 text-organic-orange">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {template.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {tTasks(`taskTypes.${template.task_type}`)}
                    </span>
                    {template.base_points > 0 && (
                      <span className="text-xs text-gray-400">{template.base_points} pts</span>
                    )}
                    {template.is_recurring && template.recurrence_rule && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                        <Repeat className="w-3 h-3" />
                        {t(`recurrenceRules.${template.recurrence_rule}`)}
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
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    disabled={deleteTemplate.isPending}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showForm && (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('noTemplates')}</p>
              <p className="text-xs mt-1">{t('noTemplatesHint')}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
