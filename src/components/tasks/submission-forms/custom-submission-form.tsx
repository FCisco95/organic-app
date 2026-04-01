'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link as LinkIcon } from 'lucide-react';
import {
  useSubmitTask,
  TaskSubmissionInput,
  customSubmissionSchema,
} from '@/features/tasks';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import type { SubmissionFormProps } from './types';
import { FormActions } from './form-actions';

type CustomSubmissionInput = z.infer<typeof customSubmissionSchema>;

export function CustomSubmissionForm({ task, onSuccess, onCancel }: SubmissionFormProps) {
  const t = useTranslations('Tasks.submission');
  const submitTask = useSubmitTask();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CustomSubmissionInput>({
    resolver: zodResolver(customSubmissionSchema),
    defaultValues: {
      submission_type: 'custom' as const,
      description: '',
      custom_fields: {
        link: '',
      },
    },
  });

  const onSubmit = async (data: CustomSubmissionInput) => {
    try {
      const cleanedSubmission: TaskSubmissionInput = {
        ...data,
        custom_fields: data.custom_fields?.link ? data.custom_fields : undefined,
      };
      await submitTask.mutateAsync({ taskId: task.id, submission: cleanedSubmission });
      toast.success(t('submissionSuccess'));
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('submissionFailed'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('submission_type')} value="custom" />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('workLinkLabel')}
        </label>
        <div className="relative">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            {...register('custom_fields.link')}
            type="url"
            placeholder={t('workLinkPlaceholder')}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('descriptionLabel')}
        </label>
        <textarea
          {...register('description')}
          rows={4}
          placeholder={t('descriptionGenericPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-transparent resize-none"
        />
      </div>

      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  );
}
