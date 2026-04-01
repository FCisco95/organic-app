'use client';

import { cn } from '@/lib/utils';
import type { TaskType, TaskWithRelations } from '@/features/tasks';
import { useTranslations } from 'next-intl';
import {
  DevelopmentSubmissionForm,
  ContentSubmissionForm,
  DesignSubmissionForm,
  TwitterSubmissionForm,
  CustomSubmissionForm,
} from './submission-forms';

interface TaskSubmissionFormProps {
  task: TaskWithRelations;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

const VALID_TASK_TYPES: TaskType[] = ['development', 'content', 'design', 'custom', 'twitter'];

export function TaskSubmissionForm({
  task,
  onSuccess,
  onCancel,
  className,
}: TaskSubmissionFormProps) {
  const t = useTranslations('Tasks.submission');
  const tTasks = useTranslations('Tasks');
  const taskType = task.task_type ?? 'custom';
  const normalizedTaskType: TaskType = VALID_TASK_TYPES.includes(taskType as TaskType)
    ? (taskType as TaskType)
    : 'custom';

  const formProps = { task, onSuccess, onCancel };

  return (
    <div
      className={cn('bg-white rounded-lg border border-border p-6', className)}
      data-testid="task-submission-form"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('submitWorkFor', { type: tTasks(`taskTypes.${normalizedTaskType}`) })}
      </h3>

      {normalizedTaskType === 'development' && <DevelopmentSubmissionForm {...formProps} />}
      {normalizedTaskType === 'content' && <ContentSubmissionForm {...formProps} />}
      {normalizedTaskType === 'design' && <DesignSubmissionForm {...formProps} />}
      {normalizedTaskType === 'custom' && <CustomSubmissionForm {...formProps} />}
      {normalizedTaskType === 'twitter' && <TwitterSubmissionForm {...formProps} />}
    </div>
  );
}
