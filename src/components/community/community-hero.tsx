'use client';

import { Trophy, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CommunityHeroProps {
  totalMembers?: number;
}

export function CommunityHero({ totalMembers }: CommunityHeroProps) {
  const t = useTranslations('Community');

  return (
    <section className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 text-white text-center mb-8 opacity-0 animate-fade-up stagger-1">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-organic-orange rounded-full mb-4">
        <Trophy className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="text-gray-400 mt-2 max-w-md mx-auto">{t('subtitle')}</p>
      {totalMembers != null && (
        <div className="mt-4 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm">
          <Users className="w-4 h-4" />
          <span>{t('totalMembers', { count: totalMembers })}</span>
        </div>
      )}
    </section>
  );
}
