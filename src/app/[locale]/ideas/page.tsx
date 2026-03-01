'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { MessageCircle, Plus, ThumbsDown, ThumbsUp, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import {
  type IdeaSort,
  useCreateIdea,
  useIdeas,
  useIdeasKpis,
  useVoteIdea,
} from '@/features/ideas';
import { cn } from '@/lib/utils';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';

const SORTS: IdeaSort[] = ['hot', 'new', 'top_week', 'top_all'];

export default function IdeasPage() {
  const t = useTranslations('Ideas');
  const { user, profile } = useAuth();
  const [sort, setSort] = useState<IdeaSort>('hot');
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const enabled = isIdeasIncubatorEnabled();
  const canCreate = Boolean(profile?.organic_id);

  const ideasQuery = useIdeas({ sort, search, enabled });
  const kpisQuery = useIdeasKpis({ enabled });
  const createIdea = useCreateIdea();
  const voteIdea = useVoteIdea();

  const spotlightText = useMemo(() => {
    if (!kpisQuery.data?.spotlight) return t('spotlightEmpty');
    return `${kpisQuery.data.spotlight.title} • ${kpisQuery.data.spotlight.score} ${t('pointsSuffix')}`;
  }, [kpisQuery.data?.spotlight, t]);

  async function onCreateIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreate) {
      toast.error(t('organicRequired'));
      return;
    }

    try {
      await createIdea.mutateAsync({ title, body });
      setTitle('');
      setBody('');
      toast.success(t('ideaCreated'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('ideaCreateError');
      toast.error(message);
    }
  }

  async function onVote(ideaId: string, next: 'up' | 'down' | 'none') {
    try {
      await voteIdea.mutateAsync({ ideaId, input: { value: next } });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('voteError');
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

  return (
    <PageContainer>
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-100 p-6 shadow-sm">
        <div className="absolute -top-20 -right-20 h-52 w-52 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative z-10 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                {t('kicker')}
              </p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">{t('title')}</h1>
              <p className="mt-1 max-w-2xl text-slate-700">{t('subtitle')}</p>
            </div>
            <Link
              href="/proposals"
              className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              <TrendingUp className="h-4 w-4" />
              {t('governanceCta')}
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t('kpiTotalIdeas')} value={kpisQuery.data?.total_ideas ?? 0} />
            <StatCard label={t('kpiActiveIdeas')} value={kpisQuery.data?.active_ideas ?? 0} />
            <StatCard label={t('kpiPromoted')} value={kpisQuery.data?.promoted_ideas ?? 0} />
            <StatCard label={t('kpiConversion')} value={`${kpisQuery.data?.conversion_rate ?? 0}%`} />
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">{t('spotlightLabel')}</p>
            <p className="text-sm font-semibold text-slate-900">{spotlightText}</p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {SORTS.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setSort(entry)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                    sort === entry
                      ? 'bg-slate-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {t(`sort_${entry}` as 'sort_hot' | 'sort_new' | 'sort_top_week' | 'sort_top_all')}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm sm:w-72"
            />
          </div>

          {ideasQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((entry) => (
                <div
                  key={entry}
                  className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-white"
                />
              ))}
            </div>
          ) : ideasQuery.data?.length ? (
            <div className="space-y-3" data-testid="ideas-feed-list">
              {ideasQuery.data.map((idea) => {
                const vote = idea.user_vote;

                return (
                  <article key={idea.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex gap-4">
                      <div className="flex w-14 shrink-0 flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onVote(idea.id, vote === 1 ? 'none' : 'up')}
                          className={cn(
                            'rounded-lg p-1.5 transition-colors',
                            vote === 1 ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'
                          )}
                          aria-label={t('upvote')}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-bold text-slate-900">{idea.score}</span>
                        <button
                          type="button"
                          onClick={() => onVote(idea.id, vote === -1 ? 'none' : 'down')}
                          className={cn(
                            'rounded-lg p-1.5 transition-colors',
                            vote === -1 ? 'bg-rose-100 text-rose-700' : 'text-gray-500 hover:bg-gray-100'
                          )}
                          aria-label={t('downvote')}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>
                            {idea.author?.organic_id
                              ? t('authorOrganic', { id: idea.author.organic_id })
                              : idea.author?.name ?? idea.author?.email ?? t('unknownAuthor')}
                          </span>
                          <span>•</span>
                          <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                          {idea.is_pinned ? (
                            <>
                              <span>•</span>
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                                {t('pinned')}
                              </span>
                            </>
                          ) : null}
                        </div>

                        <Link href={`/ideas/${idea.id}`} className="mt-1 block hover:text-organic-orange">
                          <h3 className="line-clamp-2 text-base font-bold text-slate-900">{idea.title}</h3>
                        </Link>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{idea.body}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {t('comments', { count: idea.comments_count ?? 0 })}
                          </span>
                          {idea.promoted_to_proposal_id ? (
                            <Link
                              href={`/proposals/${idea.promoted_to_proposal_id}`}
                              className="text-emerald-700 hover:text-emerald-800"
                            >
                              {t('linkedProposal')}
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
              <p className="text-gray-600">{t('empty')}</p>
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('composerTitle')}</h2>
            <p className="text-sm text-gray-600">{t('composerSubtitle')}</p>
          </div>

          {user ? (
            canCreate ? (
              <form onSubmit={onCreateIdea} className="space-y-3">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t('composerTitlePlaceholder')}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  maxLength={200}
                />
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder={t('composerBodyPlaceholder')}
                  className="h-36 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  maxLength={10000}
                />
                <button
                  type="submit"
                  disabled={createIdea.isPending || title.trim().length < 5 || body.trim().length < 20}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-organic-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  {createIdea.isPending ? t('publishing') : t('publish')}
                </button>
              </form>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {t('organicRequired')}
              </div>
            )
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p>{t('signinPrompt')}</p>
              <Link href="/login" className="mt-2 inline-block font-semibold text-organic-orange">
                {t('signIn')}
              </Link>
            </div>
          )}
        </aside>
      </section>
    </PageContainer>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
