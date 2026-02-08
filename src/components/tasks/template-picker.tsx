'use client';

import { useState } from 'react';
import { FileText, Loader2, Repeat, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useTaskTemplates,
  useCreateFromTemplate,
  TaskTemplateWithCreator,
  RECURRENCE_RULE_LABELS,
  TASK_TYPE_LABELS,
} from '@/features/tasks';
import toast from 'react-hot-toast';

interface TemplatePickerProps {
  sprintId?: string;
  onTaskCreated?: () => void;
  className?: string;
}

export function TemplatePicker({ sprintId, onTaskCreated, className }: TemplatePickerProps) {
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
      toast.success(`Task created from "${template.name}"`);
      onTaskCreated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create from template');
    } finally {
      setSelectedId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading templates...
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-400', className)}>
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No templates yet</p>
        <p className="text-xs mt-1">Council or admin can create templates</p>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-3', className)}>
      {templates.map((template) => (
        <button
          key={template.id}
          onClick={() => handleCreate(template)}
          disabled={createFromTemplate.isPending}
          className={cn(
            'text-left p-4 rounded-lg border border-gray-200 hover:border-organic-orange/50',
            'hover:shadow-sm transition-all group',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900 group-hover:text-organic-orange truncate">
              {template.name}
            </h4>
            {selectedId === template.id && (
              <Loader2 className="w-4 h-4 animate-spin text-organic-orange flex-shrink-0" />
            )}
          </div>

          {template.description && (
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{template.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Tag className="w-3 h-3" />
              {TASK_TYPE_LABELS[template.task_type]}
            </span>
            {template.base_points > 0 && (
              <span className="text-xs text-gray-400">{template.base_points} pts</span>
            )}
            {template.is_recurring && template.recurrence_rule && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                <Repeat className="w-3 h-3" />
                {RECURRENCE_RULE_LABELS[template.recurrence_rule]}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
