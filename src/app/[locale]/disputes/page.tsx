'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/context';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { DisputeQueue } from '@/components/disputes/dispute-queue';
import { cn } from '@/lib/utils';
import { PageHero } from '@/components/ui/page-hero';
import { AlertCircle, Search, Shield } from 'lucide-react';

export default function DisputesPage() {
  const { profile } = useAuth();
  const t = useTranslations('Disputes');
  const isCouncilOrAdmin =
    profile?.role === 'admin' || profile?.role === 'council';

  const [tab, setTab] = useState<'queue' | 'mine'>(
    isCouncilOrAdmin ? 'queue' : 'mine'
  );

  return (
    <PageContainer layout="fluid">
      <div data-testid="disputes-page" className="space-y-4">
        {/* Dark hero */}
        <PageHero
          icon={Shield}
          title={t('pageTitle')}
          description={t('pageDescription')}
        >
          {isCouncilOrAdmin && (
            <div data-testid="disputes-view-tabs" className="flex rounded-lg overflow-hidden border border-white/20">
              <button
                type="button"
                data-testid="disputes-view-tab-queue"
                onClick={() => setTab('queue')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === 'queue'
                    ? 'bg-white text-gray-900'
                    : 'text-gray-300 hover:bg-white/10'
                )}
              >
                {t('queueTitle')}
              </button>
              <button
                type="button"
                data-testid="disputes-view-tab-mine"
                onClick={() => setTab('mine')}
                className={cn(
                  'border-l border-white/20 px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === 'mine'
                    ? 'bg-white text-gray-900'
                    : 'text-gray-300 hover:bg-white/10'
                )}
              >
                {t('title')}
              </button>
            </div>
          )}
        </PageHero>

        {!isCouncilOrAdmin && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">{t('triage.memberQueueTitle')}</p>
              <p className="text-xs text-amber-700">{t('triage.memberQueueSubtitle')}</p>
            </div>
          </div>
        )}

        {/* Search hint bar */}
        <div className="flex items-center gap-2 rounded-md border border-border bg-gray-50/50 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-400">{t('tabs.filterHint')}</span>
        </div>

        <DisputeQueue myDisputes={tab === 'mine'} showTriageControls={isCouncilOrAdmin ?? false} />
      </div>
    </PageContainer>
  );
}
