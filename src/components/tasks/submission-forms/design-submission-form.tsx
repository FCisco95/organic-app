'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X, Link as LinkIcon, ImageIcon } from 'lucide-react';
import {
  useSubmitTask,
  TaskSubmissionInput,
  designSubmissionSchema,
} from '@/features/tasks';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import type { SubmissionFormProps } from './types';
import { FormActions } from './form-actions';

export function DesignSubmissionForm({ task, onSuccess, onCancel }: SubmissionFormProps) {
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

        <div className="flex flex-col sm:flex-row gap-2 mb-2">
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
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-transparent"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-transparent resize-none"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-transparent resize-none"
        />
      </div>

      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  );
}
