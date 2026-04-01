'use client';

import { Trophy, Users, Flame, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/ui/page-hero';

interface CommunityHeroProps {
  totalMembers?: number;
  activeThisSprint?: number;
  streakCount?: number;
  currentUserProfileHref?: string;
}

export function CommunityHero({
  totalMembers,
  activeThisSprint,
  streakCount,
  currentUserProfileHref,
}: CommunityHeroProps) {
  const t = useTranslations('Community');

  return (
    <PageHero
      icon={Users}
      title={t('title')}
      description={t('subtitle')}
      variant="dark"
      stats={
        <div className="flex flex-wrap items-center justify-center gap-2">
          {totalMembers != null && (
            <span className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm">
              <Users className="w-4 h-4" />
              {t('totalMembers', { count: totalMembers })}
            </span>
          )}
          {activeThisSprint != null && (
            <span className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm">
              <Zap className="w-4 h-4" />
              {t('activeThisSprint', { count: activeThisSprint })}
            </span>
          )}
          {streakCount != null && streakCount > 0 ? (
            <span className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm">
              <Flame className="w-4 h-4 text-[#E8845C]" />
              {t('streakers', { count: streakCount })}
            </span>
          ) : currentUserProfileHref ? (
            <Link
              href={currentUserProfileHref}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors rounded-full px-4 py-1.5 text-sm"
            >
              <Flame className="w-4 h-4 text-[#E8845C]" />
              {t('buildYourStreak')}
            </Link>
          ) : null}
        </div>
      }
    />
  );
}
