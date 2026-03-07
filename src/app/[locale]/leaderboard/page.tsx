'use client';

import { useAuth } from '@/features/auth/context';
import { Trophy, Medal, Award, Star, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { InfoButton } from '@/components/ui/info-button';
import { LevelBadge } from '@/components/reputation/level-badge';
import { formatXp, useLeaderboard, type LeaderboardEntry } from '@/features/reputation';
import { cn } from '@/lib/utils';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const t = useTranslations('Leaderboard');
  const { data: leaderboard = [], isLoading: loading } = useLeaderboard();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold font-mono tabular-nums">
            {rank}
          </span>
        );
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 dark:from-yellow-500/10 dark:to-amber-500/10 dark:border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300 dark:from-gray-500/10 dark:to-slate-500/10 dark:border-gray-500/30';
      case 3:
        return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 dark:from-amber-500/10 dark:to-orange-500/10 dark:border-amber-500/30';
      default:
        return 'bg-card border-border';
    }
  };

  const getDisplayName = (entry: LeaderboardEntry) => {
    if (entry.name) return entry.name;
    if (entry.organic_id) return t('organicId', { id: entry.organic_id });
    return entry.email.split('@')[0];
  };

  const currentUserRank = leaderboard.find((entry) => entry.id === user?.id);
  const podiumEntries = leaderboard.slice(0, 3);
  const tableEntries = leaderboard.slice(3);

  const infoSections = [
    {
      title: t('infoSection1Title'),
      points: [
        t('infoSection1Point1'),
        t('infoSection1Point2'),
        t('infoSection1Point3'),
      ],
    },
    {
      title: t('infoSection2Title'),
      points: [
        t('infoSection2Point1'),
        t('infoSection2Point2'),
        t('infoSection2Point3'),
      ],
    },
    {
      title: t('infoSection3Title'),
      points: [
        t('infoSection3Point1'),
        t('infoSection3Point2'),
      ],
    },
  ];

  return (
    <PageContainer width="default">
      {/* C's dark hero with C's sizing */}
      <section className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 text-white text-center mb-8 opacity-0 animate-fade-up stagger-1">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-organic-orange rounded-full mb-4">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-gray-400 mt-2 max-w-md mx-auto">{t('subtitle')}</p>
      </section>

      {/* C's podium visual with B's detailed info */}
      {!loading && podiumEntries.length >= 3 && (
        <section className="mb-8 opacity-0 animate-fade-up stagger-2" data-testid="leaderboard-podium">
          <div className="flex items-end justify-center gap-3 sm:gap-4">
            {/* 2nd place */}
            <div className="flex flex-col items-center w-24 sm:w-32">
              <div className="relative">
                {podiumEntries[1].avatar_url ? (
                  <Image
                    src={podiumEntries[1].avatar_url}
                    alt={getDisplayName(podiumEntries[1])}
                    width={56}
                    height={56}
                    className="rounded-full object-cover border-2 border-gray-300"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center border-2 border-gray-300">
                    <span className="text-white font-bold text-lg">{getDisplayName(podiumEntries[1])[0].toUpperCase()}</span>
                  </div>
                )}
                <Medal className="absolute -bottom-1 -right-1 w-5 h-5 text-gray-400" />
              </div>
              <p className="mt-2 text-xs font-medium text-foreground truncate w-full text-center">{getDisplayName(podiumEntries[1])}</p>
              <p className="text-xs font-mono tabular-nums text-muted-foreground">{formatXp(podiumEntries[1].xp_total)} XP</p>
              {podiumEntries[1].level != null && podiumEntries[1].level > 0 && (
                <div className="mt-0.5"><LevelBadge level={podiumEntries[1].level} size="sm" /></div>
              )}
              {podiumEntries[1].organic_id && (
                <p className="text-[10px] text-muted-foreground">{t('organicId', { id: podiumEntries[1].organic_id })}</p>
              )}
              <div className="mt-2 w-full h-16 bg-gradient-to-t from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-t-lg flex items-center justify-center">
                <span className="text-lg font-bold text-muted-foreground">2</span>
              </div>
            </div>

            {/* 1st place */}
            <div className="flex flex-col items-center w-28 sm:w-36">
              <div className="relative">
                {podiumEntries[0].avatar_url ? (
                  <Image
                    src={podiumEntries[0].avatar_url}
                    alt={getDisplayName(podiumEntries[0])}
                    width={72}
                    height={72}
                    className="rounded-full object-cover border-3 border-yellow-400"
                  />
                ) : (
                  <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center border-3 border-yellow-400">
                    <span className="text-white font-bold text-2xl">{getDisplayName(podiumEntries[0])[0].toUpperCase()}</span>
                  </div>
                )}
                <Trophy className="absolute -bottom-1 -right-1 w-6 h-6 text-yellow-500" />
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground truncate w-full text-center">{getDisplayName(podiumEntries[0])}</p>
              <p className="text-xs font-mono tabular-nums text-orange-500 font-semibold">{formatXp(podiumEntries[0].xp_total)} XP</p>
              {podiumEntries[0].level != null && podiumEntries[0].level > 0 && (
                <div className="mt-0.5"><LevelBadge level={podiumEntries[0].level} size="sm" /></div>
              )}
              {podiumEntries[0].organic_id && (
                <p className="text-[10px] text-muted-foreground">{t('organicId', { id: podiumEntries[0].organic_id })}</p>
              )}
              <div className="mt-2 w-full h-24 bg-gradient-to-t from-yellow-200 to-yellow-100 dark:from-yellow-600/30 dark:to-yellow-500/20 rounded-t-lg flex items-center justify-center animate-glow-pulse">
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">1</span>
              </div>
            </div>

            {/* 3rd place */}
            <div className="flex flex-col items-center w-24 sm:w-32">
              <div className="relative">
                {podiumEntries[2].avatar_url ? (
                  <Image
                    src={podiumEntries[2].avatar_url}
                    alt={getDisplayName(podiumEntries[2])}
                    width={48}
                    height={48}
                    className="rounded-full object-cover border-2 border-amber-400"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center border-2 border-amber-400">
                    <span className="text-white font-bold">{getDisplayName(podiumEntries[2])[0].toUpperCase()}</span>
                  </div>
                )}
                <Award className="absolute -bottom-1 -right-1 w-5 h-5 text-amber-600" />
              </div>
              <p className="mt-2 text-xs font-medium text-foreground truncate w-full text-center">{getDisplayName(podiumEntries[2])}</p>
              <p className="text-xs font-mono tabular-nums text-muted-foreground">{formatXp(podiumEntries[2].xp_total)} XP</p>
              {podiumEntries[2].level != null && podiumEntries[2].level > 0 && (
                <div className="mt-0.5"><LevelBadge level={podiumEntries[2].level} size="sm" /></div>
              )}
              {podiumEntries[2].organic_id && (
                <p className="text-[10px] text-muted-foreground">{t('organicId', { id: podiumEntries[2].organic_id })}</p>
              )}
              <div className="mt-2 w-full h-12 bg-gradient-to-t from-amber-200 to-amber-100 dark:from-amber-600/20 dark:to-amber-500/10 rounded-t-lg flex items-center justify-center">
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">3</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Current User Stats */}
      {currentUserRank && (
        <div className="bg-gradient-to-r from-orange-500/10 to-organic-orange/10 border border-orange-500/20 rounded-xl p-4 mb-6 opacity-0 animate-fade-up stagger-3 hover:scale-[1.01] transition-transform duration-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('yourPosition')}</p>
                <p className="font-bold text-foreground">
                  {t('rankLabel', { rank: currentUserRank.rank })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t('yourXp')}</p>
              <p className="font-bold text-orange-500 text-xl font-mono tabular-nums animate-count-up">
                {t('xpLabel', { xp: formatXp(currentUserRank.xp_total) })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('pointsSecondaryLabel', { points: currentUserRank.total_points })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden opacity-0 animate-fade-up stagger-4">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
          <div className="col-span-1">{t('tableRank')}</div>
          <div className="col-span-4">{t('tableMember')}</div>
          <div className="col-span-2 text-center">{t('tableLevel')}</div>
          <div className="col-span-2 text-center">{t('tableTasks')}</div>
          <div className="col-span-3 text-right">{t('tableXp')}</div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t('loading')}</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">{t('emptyTitle')}</h3>
            <p className="text-muted-foreground">{t('emptyDescription')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(podiumEntries.length >= 3 ? tableEntries : leaderboard).map((entry, idx) => {
              const isCurrentUser = entry.id === user?.id;
              return (
                <div
                  key={entry.id}
                  className="opacity-0 animate-fade-up-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Mobile card */}
                  <div
                    className={cn(
                      'sm:hidden px-4 py-3 transition-all duration-200',
                      getRankStyle(entry.rank),
                      isCurrentUser && 'ring-2 ring-orange-500 ring-inset'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">{getRankIcon(entry.rank)}</div>
                      {entry.avatar_url ? (
                        <Image
                          src={entry.avatar_url}
                          alt={getDisplayName(entry)}
                          width={36}
                          height={36}
                          className="shrink-0 rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-organic-orange flex items-center justify-center border-2 border-border">
                          <span className="text-white font-bold text-sm">
                            {getDisplayName(entry)[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">
                            {getDisplayName(entry)}
                          </p>
                          {isCurrentUser && (
                            <span className="shrink-0 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                              {t('youBadge')}
                            </span>
                          )}
                          {entry.level != null && entry.level > 0 && (
                            <LevelBadge level={entry.level} size="sm" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {entry.organic_id && (
                            <span className="text-xs text-muted-foreground">
                              {t('organicId', { id: entry.organic_id })}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {t('tasksCompleted', { count: entry.tasks_completed })}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            'font-bold font-mono tabular-nums',
                            entry.rank <= 3 ? 'text-orange-500' : 'text-foreground'
                          )}
                        >
                          {formatXp(entry.xp_total)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('pointsSecondaryLabel', { points: entry.total_points })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop row */}
                  <div
                    className={cn(
                      'hidden sm:grid grid-cols-12 gap-4 px-6 py-4 items-center transition-all duration-200 hover:scale-[1.005]',
                      getRankStyle(entry.rank),
                      isCurrentUser && 'ring-2 ring-orange-500 ring-inset'
                    )}
                  >
                    <div className="col-span-1 flex items-center">{getRankIcon(entry.rank)}</div>

                    <div className="col-span-4 flex items-center gap-3">
                      {entry.avatar_url ? (
                        <Image
                          src={entry.avatar_url}
                          alt={getDisplayName(entry)}
                          width={40}
                          height={40}
                          className="rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-organic-orange flex items-center justify-center border-2 border-border">
                          <span className="text-white font-bold">
                            {getDisplayName(entry)[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">
                          {getDisplayName(entry)}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                              {t('youBadge')}
                            </span>
                          )}
                        </p>
                        {entry.organic_id && (
                          <p className="text-sm text-muted-foreground">
                            {t('organicId', { id: entry.organic_id })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center justify-center gap-2">
                      {entry.level != null && entry.level > 0 && (
                        <LevelBadge level={entry.level} size="sm" />
                      )}
                      <span className="text-xs text-muted-foreground">{formatXp(entry.xp_total)}</span>
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground rounded-full text-sm">
                        {t('tasksCompleted', { count: entry.tasks_completed })}
                      </span>
                    </div>

                    <div className="col-span-3 text-right">
                      <p
                        className={cn(
                          'font-bold text-lg font-mono tabular-nums',
                          entry.rank <= 3 ? 'text-orange-500' : 'text-foreground'
                        )}
                      >
                        {t('xpLabel', { xp: formatXp(entry.xp_total) })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('pointsSecondaryLabel', { points: entry.total_points })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-muted/50 border border-border rounded-lg p-4 opacity-0 animate-fade-up stagger-5">
        <h4 className="font-medium text-foreground mb-2">{t('howRankingTitle')}</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>{t('howRankingItem1')}</li>
          <li>{t('howRankingItem2')}</li>
          <li>{t('howRankingItem3')}</li>
          <li>{t('howRankingItem4')}</li>
        </ul>
      </div>

      <InfoButton sections={infoSections} />
    </PageContainer>
  );
}
