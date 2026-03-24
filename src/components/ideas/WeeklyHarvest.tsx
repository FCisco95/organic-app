'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Crown, Flame, Lightbulb, MessageCircle, ThumbsUp, Trophy, Users, Zap } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { HarvestResponse } from '@/features/ideas';

function getInitials(name: string | null | undefined, email?: string | null): string {
  if (name) {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

const PODIUM_STYLES = [
  { ring: 'ring-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '🥇' },
  { ring: 'ring-slate-300', bg: 'bg-slate-50', text: 'text-slate-600', icon: '🥈' },
  { ring: 'ring-amber-600', bg: 'bg-amber-50', text: 'text-amber-700', icon: '🥉' },
];

interface WeeklyHarvestProps {
  data: HarvestResponse | undefined;
  isLoading: boolean;
}

export function WeeklyHarvest({ data, isLoading }: WeeklyHarvestProps) {
  const t = useTranslations('Harvest');

  if (isLoading) return <HarvestSkeleton />;

  const winner = data?.winner;
  const contributors = data?.top_contributors ?? [];
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* ── Winner Spotlight ─────────────────────────────────── */}
      <section className="rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border border-orange-200/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-bold text-foreground">{t('winnerTitle')}</h2>
        </div>

        {winner ? (
          <div className="space-y-3">
            <Link
              href={`/ideas/${winner.id}`}
              className="block text-xl font-bold text-foreground hover:text-orange-600 transition-colors"
            >
              {winner.title}
            </Link>
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {winner.body}
            </p>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-orange-100 text-[10px] font-semibold text-orange-700">
                    {getInitials(winner.author?.name, winner.author?.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">
                  {winner.author?.organic_id
                    ? `Organic #${winner.author.organic_id}`
                    : winner.author?.name ?? t('unknownAuthor')}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span className="font-mono">{winner.score}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="font-mono">{winner.comments_count}</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-orange-200 p-8 text-center">
            <Lightbulb className="mx-auto h-8 w-8 text-orange-300" />
            <p className="mt-2 text-sm text-muted-foreground">{t('noWinner')}</p>
          </div>
        )}
      </section>

      {/* ── Top 3 Contributors ───────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-foreground">{t('contributorsTitle')}</h2>
        </div>

        {contributors.length > 0 ? (
          <div className="space-y-3">
            {contributors.map((entry, i) => {
              const style = PODIUM_STYLES[i] ?? PODIUM_STYLES[2];
              return (
                <div
                  key={entry.user.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <span className="text-lg">{style.icon}</span>
                  <Avatar className={`h-9 w-9 ring-2 ${style.ring}`}>
                    <AvatarFallback className={`${style.bg} text-xs font-semibold ${style.text}`}>
                      {getInitials(entry.user.name, entry.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {entry.user.organic_id
                        ? `Organic #${entry.user.organic_id}`
                        : entry.user.name ?? entry.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                    <Zap className="h-3.5 w-3.5" />
                    <span className="font-mono tabular-nums">{entry.xp_earned}</span>
                    <span className="text-xs font-normal text-muted-foreground">XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">{t('noContributors')}</p>
        )}
      </section>

      {/* ── Community Stats ───────────────────────────────────── */}
      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <ThumbsUp className="mx-auto h-5 w-5 text-emerald-500" />
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">{stats?.total_votes ?? 0}</p>
          <p className="text-xs text-muted-foreground">{t('statVotes')}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Lightbulb className="mx-auto h-5 w-5 text-orange-500" />
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">{stats?.new_ideas ?? 0}</p>
          <p className="text-xs text-muted-foreground">{t('statIdeas')}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Flame className="mx-auto h-5 w-5 text-red-500" />
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">{stats?.active_streaks ?? 0}</p>
          <p className="text-xs text-muted-foreground">{t('statStreaks')}</p>
        </div>
      </section>

      {/* ── Next Week Teaser ─────────────────────────────────── */}
      <section className="rounded-xl border border-dashed border-border bg-muted/50 p-5 text-center">
        <div className="flex items-center justify-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{t('nextWeekTitle')}</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {t('nextWeekDescription')}
        </p>
      </section>
    </div>
  );
}

function HarvestSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <Skeleton className="h-5 w-40" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
