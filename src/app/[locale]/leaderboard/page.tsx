'use client';

import { useAuth } from '@/features/auth/context';

import { Trophy, Medal, Award, Star, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { LevelBadge } from '@/components/reputation/level-badge';
import { formatXp, useLeaderboard, type LeaderboardEntry } from '@/features/reputation';

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
          <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">
            {rank}
          </span>
        );
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getDisplayName = (entry: LeaderboardEntry) => {
    if (entry.name) return entry.name;
    if (entry.organic_id) return t('organicId', { id: entry.organic_id });
    return entry.email.split('@')[0];
  };

  // Find current user's rank
  const currentUserRank = leaderboard.find((entry) => entry.id === user?.id);

  return (
    <PageContainer width="narrow">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-organic-orange to-organic-yellow rounded-full mb-4">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600 mt-2">{t('subtitle')}</p>
      </div>

      {/* Current User Stats */}
      {currentUserRank && (
        <div className="bg-gradient-to-r from-organic-orange/10 to-organic-yellow/10 border border-organic-orange/20 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-organic-orange rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('yourPosition')}</p>
                <p className="font-bold text-gray-900">
                  {t('rankLabel', { rank: currentUserRank.rank })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{t('yourXp')}</p>
              <p className="font-bold text-organic-orange text-xl">
                {t('xpLabel', { xp: formatXp(currentUserRank.xp_total) })}
              </p>
              <p className="text-xs text-gray-500">
                {t('pointsSecondaryLabel', { points: currentUserRank.total_points })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Header — hidden on mobile */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
          <div className="col-span-1">{t('tableRank')}</div>
          <div className="col-span-4">{t('tableMember')}</div>
          <div className="col-span-2 text-center">{t('tableLevel')}</div>
          <div className="col-span-2 text-center">{t('tableTasks')}</div>
          <div className="col-span-3 text-right">{t('tableXp')}</div>
        </div>

        {/* Leaderboard Entries */}
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-3 border-organic-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-500">{t('loading')}</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('emptyTitle')}</h3>
            <p className="text-gray-500">{t('emptyDescription')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {leaderboard.map((entry) => {
              const isCurrentUser = entry.id === user?.id;
              return (
                <div key={entry.id}>
                  {/* Mobile card — visible only below sm */}
                  <div
                    className={`sm:hidden px-4 py-3 transition-colors ${getRankStyle(entry.rank)} ${isCurrentUser ? 'ring-2 ring-organic-orange ring-inset' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">{getRankIcon(entry.rank)}</div>
                      {entry.avatar_url ? (
                        <Image
                          src={entry.avatar_url}
                          alt={getDisplayName(entry)}
                          width={36}
                          height={36}
                          className="shrink-0 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow flex items-center justify-center border-2 border-gray-200">
                          <span className="text-white font-bold text-sm">
                            {getDisplayName(entry)[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {getDisplayName(entry)}
                          </p>
                          {isCurrentUser && (
                            <span className="shrink-0 text-xs bg-organic-orange text-white px-2 py-0.5 rounded-full">
                              {t('youBadge')}
                            </span>
                          )}
                          {entry.level != null && entry.level > 0 && (
                            <LevelBadge level={entry.level} size="sm" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {entry.organic_id && (
                            <span className="text-xs text-gray-500">
                              {t('organicId', { id: entry.organic_id })}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {t('tasksCompleted', { count: entry.tasks_completed })}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`font-bold ${
                            entry.rank === 1
                              ? 'text-yellow-600'
                              : entry.rank === 2
                                ? 'text-gray-500'
                                : entry.rank === 3
                                  ? 'text-amber-600'
                                  : 'text-gray-900'
                          }`}
                        >
                          {formatXp(entry.xp_total)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t('pointsSecondaryLabel', { points: entry.total_points })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop row — hidden below sm */}
                  <div
                    className={`hidden sm:grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors ${getRankStyle(
                      entry.rank
                    )} ${isCurrentUser ? 'ring-2 ring-organic-orange ring-inset' : ''}`}
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex items-center">{getRankIcon(entry.rank)}</div>

                    {/* Member Info */}
                    <div className="col-span-4 flex items-center gap-3">
                      {entry.avatar_url ? (
                        <Image
                          src={entry.avatar_url}
                          alt={getDisplayName(entry)}
                          width={40}
                          height={40}
                          className="rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow flex items-center justify-center border-2 border-gray-200">
                          <span className="text-white font-bold">
                            {getDisplayName(entry)[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {getDisplayName(entry)}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs bg-organic-orange text-white px-2 py-0.5 rounded-full">
                              {t('youBadge')}
                            </span>
                          )}
                        </p>
                        {entry.organic_id && (
                          <p className="text-sm text-gray-500">
                            {t('organicId', { id: entry.organic_id })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Level */}
                    <div className="col-span-2 flex items-center justify-center gap-2">
                      {entry.level != null && entry.level > 0 && (
                        <LevelBadge level={entry.level} size="sm" />
                      )}
                      <span className="text-xs text-gray-400">{formatXp(entry.xp_total)}</span>
                    </div>

                    {/* Tasks Completed */}
                    <div className="col-span-2 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {t('tasksCompleted', { count: entry.tasks_completed })}
                      </span>
                    </div>

                    {/* Points */}
                    <div className="col-span-3 text-right">
                      <p
                        className={`font-bold text-lg ${
                          entry.rank === 1
                            ? 'text-yellow-600'
                            : entry.rank === 2
                              ? 'text-gray-500'
                              : entry.rank === 3
                                ? 'text-amber-600'
                                : 'text-gray-900'
                        }`}
                      >
                        {t('xpLabel', { xp: formatXp(entry.xp_total) })}
                      </p>
                      <p className="text-xs text-gray-500">
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
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">{t('howRankingTitle')}</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>{t('howRankingItem1')}</li>
          <li>{t('howRankingItem2')}</li>
          <li>{t('howRankingItem3')}</li>
          <li>{t('howRankingItem4')}</li>
        </ul>
      </div>
    </PageContainer>
  );
}
