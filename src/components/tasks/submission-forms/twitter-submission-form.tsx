'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  AtSign,
  CheckCircle2,
  Unlink2,
  ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useSubmitTask,
  TaskSubmissionInput,
  twitterSubmissionSchema,
} from '@/features/tasks';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { SubmissionFormProps } from './types';
import { FormActions } from './form-actions';

type TwitterSubmissionInput = z.infer<typeof twitterSubmissionSchema>;

type TwitterEngagementTaskConfig = {
  engagement_type: 'like' | 'retweet' | 'comment';
  target_tweet_url: string;
  instructions: string | null;
};

type LinkedTwitterAccount = {
  id: string;
  twitter_username: string;
  display_name: string | null;
  profile_image_url: string | null;
};

export function TwitterSubmissionForm({ task, onSuccess, onCancel }: SubmissionFormProps) {
  const t = useTranslations('Tasks.submission');
  const submitTask = useSubmitTask();
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [taskConfig, setTaskConfig] = useState<TwitterEngagementTaskConfig | null>(null);
  const [account, setAccount] = useState<LinkedTwitterAccount | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TwitterSubmissionInput>({
    resolver: zodResolver(twitterSubmissionSchema),
    defaultValues: {
      submission_type: 'twitter' as const,
      screenshot_url: '',
      comment_text: '',
      description: '',
    },
  });

  useEffect(() => {
    let isCancelled = false;

    async function loadContext() {
      setIsLoadingContext(true);
      try {
        const supabase = createClient();
        const [{ data: config, error: configError }, accountResponse] = await Promise.all([
          supabase
            .from('twitter_engagement_tasks')
            .select('engagement_type, target_tweet_url, instructions')
            .eq('task_id', task.id)
            .maybeSingle(),
          fetch('/api/twitter/account'),
        ]);

        if (configError) {
          throw configError;
        }

        const accountPayload = accountResponse.ok ? await accountResponse.json() : null;

        if (!isCancelled) {
          setTaskConfig((config as TwitterEngagementTaskConfig | null) ?? null);
          setAccount((accountPayload?.account as LinkedTwitterAccount | null) ?? null);
        }
      } catch {
        if (!isCancelled) {
          setTaskConfig(null);
          setAccount(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingContext(false);
        }
      }
    }

    void loadContext();

    return () => {
      isCancelled = true;
    };
  }, [task.id]);

  const handleConnectTwitter = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/twitter/link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || t('twitterLinkStartFailed'));
      }

      if (!payload.auth_url) {
        throw new Error(t('twitterLinkStartFailed'));
      }

      window.location.assign(payload.auth_url as string);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('twitterLinkStartFailed'));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectTwitter = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/twitter/account', { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || t('twitterUnlinkFailed'));
      }
      setAccount(null);
      toast.success(t('twitterUnlinked'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('twitterUnlinkFailed'));
    } finally {
      setIsDisconnecting(false);
    }
  };

  const onSubmit = async (data: TwitterSubmissionInput) => {
    if (!account) {
      toast.error(t('twitterLinkRequired'));
      return;
    }

    if (taskConfig?.engagement_type === 'comment' && !data.comment_text?.trim()) {
      toast.error(t('twitterCommentRequired'));
      return;
    }

    if (!data.screenshot_url?.trim()) {
      toast.error(t('twitterScreenshotRequired'));
      return;
    }

    const cleanedSubmission: TaskSubmissionInput = {
      ...data,
      screenshot_url: data.screenshot_url.trim(),
      comment_text: data.comment_text?.trim() || undefined,
      description: data.description?.trim() || undefined,
    };

    try {
      await submitTask.mutateAsync({ taskId: task.id, submission: cleanedSubmission });
      toast.success(t('submissionSuccess'));
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('submissionFailed'));
    }
  };

  if (isLoadingContext) {
    return (
      <div className="py-8 text-sm text-gray-500 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t('twitterLoadingContext')}
      </div>
    );
  }

  if (!taskConfig) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {t('twitterTaskConfigMissing')}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('submission_type')} value="twitter" />

      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm font-medium text-sky-900">{t('twitterTargetTweetLabel')}</p>
        <a
          href={taskConfig.target_tweet_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-1 text-sm text-sky-700 hover:underline break-all"
        >
          <AtSign className="w-4 h-4" />
          {taskConfig.target_tweet_url}
        </a>
        <p className="mt-2 text-xs text-sky-800">
          {t('twitterEngagementTypeLabel')}:{' '}
          {t(`twitterEngagementTypes.${taskConfig.engagement_type}`)}
        </p>
        {taskConfig.instructions && (
          <p className="mt-2 text-sm text-sky-900">
            <strong>{t('twitterInstructionsLabel')}:</strong> {taskConfig.instructions}
          </p>
        )}
      </div>

      <div
        className={cn(
          'rounded-lg border p-4',
          account ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
        )}
      >
        {account ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-emerald-200">
                  {account.profile_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={account.profile_image_url}
                      alt={account.twitter_username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-emerald-700">
                      <AtSign className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-900 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('twitterAccountConnected')}
                  </p>
                  <p className="text-sm text-emerald-800">
                    {account.display_name || account.twitter_username} (@
                    {account.twitter_username})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDisconnectTwitter}
                disabled={isDisconnecting}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                {isDisconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlink2 className="w-4 h-4" />
                )}
                {t('twitterUnlink')}
              </button>
            </div>
            <p className="text-xs text-emerald-900">{t('twitterManageInProfile')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-amber-900">{t('twitterLinkRequired')}</p>
            <button
              type="button"
              onClick={handleConnectTwitter}
              disabled={isConnecting}
              className="inline-flex w-fit items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <AtSign className="w-4 h-4" />
              )}
              {t('twitterConnect')}
            </button>
            <p className="text-xs text-amber-900">{t('twitterManageInProfile')}</p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('twitterScreenshotLabel')} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            {...register('screenshot_url')}
            type="url"
            placeholder={t('twitterScreenshotPlaceholder')}
            className={cn(
              'w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent',
              errors.screenshot_url ? 'border-red-300' : 'border-gray-300'
            )}
          />
        </div>
        {errors.screenshot_url && (
          <p className="mt-1 text-sm text-red-600">{errors.screenshot_url.message}</p>
        )}
      </div>

      {taskConfig.engagement_type === 'comment' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('twitterCommentLabel')} <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('comment_text')}
            rows={3}
            placeholder={t('twitterCommentPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('descriptionLabel')}
        </label>
        <textarea
          {...register('description')}
          rows={2}
          placeholder={t('twitterDescriptionPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none"
        />
      </div>

      <FormActions
        isSubmitting={isSubmitting || isConnecting || isDisconnecting}
        onCancel={onCancel}
      />
    </form>
  );
}
