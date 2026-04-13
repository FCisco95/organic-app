'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Trophy } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { PageHero } from '@/components/ui/page-hero';
import { useHarvest } from '@/features/ideas';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';
import { WeeklyHarvest } from '@/components/ideas/WeeklyHarvest';

export default function HarvestPage() {
  const t = useTranslations('Harvest');
  const enabled = isIdeasIncubatorEnabled();
  const harvestQuery = useHarvest({ enabled });

  if (!enabled) {
    return (
      <PageContainer width="narrow" className="py-14 text-center">
        <h1 className="text-2xl font-bold text-foreground">{t('disabledTitle')}</h1>
        <p className="mt-2 text-muted-foreground">{t('disabledDescription')}</p>
      </PageContainer>
    );
  }

  const weekLabel = harvestQuery.data
    ? `${new Date(harvestQuery.data.week_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — ${new Date(harvestQuery.data.week_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : '';

  return (
    <PageContainer width="narrow">
      <div className="space-y-6">
        {/* Header */}
        <div className="opacity-0 animate-fade-up stagger-1">
          <Link
            href="/ideas"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 min-h-[44px] py-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('backToIdeas')}
          </Link>

          <PageHero
            icon={Trophy}
            title={t('title')}
            description={t('subtitle')}
            variant="dark"
            badge={
              weekLabel ? (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-mono text-gray-300">
                  {weekLabel}
                </span>
              ) : undefined
            }
          />
        </div>

        {/* Harvest content */}
        <div className="opacity-0 animate-fade-up stagger-2">
          <WeeklyHarvest data={harvestQuery.data} isLoading={harvestQuery.isLoading} />
        </div>
      </div>
    </PageContainer>
  );
}
