'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useSubmitTask,
  TaskSubmissionInput,
  developmentSubmissionSchema,
} from '@/features/tasks';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import type { SubmissionFormProps } from './types';
import { FormActions } from './form-actions';

export function DevelopmentSubmissionForm({ task, onSuccess, onCancel }: SubmissionFormProps) {
  const t = useTranslations('Tasks.submission');
  const submitTask = useSubmitTask();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(developmentSubmissionSchema),
    defaultValues: {
      submission_type: 'development' as const,
      pr_link: '',
      description: '',
      testing_notes: '',
    },
  });

  const onSubmit = async (data: TaskSubmissionInput) => {
    try {
      await submitTask.mutateAsync({ taskId: task.id, submission: data });
      toast.success(t('submissionSuccess'));
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('submissionFailed'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('submission_type')} value="development" />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('prLinkLabel')} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            {...register('pr_link')}
            type="url"
            placeholder={t('prLinkPlaceholder')}
            className={cn(
              'w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent',
              errors.pr_link ? 'border-red-300' : 'border-gray-300'
            )}
          />
        </div>
        {errors.pr_link && <p className="mt-1 text-sm text-red-600">{errors.pr_link.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('descriptionLabel')}
        </label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder={t('descriptionPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('testingNotesLabel')}
        </label>
        <textarea
          {...register('testing_notes')}
          rows={2}
          placeholder={t('testingNotesPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none"
        />
      </div>

      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  );
}
