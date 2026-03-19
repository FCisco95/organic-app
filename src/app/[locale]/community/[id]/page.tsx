'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Lock,
  MapPin,
  Globe,
  Star,
  Calendar,
  ExternalLink,
  Flame,
  Clock,
} from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { useMember, ROLE_LABELS, ROLE_COLORS } from '@/features/members';
import type { UserRole } from '@/types/database';
import { useReputation, useAchievements, useLeaderboard } from '@/features/reputation';
import { LevelBadge } from '@/components/reputation/level-badge';
import { XpProgressBar } from '@/components/reputation/xp-progress-bar';
import { StreakDisplay } from '@/components/reputation/streak-display';
import { AchievementGrid } from '@/components/reputation/achievement-grid';
import { ProfileTabs, type ProfileTab } from '@/components/community';
import { useParams } from 'next/navigation';
import { useAuth } from '@/features/auth/context';

function TwitterIcon() {
  return <span className="text-xs font-bold">X</span>;
}
function DiscordIcon() {
  return <span className="text-xs font-bold">D</span>;
}

export default function CommunityProfilePage() {
  const params = useParams<{ id: string }>();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam ?? '';
  const locale = useLocale();
  const t = useTranslations('Members');
  const tC = useTranslations('Community');
  const tRep = useTranslations('Reputation');
  const { user } = useAuth();
  const { data: member, isLoading } = useMember(id);
  const profileVisible = member?.profile_visible ?? false;
  const { data: reputation } = useReputation(id, { enabled: profileVisible });
  const { data: achievements } = useAchievements(id, { enabled: profileVisible });
  const { data: leaderboard = [] } = useLeaderboard({ enabled: profileVisible });

  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('overview');

  const memberRank = useMemo(() => {
    const entry = leaderboard.find((e) => e.id === id);
    return entry?.rank;
  }, [leaderboard, id]);

  const earnedCount = useMemo(() => {
    if (!achievements) return 0;
    return achievements.filter((a) => a.unlocked).length;
  }, [achievements]);

  if (isLoading) {
    return (
      <PageContainer width="narrow">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
          <div className="h-24 bg-gray-200 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (!member) {
    return (
      <PageContainer width="narrow">
        <p className="text-gray-500">{t('memberNotFound')}</p>
      </PageContainer>
    );
  }

  if (!member.profile_visible) {
    const isOwnProfile = user?.id === member.id;

    return (
      <PageContainer width="narrow">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {tC('backToCommunity')}
        </Link>
        <div className="text-center py-16">
          <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('privateProfile')}</h2>
          <p className="text-gray-500">{t('privateProfileDescription')}</p>
          <p className="text-sm text-gray-500 mt-2">{t('privateProfileScope')}</p>
          {isOwnProfile && (
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 mt-5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('managePrivacySettings')}
            </Link>
          )}
        </div>
      </PageContainer>
    );
  }

  const displayName =
    member.name || (member.organic_id ? `ORG-${member.organic_id}` : t('anonymous'));

  return (
    <PageContainer width="narrow">
      <div data-testid="member-profile-page">
        {/* Back link */}
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {tC('backToCommunity')}
        </Link>

        {/* Profile header — always visible above tabs */}
        <div
          className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
          data-testid="member-profile-header"
        >
          <div className="flex items-start gap-5">
            {member.avatar_url ? (
              <Image
                src={member.avatar_url}
                alt={displayName}
                width={80}
                height={80}
                className="rounded-full object-cover border-2 border-gray-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow flex items-center justify-center border-2 border-gray-100">
                <span className="text-white font-bold text-3xl">
                  {displayName[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                {member.role && member.role !== 'guest' && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[member.role as UserRole]}`}
                  >
                    {ROLE_LABELS[member.role as UserRole]}
                  </span>
                )}
                {reputation && reputation.level > 1 && (
                  <LevelBadge level={reputation.level} size="md" />
                )}
              </div>
              {member.organic_id && (
                <p className="text-sm text-gray-500 mt-0.5">ORG-{member.organic_id}</p>
              )}
              {member.bio && (
                <p className="text-gray-600 mt-3 text-sm leading-relaxed">{member.bio}</p>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 mt-5 text-sm text-gray-500">
            {member.location && (
              <span className="flex items-center gap-1">
                <MapPin aria-hidden="true" className="w-3.5 h-3.5" /> {member.location}
              </span>
            )}
            {member.website && (
              <a
                href={member.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-organic-orange"
              >
                <Globe aria-hidden="true" className="w-3.5 h-3.5" /> {t('website')}
                <ExternalLink aria-hidden="true" className="w-3 h-3" />
              </a>
            )}
            {member.twitter && (
              <a
                href={`https://x.com/${member.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-organic-orange"
              >
                <TwitterIcon /> @{member.twitter}
              </a>
            )}
            {member.discord && (
              <span className="flex items-center gap-1.5">
                <DiscordIcon /> {member.discord}
              </span>
            )}
            {member.created_at && (
              <span className="flex items-center gap-1">
                <Calendar aria-hidden="true" className="w-3.5 h-3.5" />{' '}
                {t('memberSince', {
                  date: new Date(member.created_at).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                  }),
                })}
              </span>
            )}
          </div>
        </div>

        {/* Tab strip */}
        <ProfileTabs activeTab={activeProfileTab} onTabChange={setActiveProfileTab} />

        {/* Tab content — CSS hidden toggle to preserve state */}
        <div className={activeProfileTab === 'overview' ? '' : 'hidden'}>
          <div className="opacity-0 animate-fade-up">
            {/* Quick glance summary */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 dark:from-orange-500/10 dark:to-amber-500/10 dark:border-orange-500/20 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {tC('quickGlance', {
                  rank: memberRank ?? '—',
                  level: reputation?.level ?? 1,
                  tasks: member.tasks_completed,
                })}
              </p>
            </div>

            {/* Stats grid */}
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              data-testid="member-stats-grid"
            >
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <Star aria-hidden="true" className="w-5 h-5 text-organic-orange mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{member.total_points}</p>
                <p className="text-sm text-gray-500">{t('totalPoints')}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <Star aria-hidden="true" className="w-5 h-5 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{member.tasks_completed}</p>
                <p className="text-sm text-gray-500">{t('tasksCompleted')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={activeProfileTab === 'reputation' ? '' : 'hidden'}>
          <div className="opacity-0 animate-fade-up">
            {reputation ? (
              <div
                className="bg-white rounded-xl border border-gray-200 p-6"
                data-testid="member-reputation-section"
              >
                <div className="flex items-center gap-4 mb-4">
                  <LevelBadge level={reputation.level} size="lg" />
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <StreakDisplay streak={reputation.current_streak} />
                  </div>
                </div>
                <XpProgressBar xpTotal={reputation.xp_total} level={reputation.level} />

                {/* XP breakdown placeholder */}
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-400 italic">
                    {tC('xpBreakdownComingSoon')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <p className="text-sm text-gray-500">{tRep('noAchievementsYet')}</p>
              </div>
            )}
          </div>
        </div>

        <div className={activeProfileTab === 'achievements' ? '' : 'hidden'}>
          <div className="opacity-0 animate-fade-up">
            <div
              className="bg-white rounded-xl border border-gray-200 p-6"
              data-testid="member-achievements-grid"
            >
              {achievements && achievements.length > 0 && (
                <p className="text-sm text-gray-500 mb-4">
                  {tC('achievementsEarned', {
                    earned: earnedCount,
                    total: achievements.length,
                  })}
                </p>
              )}
              {achievements && achievements.length > 0 ? (
                <AchievementGrid achievements={achievements} />
              ) : (
                <p className="text-sm text-gray-500">{tRep('noAchievementsYet')}</p>
              )}
            </div>
          </div>
        </div>

        <div className={activeProfileTab === 'activity' ? '' : 'hidden'}>
          <div className="opacity-0 animate-fade-up">
            <div className="bg-white rounded-xl border border-gray-200 border-dashed p-8 text-center">
              <Clock
                aria-hidden="true"
                className="w-8 h-8 text-gray-300 mx-auto mb-3"
              />
              <p className="text-sm text-gray-500">{tC('activityComingSoon')}</p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
