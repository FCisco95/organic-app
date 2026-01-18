'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/context';

import { Trophy, Medal, Award, User, Star, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

type LeaderboardEntry = {
  id: string;
  name: string | null;
  email: string;
  organic_id: number | null;
  avatar_url: string | null;
  total_points: number;
  tasks_completed: number;
  role: string;
  rank: number;
};

export default function LeaderboardPage() {
  const { user, profile } = useAuth();
  const t = useTranslations('Leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">{rank}</span>;
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
  const currentUserRank = leaderboard.find(entry => entry.id === user?.id);

  return (
    <div className="min-h-screen bg-gray-50">


      <div className="max-w-4xl mx-auto py-8 px-4">
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
                  <p className="font-bold text-gray-900">{t('rankLabel', { rank: currentUserRank.rank })}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{t('yourPoints')}</p>
                <p className="font-bold text-organic-orange text-xl">
                  {t('pointsLabel', { points: currentUserRank.total_points })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
            <div className="col-span-1">{t('tableRank')}</div>
            <div className="col-span-6">{t('tableMember')}</div>
            <div className="col-span-2 text-center">{t('tableTasks')}</div>
            <div className="col-span-3 text-right">{t('tablePoints')}</div>
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
                  <div
                    key={entry.id}
                    className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors ${
                      getRankStyle(entry.rank)
                    } ${isCurrentUser ? 'ring-2 ring-organic-orange ring-inset' : ''}`}
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex items-center">
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* Member Info */}
                    <div className="col-span-6 flex items-center gap-3">
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

                    {/* Tasks Completed */}
                    <div className="col-span-2 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {t('tasksCompleted', { count: entry.tasks_completed })}
                      </span>
                    </div>

                    {/* Points */}
                    <div className="col-span-3 text-right">
                      <span className={`font-bold text-lg ${
                        entry.rank === 1 ? 'text-yellow-600' :
                        entry.rank === 2 ? 'text-gray-500' :
                        entry.rank === 3 ? 'text-amber-600' :
                        'text-gray-900'
                      }`}>
                        {t('pointsLabel', { points: entry.total_points })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">{t('howPointsTitle')}</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>{t('howPointsItem1')}</li>
            <li>{t('howPointsItem2')}</li>
            <li>{t('howPointsItem3')}</li>
            <li>{t('howPointsItem4')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
