'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  CheckCircle2,
  Unlink2,
  ImageIcon,
  ExternalLink,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { XBrandIcon, engagementIcons, engagementColors } from '@/components/ui/x-brand-icon';
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
        body: JSON.stringify({}),
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
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mb-3" />
          <div className="h-10 bg-muted rounded-lg" />
        </div>
        <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
          <div className="h-4 w-48 bg-muted rounded mb-3" />
          <div className="h-10 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!taskConfig) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        {t('twitterTaskConfigMissing')}
      </div>
    );
  }

  const EngagementIcon = engagementIcons[taskConfig.engagement_type] || Heart;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register('submission_type')} value="twitter" />

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-100 text-sky-700">
            <XBrandIcon className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground font-[family-name:var(--font-fraunces)]">
            {t('twitterTargetTweetLabel')}
          </h3>
        </div>

        <a
          href={taskConfig.target_tweet_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50/50 p-3 transition-colors duration-150 hover:bg-sky-50 hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-organic-terracotta"
        >
          <ExternalLink className="w-4 h-4 text-sky-600 flex-shrink-0 transition-transform duration-150 group-hover:scale-110" />
          <span className="text-sm text-sky-700 break-all font-mono font-[family-name:var(--font-jetbrains-mono)] line-clamp-1">
            {taskConfig.target_tweet_url}
          </span>
        </a>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
              engagementColors[taskConfig.engagement_type] || 'bg-muted text-muted-foreground border-border'
            )}
          >
            <EngagementIcon className="w-3 h-3" />
            {t(`twitterEngagementTypes.${taskConfig.engagement_type}`)}
          </span>
        </div>

        {taskConfig.instructions && (
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {taskConfig.instructions}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-muted-foreground">
            <XBrandIcon className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground font-[family-name:var(--font-fraunces)]">
            {t('twitterAccountStatusTitle')}
          </h3>
        </div>

        {account ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border-2 border-emerald-200">
                  {account.profile_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={account.profile_image_url}
                      alt={account.twitter_username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <XBrandIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-foreground text-background flex items-center justify-center border-2 border-card">
                  <XBrandIcon className="w-2.5 h-2.5" />
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {account.display_name || account.twitter_username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{account.twitter_username}
                </p>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200 flex-shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                {t('twitterVerifiedStatus')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleDisconnectTwitter}
              disabled={isDisconnecting}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-all duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-organic-terracotta"
            >
              {isDisconnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unlink2 className="w-3.5 h-3.5" />
              )}
              {t('twitterUnlink')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <XBrandIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {t('twitterConnectHeading')}
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              {t('twitterConnectValueProp')}
            </p>
            <button
              type="button"
              onClick={handleConnectTwitter}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-organic-terracotta focus:ring-offset-2"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XBrandIcon className="w-4 h-4" />
              )}
              {t('twitterConnect')}
            </button>
            <p className="text-[11px] text-muted-foreground mt-3">
              {t('twitterManageInProfile')}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3 font-[family-name:var(--font-fraunces)]">
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
          {t('twitterScreenshotLabel')} <span className="text-destructive">*</span>
        </label>
        <input
          {...register('screenshot_url')}
          type="url"
          placeholder={t('twitterScreenshotPlaceholder')}
          className={cn(
            'w-full px-3 py-2.5 border rounded-lg bg-background text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-organic-terracotta focus:border-transparent',
            errors.screenshot_url ? 'border-destructive' : 'border-border'
          )}
        />
        {errors.screenshot_url && (
          <p className="mt-1.5 text-xs text-destructive">{errors.screenshot_url.message}</p>
        )}
      </div>

      {taskConfig.engagement_type === 'comment' && (
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3 font-[family-name:var(--font-fraunces)]">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            {t('twitterCommentLabel')} <span className="text-destructive">*</span>
          </label>
          <textarea
            {...register('comment_text')}
            rows={3}
            placeholder={t('twitterCommentPlaceholder')}
            className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-organic-terracotta focus:border-transparent resize-none transition-colors duration-150"
          />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('descriptionLabel')}
        </label>
        <textarea
          {...register('description')}
          rows={2}
          placeholder={t('twitterDescriptionPlaceholder')}
          className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-organic-terracotta focus:border-transparent resize-none transition-colors duration-150"
        />
      </div>

      <FormActions
        isSubmitting={isSubmitting || isConnecting || isDisconnecting}
        onCancel={onCancel}
      />
    </form>
  );
}
