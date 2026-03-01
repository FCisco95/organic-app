'use client';

import { FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, MessageCircle, ThumbsDown, ThumbsUp, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import { useAddIdeaComment, useIdea, useIdeaComments, usePromoteIdea, useVoteIdea } from '@/features/ideas';
import { cn } from '@/lib/utils';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';

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

  const idea = ideaQuery.data;
  const canModerate = profile?.role === 'admin' || profile?.role === 'council';

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
        <h1 className="text-2xl font-bold text-gray-900">{t('disabledTitle')}</h1>
        <p className="mt-2 text-gray-600">{t('disabledDescription')}</p>
      </PageContainer>
    );
  }

  if (ideaQuery.isLoading) {
    return (
      <PageContainer width="narrow">
        <div className="space-y-3">
          <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
        </div>
      </PageContainer>
    );
  }

  if (!idea) {
    return (
      <PageContainer width="narrow" className="py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('notFoundTitle')}</h1>
        <p className="mt-2 text-gray-600">{t('notFoundDescription')}</p>
        <Link href="/ideas" className="mt-5 inline-block rounded-lg bg-organic-orange px-4 py-2 text-white">
          {t('backToIdeas')}
        </Link>
      </PageContainer>
    );
  }

  const vote = idea.user_vote;

  return (
    <PageContainer width="default">
      <Link href="/ideas" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        {t('backToIdeas')}
      </Link>

      <div className="grid gap-6 xl:grid-cols-[72px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => onVote(vote === 1 ? 'none' : 'up')}
              className={cn(
                'rounded-lg p-2 transition-colors',
                vote === 1 ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'
              )}
              aria-label={t('upvote')}
            >
              <ThumbsUp className="h-5 w-5" />
            </button>
            <span className="text-xl font-black text-slate-900">{idea.score}</span>
            <button
              type="button"
              onClick={() => onVote(vote === -1 ? 'none' : 'down')}
              className={cn(
                'rounded-lg p-2 transition-colors',
                vote === -1 ? 'bg-rose-100 text-rose-700' : 'text-gray-500 hover:bg-gray-100'
              )}
              aria-label={t('downvote')}
            >
              <ThumbsDown className="h-5 w-5" />
            </button>
          </div>
        </aside>

        <main className="space-y-6">
          <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>
                {idea.author?.organic_id
                  ? t('authorOrganic', { id: idea.author.organic_id })
                  : idea.author?.name ?? idea.author?.email ?? t('unknownAuthor')}
              </span>
              <span>•</span>
              <span>{new Date(idea.created_at).toLocaleString()}</span>
              <span>•</span>
              <span>{t('status', { status: idea.status })}</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900">{idea.title}</h1>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">{idea.body}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {t('commentsCount', { count: idea.comments_count ?? 0 })}
              </span>
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {t('voteBreakdown', { up: idea.upvotes ?? 0, down: idea.downvotes ?? 0 })}
              </span>
            </div>

            {idea.linked_proposal ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">{t('linkedProposalLabel')}</p>
                <Link
                  href={`/proposals/${idea.linked_proposal.id}`}
                  className="mt-1 inline-block font-medium text-emerald-700 hover:text-emerald-800"
                >
                  {idea.linked_proposal.title}
                </Link>
              </div>
            ) : null}

            {canModerate && !idea.promoted_to_proposal_id ? (
              <button
                type="button"
                onClick={onPromote}
                disabled={promoteIdea.isPending}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
              >
                {promoteIdea.isPending ? t('promoting') : t('promoteToProposal')}
              </button>
            ) : null}
          </article>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">{t('discussionTitle')}</h2>

            {user ? (
              <form onSubmit={onSubmitComment} className="mt-4 space-y-3">
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t('commentPlaceholder')}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={commentMutation.isPending || comment.trim().length === 0}
                  className="rounded-xl bg-organic-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
                >
                  {commentMutation.isPending ? t('commentPosting') : t('commentSubmit')}
                </button>
              </form>
            ) : (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <p>{t('signInPrompt')}</p>
                <Link href="/login" className="mt-2 inline-block font-semibold text-organic-orange">
                  {t('signIn')}
                </Link>
              </div>
            )}

            <div className="mt-6 space-y-3">
              {commentsQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((entry) => (
                    <div key={entry} className="h-20 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              ) : commentsQuery.data?.comments.length ? (
                commentsQuery.data.comments.map((entry) => (
                  <article key={entry.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>
                        {entry.user_profiles.organic_id
                          ? t('authorOrganic', { id: entry.user_profiles.organic_id })
                          : entry.user_profiles.name ?? entry.user_profiles.email}
                      </span>
                      <span>•</span>
                      <span>{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{entry.body}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                  {t('commentsEmpty')}
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    </PageContainer>
  );
}
