'use client';

import { FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Lock,
  MessageCircle,
  Pin,
  Trash2,
  TrendingUp,
  Unlock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import {
  useAddIdeaComment,
  useIdea,
  useIdeaComments,
  useModerateIdea,
  usePromoteIdea,
  useVoteIdea,
} from '@/features/ideas';
import { cn } from '@/lib/utils';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { IdeaTimeline } from '@/components/ideas/IdeaTimeline';
import { useIdeaTranslation } from '@/features/translation/hooks';
import { useCommentTranslation } from '@/features/translation/comment-hooks';
import type { IdeaComment } from '@/features/ideas/types';

function IdeaCommentItem({ entry, isLast }: { entry: IdeaComment; isLast: boolean }) {
  const t = useTranslations('IdeaDetail');
  const {
    translation,
    isTranslated,
    isLoading,
    shouldShowButton,
    translate,
    showOriginal,
  } = useCommentTranslation(entry.id, entry.detected_language ?? null);
  const displayBody = isTranslated && translation ? translation : entry.body;

  return (
    <div className="relative flex gap-3 pb-5">
      {!isLast && (
        <div className="absolute left-[15px] top-10 h-[calc(100%-2rem)] w-px border-l-2 border-border" />
      )}
      <Avatar className="relative z-10 h-8 w-8 shrink-0">
        <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
          {getInitials(entry.user_profiles.name, entry.user_profiles.email)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {entry.user_profiles.organic_id
              ? t('authorOrganic', { id: entry.user_profiles.organic_id })
              : entry.user_profiles.name ?? entry.user_profiles.email}
          </span>
          <span className="font-mono">
            {new Date(entry.created_at).toLocaleString()}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {displayBody}
        </p>
        {shouldShowButton && (
          <button
            type="button"
            onClick={isTranslated ? showOriginal : translate}
            disabled={isLoading}
            className="mt-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {isLoading
              ? t('translateLoading')
              : isTranslated
                ? t('translateCommentShowOriginal')
                : t('translateCommentButton')}
          </button>
        )}
      </div>
    </div>
  );
}

function getInitials(name: string | null | undefined, email?: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'promoted':
      return 'bg-organic-terracotta-lightest text-organic-terracotta border-organic-terracotta-light';
    case 'archived':
      return 'bg-muted text-muted-foreground border-border';
    case 'removed':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export default function IdeaDetailPage() {
  const t = useTranslations('IdeaDetail');
  const params = useParams();
  const ideaId = params.id as string;
  const { user, profile } = useAuth();
  const enabled = isIdeasIncubatorEnabled();

  const [comment, setComment] = useState('');

  const ideaQuery = useIdea(ideaId, { enabled });
  const commentsQuery = useIdeaComments(ideaId, { enabled });
  const voteMutation = useVoteIdea();
  const commentMutation = useAddIdeaComment();
  const promoteIdea = usePromoteIdea();
  const moderateIdea = useModerateIdea();

  const idea = ideaQuery.data;
  const canModerate = profile?.role === 'admin' || profile?.role === 'council';

  const {
    translations: ideaTranslations,
    isTranslated: isIdeaTranslated,
    isLoading: isTranslatingIdea,
    translate: translateIdea,
    showOriginal: showIdeaOriginal,
    shouldShowButton: canTranslateIdea,
  } = useIdeaTranslation(ideaId, idea?.detected_language ?? null);

  const displayTitle =
    isIdeaTranslated && ideaTranslations?.title ? ideaTranslations.title : idea?.title ?? '';
  const displayBody =
    isIdeaTranslated && ideaTranslations?.body ? ideaTranslations.body : idea?.body ?? '';

  async function onVote(next: 'up' | 'down' | 'none') {
    if (!idea) return;
    try {
      await voteMutation.mutateAsync({ ideaId: idea.id, input: { value: next } });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('voteError');
      toast.error(message);
    }
  }

  async function onSubmitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idea) return;

    try {
      await commentMutation.mutateAsync({ ideaId: idea.id, input: { body: comment } });
      setComment('');
      toast.success(t('commentPosted'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('commentError');
      toast.error(message);
    }
  }

  async function onModerate(action: Record<string, unknown>) {
    if (!idea) return;
    try {
      await moderateIdea.mutateAsync({ ideaId: idea.id, action });
      toast.success(t('moderationSuccess'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('moderationError');
      toast.error(message);
    }
  }

  async function onPromote() {
    if (!idea || !canModerate) return;

    try {
      const result = await promoteIdea.mutateAsync({ ideaId: idea.id });
      toast.success(t('promoteSuccess'));
      window.location.assign(`/proposals/${result.proposal_id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('promoteError');
      toast.error(message);
    }
  }

  if (!enabled) {
    return (
      <PageContainer width="narrow" className="py-14 text-center">
        <h1 className="text-2xl font-bold text-foreground">{t('disabledTitle')}</h1>
        <p className="mt-2 text-muted-foreground">{t('disabledDescription')}</p>
      </PageContainer>
    );
  }

  if (ideaQuery.isLoading) {
    return (
      <PageContainer width="default">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Skeleton className="h-4 w-12" />
          <ChevronRight className="h-3 w-3" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_var(--sidebar-width)]">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (!idea) {
    return (
      <PageContainer width="narrow" className="py-12 text-center">
        <h1 className="text-2xl font-bold text-foreground">{t('notFoundTitle')}</h1>
        <p className="mt-2 text-muted-foreground">{t('notFoundDescription')}</p>
        <Link
          href="/ideas"
          className="mt-5 inline-block rounded-lg bg-cta px-4 py-2 text-cta-fg hover:bg-cta-hover"
        >
          {t('backToIdeas')}
        </Link>
      </PageContainer>
    );
  }

  if (ideaQuery.isError) {
    return (
      <PageContainer width="narrow" className="py-12 text-center">
        <h1 className="text-2xl font-bold text-foreground">{t('errorTitle')}</h1>
        <p className="mt-2 text-muted-foreground">{t('errorDescription')}</p>
        <button
          type="button"
          onClick={() => ideaQuery.refetch()}
          className="mt-4 text-sm font-semibold text-organic-terracotta hover:text-organic-terracotta-hover"
        >
          {t('retry')}
        </button>
      </PageContainer>
    );
  }

  const vote = idea.user_vote;

  return (
    <PageContainer width="default">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ideas" className="transition-colors hover:text-foreground">
          {t('breadcrumbIdeas')}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate font-medium text-foreground">{idea.title}</span>
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_var(--sidebar-width)]">
        {/* ── Main content ──────────────────────────────────── */}
        <main className="space-y-6">
          {/* Title + status + metadata */}
          <article className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge
                className={cn(
                  'border text-[10px] uppercase tracking-wider',
                  getStatusColor(idea.status)
                )}
              >
                {idea.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {idea.author?.organic_id
                  ? t('authorOrganic', { id: idea.author.organic_id })
                  : idea.author?.name ?? idea.author?.email ?? t('unknownAuthor')}
              </span>
              <span className="text-xs text-muted-foreground">&middot;</span>
              <span className="font-mono text-xs text-muted-foreground">
                {new Date(idea.created_at).toLocaleString()}
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold text-foreground">{displayTitle}</h1>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {displayBody}
            </p>

            {canTranslateIdea && (
              <button
                type="button"
                onClick={() => {
                  if (isTranslatingIdea) return;
                  if (isIdeaTranslated) {
                    showIdeaOriginal();
                  } else {
                    void translateIdea();
                  }
                }}
                disabled={isTranslatingIdea}
                className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isTranslatingIdea
                  ? t('translateLoading')
                  : isIdeaTranslated
                    ? t('translateShowOriginal')
                    : t('translateIdea')}
              </button>
            )}

            {/* Vote panel — horizontal */}
            <div className="mt-6 flex items-center gap-1 rounded-lg border border-border p-1">
              <button
                type="button"
                onClick={() => onVote(vote === 1 ? 'none' : 'up')}
                className={cn(
                  'flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                  vote === 1
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                aria-label={t('upvote')}
              >
                <ArrowUp
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    vote === 1 && 'scale-110'
                  )}
                />
                <span className="font-mono text-xs">{idea.upvotes ?? 0}</span>
              </button>

              <span className="px-2 font-mono text-lg font-bold text-foreground">
                {idea.score}
              </span>

              <button
                type="button"
                onClick={() => onVote(vote === -1 ? 'none' : 'down')}
                className={cn(
                  'flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                  vote === -1
                    ? 'bg-rose-100 text-rose-700'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                aria-label={t('downvote')}
              >
                <ArrowDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    vote === -1 && 'scale-110'
                  )}
                />
                <span className="font-mono text-xs">{idea.downvotes ?? 0}</span>
              </button>

              <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="font-mono">{idea.comments_count ?? 0}</span>
                </span>
              </div>
            </div>

            {/* Linked proposal */}
            {idea.linked_proposal && (
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
                <p className="font-semibold text-emerald-900">{t('linkedProposalLabel')}</p>
                <Link
                  href={`/proposals/${idea.linked_proposal.id}`}
                  className="mt-1 inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800"
                >
                  {idea.linked_proposal.title}
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </article>

          {/* Promote action (admin/council only) */}
          {canModerate && !idea.promoted_to_proposal_id && (
            <div className="rounded-lg border-l-4 border-l-organic-terracotta bg-muted p-4">
              <h3 className="text-sm font-semibold text-foreground">{t('promoteToProposal')}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t('promoteDescription')}</p>
              <Button
                onClick={onPromote}
                disabled={promoteIdea.isPending}
                className="mt-3 disabled:opacity-60"
                variant="cta"
                size="sm"
              >
                <TrendingUp className="h-4 w-4" />
                {promoteIdea.isPending ? t('promoting') : t('promoteToProposal')}
              </Button>
            </div>
          )}

          {/* Moderation panel (admin/council only) */}
          {canModerate && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">{t('moderationTitle')}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onModerate({ is_pinned: !idea.is_pinned })}
                  disabled={moderateIdea.isPending}
                >
                  <Pin className="mr-1 h-3.5 w-3.5" />
                  {idea.is_pinned ? t('modUnpin') : t('modPin')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onModerate({ status: idea.status === 'locked' ? 'open' : 'locked' })
                  }
                  disabled={moderateIdea.isPending}
                >
                  {idea.status === 'locked' ? (
                    <><Unlock className="mr-1 h-3.5 w-3.5" />{t('modUnlock')}</>
                  ) : (
                    <><Lock className="mr-1 h-3.5 w-3.5" />{t('modLock')}</>
                  )}
                </Button>
                {idea.status !== 'removed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onModerate({ status: 'removed' })}
                    disabled={moderateIdea.isPending}
                    className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {t('modRemove')}
                  </Button>
                )}
              </div>
              {idea.removed_at && idea.removed_reason && (
                <p className="mt-3 text-xs text-red-600">
                  {t('removedReason')}: {idea.removed_reason}
                </p>
              )}
            </div>
          )}

          {/* ── Discussion section ────────────────────────────── */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-foreground">{t('discussionTitle')}</h2>

            {user ? (
              <form onSubmit={onSubmitComment} className="mt-4 space-y-3">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('commentPlaceholder')}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
                />
                <Button
                  type="submit"
                  disabled={commentMutation.isPending || comment.trim().length === 0}
                  className="disabled:opacity-60"
                  variant="cta"
                  size="sm"
                >
                  {commentMutation.isPending ? t('commentPosting') : t('commentSubmit')}
                </Button>
              </form>
            ) : (
              <div className="mt-4 rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
                <p>{t('signInPrompt')}</p>
                <Link href="/login" className="mt-2 inline-block font-semibold text-organic-terracotta">
                  {t('signIn')}
                </Link>
              </div>
            )}

            {/* Comments with timeline connector */}
            <div className="mt-6 space-y-0">
              {commentsQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : commentsQuery.data?.comments.length ? (
                commentsQuery.data.comments.map((entry, index) => (
                  <IdeaCommentItem
                    key={entry.id}
                    entry={entry}
                    isLast={index === (commentsQuery.data?.comments.length ?? 0) - 1}
                  />
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {t('commentsEmpty')}
                </p>
              )}
            </div>
          </section>
        </main>

        {/* ── Right sidebar — Activity timeline ───────────── */}
        <aside className="space-y-4">
          <IdeaTimeline idea={idea} />
        </aside>
      </div>
    </PageContainer>
  );
}
