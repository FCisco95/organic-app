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
  Hash,
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
import { cn } from '@/lib/utils';

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
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-5 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          </div>
          <div className="h-16 bg-muted rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (!member) {
    return (
      <PageContainer width="narrow">
        <p className="text-muted-foreground">{t('memberNotFound')}</p>
      </PageContainer>
    );
  }

  if (!member.profile_visible) {
    const isOwnProfile = user?.id === member.id;

    return (
      <PageContainer width="narrow">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {tC('backToCommunity')}
        </Link>
        <div className="text-center py-16">
          <Lock className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t('privateProfile')}</h2>
          <p className="text-muted-foreground">{t('privateProfileDescription')}</p>
          <p className="text-sm text-muted-foreground mt-2">{t('privateProfileScope')}</p>
          {isOwnProfile && (
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 mt-5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
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
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {tC('backToCommunity')}
        </Link>

        {/* ===== COMPACT HEADER — smaller avatar, inline stats ===== */}
        <div
          className="rounded-xl border border-border bg-card p-4 mb-4"
          data-testid="member-profile-header"
        >
          <div className="flex items-center gap-3">
            {/* Small avatar */}
            {member.avatar_url ? (
              <Image
                src={member.avatar_url}
                alt={displayName}
                width={56}
                height={56}
                className="w-14 h-14 rounded-full object-cover border-2 border-border flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow flex items-center justify-center border-2 border-border flex-shrink-0">
                <span className="text-white font-bold text-xl">
                  {displayName[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}

            {/* Name + badges */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-foreground truncate font-display">{displayName}</h1>
                {member.role && member.role !== 'guest' && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full border',
                      ROLE_COLORS[member.role as UserRole]
                    )}
                  >
                    {ROLE_LABELS[member.role as UserRole]}
                  </span>
                )}
                {reputation && reputation.level > 1 && (
                  <LevelBadge level={reputation.level} size="md" />
                )}
              </div>
              {member.organic_id && (
                <span className="inline-flex items-center gap-0.5 text-xs font-mono text-organic-orange">
                  <Hash className="w-3 h-3" />
                  {member.organic_id}
                </span>
              )}
            </div>

            {/* Inline stat counters */}
            <div className="hidden sm:flex items-center gap-0 flex-shrink-0">
              <div className="text-center px-3 border-r border-border">
                <p className="text-base font-bold font-mono tabular-nums text-foreground leading-none">
                  {member.total_points}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{t('totalPoints')}</p>
              </div>
              <div className="text-center px-3 border-r border-border">
                <p className="text-base font-bold font-mono tabular-nums text-foreground leading-none">
                  {member.tasks_completed}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{t('tasksCompleted')}</p>
              </div>
              <div className="text-center px-3">
                <p className="text-base font-bold font-mono tabular-nums text-foreground leading-none">
                  {memberRank ?? '\u2014'}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{tC('rankLabel')}</p>
              </div>
            </div>
          </div>

          {/* Mobile stat row */}
          <div className="flex items-center gap-0 mt-3 sm:hidden border-t border-border pt-3">
            <div className="text-center flex-1 border-r border-border">
              <p className="text-base font-bold font-mono tabular-nums text-foreground leading-none">
                {member.total_points}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{t('totalPoints')}</p>
            </div>
            <div className="text-center flex-1 border-r border-border">
              <p className="text-base font-bold font-mono tabular-nums text-foreground leading-none">
                {member.tasks_completed}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{t('tasksCompleted')}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-base font-bold font-mono tabular-nums text-foreground leading-none">
                {memberRank ?? '\u2014'}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{tC('rankLabel')}</p>
            </div>
          </div>

          {/* Bio — compact inline */}
          {member.bio && (
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-2">{member.bio}</p>
          )}

          {/* Meta row — compact */}
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
            {member.location && (
              <span className="flex items-center gap-1">
                <MapPin aria-hidden="true" className="w-3 h-3" /> {member.location}
              </span>
            )}
            {member.website && (
              <a
                href={member.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-organic-orange"
              >
                <Globe aria-hidden="true" className="w-3 h-3" /> {t('website')}
                <ExternalLink aria-hidden="true" className="w-2.5 h-2.5" />
              </a>
            )}
            {member.twitter && (
              <a
                href={`https://x.com/${member.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-organic-orange"
              >
                <TwitterIcon /> @{member.twitter}
              </a>
            )}
            {member.discord && (
              <span className="flex items-center gap-1">
                <DiscordIcon /> {member.discord}
              </span>
            )}
            {member.created_at && (
              <span className="flex items-center gap-1">
                <Calendar aria-hidden="true" className="w-3 h-3" />{' '}
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

        {/* ===== Tab strip ===== */}
        <ProfileTabs activeTab={activeProfileTab} onTabChange={setActiveProfileTab} />

        {/* Tab: Overview */}
        <div className={activeProfileTab === 'overview' ? '' : 'hidden'}>
          <div className="space-y-4">
            {/* Quick glance — dense summary bar */}
            <div className="rounded-lg border border-organic-orange/20 bg-organic-orange/5 px-3 py-2">
              <p className="text-xs font-medium text-foreground">
                {tC('quickGlance', {
                  rank: memberRank ?? '\u2014',
                  level: reputation?.level ?? 1,
                  tasks: member.tasks_completed,
                })}
              </p>
            </div>

            {/* Stats — already shown in header on desktop, full cards on mobile for this tab */}
            <div
              className="grid grid-cols-2 gap-3"
              data-testid="member-stats-grid"
            >
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <Star aria-hidden="true" className="w-4 h-4 text-organic-orange mx-auto mb-1.5" />
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">{member.total_points}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('totalPoints')}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <Star aria-hidden="true" className="w-4 h-4 text-green-500 mx-auto mb-1.5" />
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">{member.tasks_completed}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('tasksCompleted')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab: Reputation */}
        <div className={activeProfileTab === 'reputation' ? '' : 'hidden'}>
          {reputation ? (
            <div
              className="rounded-xl border border-border bg-card p-5"
              data-testid="member-reputation-section"
            >
              <div className="flex items-center gap-3 mb-3">
                <LevelBadge level={reputation.level} size="lg" />
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <StreakDisplay streak={reputation.current_streak} />
                </div>
              </div>
              <XpProgressBar xpTotal={reputation.xp_total} level={reputation.level} />

              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground italic">
                  {tC('xpBreakdownComingSoon')}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <p className="text-sm text-muted-foreground">{tRep('noAchievementsYet')}</p>
            </div>
          )}
        </div>

        {/* Tab: Achievements */}
        <div className={activeProfileTab === 'achievements' ? '' : 'hidden'}>
          <div
            className="rounded-xl border border-border bg-card p-5"
            data-testid="member-achievements-grid"
          >
            {achievements && achievements.length > 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                {tC('achievementsEarned', {
                  earned: earnedCount,
                  total: achievements.length,
                })}
              </p>
            )}
            {achievements && achievements.length > 0 ? (
              <div className="[&>div]:grid-cols-2 [&>div]:sm:grid-cols-3 [&>div]:lg:grid-cols-4">
                <AchievementGrid achievements={achievements} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{tRep('noAchievementsYet')}</p>
            )}
          </div>
        </div>

        {/* Tab: Activity */}
        <div className={activeProfileTab === 'activity' ? '' : 'hidden'}>
          <div className="rounded-xl border border-border border-dashed bg-card p-8 text-center">
            <Clock
              aria-hidden="true"
              className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3"
            />
            <p className="text-sm text-muted-foreground">{tC('activityComingSoon')}</p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
