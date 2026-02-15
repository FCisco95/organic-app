'use client';

import { useState } from 'react';
import { FileText, Loader2, Repeat, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import {
  useTaskTemplates,
  useCreateFromTemplate,
  TaskTemplateWithCreator,
} from '@/features/tasks';
import toast from 'react-hot-toast';

interface TemplatePickerProps {
  sprintId?: string;
  onTaskCreated?: () => void;
  className?: string;
}

export function TemplatePicker({ sprintId, onTaskCreated, className }: TemplatePickerProps) {
  const t = useTranslations('Tasks.templates');
  const tTasks = useTranslations('Tasks');
  const { data: templates, isLoading } = useTaskTemplates();
  const createFromTemplate = useCreateFromTemplate();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleCreate = async (template: TaskTemplateWithCreator) => {
    setSelectedId(template.id);
    try {
      await createFromTemplate.mutateAsync({
        templateId: template.id,
        sprintId,
      });
      toast.success(t('taskCreated'));
      onTaskCreated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('createFailed'));
    } finally {
      setSelectedId(null);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('rounded-2xl border border-gray-200 bg-white/80 shadow-sm', className)}>
        <div className="border-b border-gray-100 bg-gradient-to-r from-organic-orange/10 via-white to-organic-yellow/10 px-5 py-4 rounded-t-2xl">
          <h3 className="text-lg font-semibold text-gray-900">{t('fromTemplate')}</h3>
        </div>
        <div className="px-5 py-5 space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-20 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-gray-200 bg-white/80 shadow-sm', className)}>
        <div className="border-b border-gray-100 bg-gradient-to-r from-organic-orange/10 via-white to-organic-yellow/10 px-5 py-4 rounded-t-2xl">
          <h3 className="text-lg font-semibold text-gray-900">{t('fromTemplate')}</h3>
        </div>
        <div className="text-center py-10 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t('noTemplates')}</p>
          <p className="text-xs mt-1">{t('noTemplatesHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white/80 shadow-sm', className)}>
      <div className="border-b border-gray-100 bg-gradient-to-r from-organic-orange/10 via-white to-organic-yellow/10 px-5 py-4 rounded-t-2xl">
        <h3 className="text-lg font-semibold text-gray-900">{t('fromTemplate')}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-5 py-5">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => handleCreate(template)}
            disabled={createFromTemplate.isPending}
            className={cn(
              'text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-organic-orange/40',
              'hover:shadow-sm transition-all group',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <div className="flex items-start justify-between mb-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-organic-orange/10 text-organic-orange">
                  <Tag className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-medium text-gray-900 group-hover:text-organic-orange truncate">
                  {template.name}
                </h4>
              </div>
              {selectedId === template.id && (
                <Loader2 className="w-4 h-4 animate-spin text-organic-orange flex-shrink-0" />
              )}
            </div>

            {template.description && (
              <p className="text-xs text-gray-500 mb-2 line-clamp-2">{template.description}</p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
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
          </button>
        ))}
      </div>
    </div>
  );
}
