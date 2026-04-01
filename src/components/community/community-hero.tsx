'use client';

import { Trophy, Users, Flame, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

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

  // TODO: Migrate to <PageHero> — centered layout with gradient icon circle and stat pills doesn't fit current PageHero structure
  return (
    <section className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 text-white text-center mb-8 opacity-0 animate-fade-up stagger-1">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-organic-terracotta to-organic-terracotta rounded-full mb-4">
        <Trophy className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="text-gray-400 mt-2 max-w-md mx-auto">{t('subtitle')}</p>

      {/* Stat pills */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 opacity-0 animate-fade-up stagger-2">
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
    </section>
  );
}
