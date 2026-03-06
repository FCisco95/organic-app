'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link as LinkIcon } from 'lucide-react';
import {
  useSubmitTask,
  TaskSubmissionInput,
  contentSubmissionSchema,
} from '@/features/tasks';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import type { SubmissionFormProps } from './types';
import { FormActions } from './form-actions';

export function ContentSubmissionForm({ task, onSuccess, onCancel }: SubmissionFormProps) {
  const t = useTranslations('Tasks.submission');
  const submitTask = useSubmitTask();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm({
    resolver: zodResolver(contentSubmissionSchema),
    defaultValues: {
      submission_type: 'content' as const,
      content_link: '',
      content_text: '',
      description: '',
      reach_metrics: {
        views: undefined,
        likes: undefined,
        shares: undefined,
      },
    },
  });

  const contentLink = watch('content_link');
  const contentText = watch('content_text');

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
      <input type="hidden" {...register('submission_type')} value="content" />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('contentLinkLabel')}
        </label>
        <div className="relative">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            {...register('content_link')}
            type="url"
            placeholder={t('contentLinkPlaceholder')}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('contentTextLabel')}
        </label>
        <textarea
          {...register('content_text')}
          rows={4}
          placeholder={t('contentTextPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none"
        />
      </div>

      {!contentLink && !contentText && (
        <p className="text-sm text-amber-600">{t('contentRequired')}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('descriptionLabel')}
        </label>
        <textarea
          {...register('description')}
          rows={2}
          placeholder={t('descriptionPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('reachMetricsLabel')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('views')}</label>
            <input
              {...register('reach_metrics.views', { valueAsNumber: true })}
              type="number"
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('likes')}</label>
            <input
              {...register('reach_metrics.likes', { valueAsNumber: true })}
              type="number"
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('shares')}</label>
            <input
              {...register('reach_metrics.shares', { valueAsNumber: true })}
              type="number"
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  );
}
