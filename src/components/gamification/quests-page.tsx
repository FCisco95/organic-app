'use client';

import { useTranslations } from 'next-intl';
import { ReferralSection } from './referral-section';
import { QuestLevelSidebar } from './quest-level-sidebar';
import { QuestGrid } from './quest-grid';

export function QuestsPage() {
  const t = useTranslations('Quests');

  return (
    <div data-testid="quests-page" className="space-y-8">
      {/* Referral Section */}
      <ReferralSection />

      {/* Quests Section */}
      <div>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-organic-orange mb-1">
            {t('sectionLabel')}
          </p>
          <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <QuestLevelSidebar />
          <QuestGrid />
        </div>
      </div>
    </div>
  );
}
