'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Lock, MapPin, Globe, Star, Calendar, ExternalLink } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { useMember, ROLE_LABELS, ROLE_COLORS } from '@/features/members';
import type { UserRole } from '@/types/database';
import { useReputation, useAchievements } from '@/features/reputation';
import { LevelBadge } from '@/components/reputation/level-badge';
import { XpProgressBar } from '@/components/reputation/xp-progress-bar';
import { StreakDisplay } from '@/components/reputation/streak-display';
import { AchievementGrid } from '@/components/reputation/achievement-grid';
import { useParams } from 'next/navigation';
import { useAuth } from '@/features/auth/context';

// Brand icons as simple text since we don't have react-icons
function TwitterIcon() {
  return <span className="text-xs font-bold">X</span>;
}
function DiscordIcon() {
  return <span className="text-xs font-bold">D</span>;
}

export default function MemberProfilePage() {
  const params = useParams<{ id: string }>();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam ?? '';
  const locale = useLocale();
  const t = useTranslations('Members');
  const { user } = useAuth();
  const { data: member, isLoading } = useMember(id);
  const tRep = useTranslations('Reputation');
  const profileVisible = member?.profile_visible ?? false;
  const { data: reputation } = useReputation(id, { enabled: profileVisible });
  const { data: achievements } = useAchievements(id, { enabled: profileVisible });

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
          href={`/${locale}/members`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {t('backToDirectory')}
        </Link>
        <div className="text-center py-16">
          <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('privateProfile')}</h2>
          <p className="text-gray-500">{t('privateProfileDescription')}</p>
          <p className="text-sm text-gray-500 mt-2">{t('privateProfileScope')}</p>
          {isOwnProfile && (
            <Link
              href={`/${locale}/profile`}
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
        href={`/${locale}/members`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> {t('backToDirectory')}
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6" data-testid="member-profile-header">
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

      <nav
        data-testid="member-section-nav"
        aria-label={t('sectionNavigationLabel')}
        className="mb-6 rounded-xl border border-gray-200 bg-white p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t('sectionNavigationLabel')}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href="#member-overview-section"
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            {t('sections.overview')}
          </a>
          {reputation && (
            <a
              href="#member-reputation-section"
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t('sections.reputation')}
            </a>
          )}
          <a
            href="#member-achievements-section"
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            {t('sections.achievements')}
          </a>
        </div>
      </nav>

      {/* Stats */}
      <div
        id="member-overview-section"
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

      {/* Reputation */}
      {reputation && (
        <div
          id="member-reputation-section"
          className="mt-6 bg-white rounded-xl border border-gray-200 p-6"
          data-testid="member-reputation-section"
        >
          <h2 className="text-sm font-semibold text-gray-900 mb-4">{tRep('title')}</h2>
          <div className="flex items-center gap-4 mb-4">
            <LevelBadge level={reputation.level} size="lg" />
            <StreakDisplay streak={reputation.current_streak} />
          </div>
          <XpProgressBar xpTotal={reputation.xp_total} level={reputation.level} />
        </div>
      )}

      {/* Achievements */}
      <div
        id="member-achievements-section"
        className="mt-6 bg-white rounded-xl border border-gray-200 p-6"
        data-testid="member-achievements-grid"
      >
          <h2 className="text-sm font-semibold text-gray-900 mb-4">{tRep('achievements')}</h2>
          {achievements && achievements.length > 0 ? (
            <AchievementGrid achievements={achievements} />
          ) : (
            <p className="text-sm text-gray-500">{tRep('noAchievementsYet')}</p>
          )}
      </div>
      </div>
    </PageContainer>
  );
}
