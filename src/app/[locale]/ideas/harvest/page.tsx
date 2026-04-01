'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { PageContainer } from '@/components/layout';
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
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('backToIdeas')}
          </Link>

          {/* TODO: Migrate to <PageHero> — has dynamic weekLabel and custom icon+title layout that doesn't fit current PageHero structure */}
          <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white/10 p-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h1>
                {weekLabel && (
                  <p className="mt-1 text-sm text-gray-400 font-mono">{weekLabel}</p>
                )}
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-300 leading-relaxed max-w-xl">
              {t('subtitle')}
            </p>
          </div>
        </div>

        {/* Harvest content */}
        <div className="opacity-0 animate-fade-up stagger-2">
          <WeeklyHarvest data={harvestQuery.data} isLoading={harvestQuery.isLoading} />
        </div>
      </div>
    </PageContainer>
  );
}
