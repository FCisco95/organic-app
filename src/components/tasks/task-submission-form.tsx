'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Plus, X, Loader2, Link as LinkIcon, FileText, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TaskType,
  TaskWithRelations,
  useSubmitTask,
  TaskSubmissionInput,
  developmentSubmissionSchema,
  contentSubmissionSchema,
  designSubmissionSchema,
  customSubmissionSchema,
} from '@/features/tasks';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

interface TaskSubmissionFormProps {
  task: TaskWithRelations;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

type CustomSubmissionInput = z.infer<typeof customSubmissionSchema>;

export function TaskSubmissionForm({
  task,
  onSuccess,
  onCancel,
  className,
}: TaskSubmissionFormProps) {
  const t = useTranslations('Tasks.submission');
  const tTasks = useTranslations('Tasks');
  const taskType = task.task_type ?? 'custom';
  const validTaskTypes: TaskType[] = ['development', 'content', 'design', 'custom'];
  const normalizedTaskType: TaskType = validTaskTypes.includes(taskType as TaskType)
    ? (taskType as TaskType)
    : 'custom';

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('submitWorkFor', { type: tTasks(`taskTypes.${normalizedTaskType}`) })}
      </h3>

      {normalizedTaskType === 'development' && (
        <DevelopmentSubmissionForm task={task} onSuccess={onSuccess} onCancel={onCancel} />
      )}
      {normalizedTaskType === 'content' && (
        <ContentSubmissionForm task={task} onSuccess={onSuccess} onCancel={onCancel} />
      )}
      {normalizedTaskType === 'design' && (
        <DesignSubmissionForm task={task} onSuccess={onSuccess} onCancel={onCancel} />
      )}
      {normalizedTaskType === 'custom' && (
        <CustomSubmissionForm task={task} onSuccess={onSuccess} onCancel={onCancel} />
      )}
    </div>
  );
}

// Development Submission Form
function DevelopmentSubmissionForm({
  task,
  onSuccess,
  onCancel,
}: {
  task: TaskWithRelations;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
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

// Content Submission Form
function ContentSubmissionForm({
  task,
  onSuccess,
  onCancel,
}: {
  task: TaskWithRelations;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
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
        <div className="grid grid-cols-3 gap-3">
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

// Design Submission Form
function DesignSubmissionForm({
  task,
  onSuccess,
  onCancel,
}: {
  task: TaskWithRelations;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const t = useTranslations('Tasks.submission');
  const submitTask = useSubmitTask();
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(designSubmissionSchema),
    defaultValues: {
      submission_type: 'design' as const,
      file_urls: [],
      description: '',
      revision_notes: '',
    },
  });

  const addFileUrl = () => {
    if (newUrl.trim() && !fileUrls.includes(newUrl.trim())) {
      const updated = [...fileUrls, newUrl.trim()];
      setFileUrls(updated);
      setValue('file_urls', updated);
      setNewUrl('');
    }
  };

  const removeFileUrl = (url: string) => {
    const updated = fileUrls.filter((u) => u !== url);
    setFileUrls(updated);
    setValue('file_urls', updated);
  };

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
      <input type="hidden" {...register('submission_type')} value="design" />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('fileUrlsLabel')} <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">{t('fileUrlsHint')}</p>

        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFileUrl();
                }
              }}
              placeholder={t('fileUrlPlaceholder')}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={addFileUrl}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {fileUrls.length > 0 && (
          <ul className="space-y-2">
            {fileUrls.map((url, index) => (
              <li key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-700 truncate">{url}</span>
                <button
                  type="button"
                  onClick={() => removeFileUrl(url)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {errors.file_urls && (
          <p className="mt-1 text-sm text-red-600">{errors.file_urls.message}</p>
        )}
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
          {t('revisionNotesLabel')}
        </label>
        <textarea
          {...register('revision_notes')}
          rows={2}
          placeholder={t('revisionNotesPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none"
        />
      </div>

      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  );
}

// Custom Submission Form
function CustomSubmissionForm({
  task,
  onSuccess,
  onCancel,
}: {
  task: TaskWithRelations;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
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
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none"
        />
      </div>

      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  );
}

// Form Actions (shared)
function FormActions({ isSubmitting, onCancel }: { isSubmitting: boolean; onCancel?: () => void }) {
  const t = useTranslations('Tasks.submission');

  return (
    <div className="flex gap-3 pt-4">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {t('cancel')}
        </button>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {isSubmitting ? t('submitting') : t('submitWork')}
      </button>
    </div>
  );
}
