'use client';

import { useTranslations } from 'next-intl';
import { Swords } from 'lucide-react';
import { ReferralSection } from './referral-section';
import { QuestLevelSidebar } from './quest-level-sidebar';
import { QuestGrid } from './quest-grid';

export function QuestsPage() {
  const t = useTranslations('Quests');

  return (
    <div data-testid="quests-page" className="space-y-8">
      {/* Dark hero */}
      <section className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 text-white opacity-0 animate-fade-up stagger-1">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-white/10 rounded-xl mb-3">
          <Swords className="w-5 h-5 text-orange-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl">{t('subtitle')}</p>
      </section>

      {/* Referral Section */}
      <ReferralSection />

      {/* Quests Section */}
      <div>

        <div className="flex flex-col lg:flex-row gap-6">
          <QuestLevelSidebar />
          <QuestGrid />
        </div>
      </div>
    </div>
  );
}
