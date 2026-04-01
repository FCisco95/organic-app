'use client';

import { useTranslations } from 'next-intl';
import { Swords } from 'lucide-react';
import { PageHero } from '@/components/ui/page-hero';
import { ReferralSection } from './referral-section';
import { QuestLevelSidebar } from './quest-level-sidebar';
import { QuestGrid } from './quest-grid';

export function QuestsPage() {
  const t = useTranslations('Quests');

  return (
    <div data-testid="quests-page" className="space-y-8">
      <PageHero icon={Swords} title={t('title')} description={t('subtitle')} />

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
