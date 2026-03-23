'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/context';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { DisputeQueue } from '@/components/disputes/dispute-queue';
import { cn } from '@/lib/utils';
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
        <section
          data-testid="disputes-command-deck"
          className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 text-white opacity-0 animate-fade-up stagger-1"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center justify-center w-10 h-10 bg-white/10 rounded-xl mb-3">
                <Shield className="w-5 h-5 text-orange-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('pageTitle')}</h1>
              <p className="mt-2 text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl">{t('pageDescription')}</p>
            </div>
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
          </div>
        </section>

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
        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-400">{t('tabs.filterHint')}</span>
        </div>

        <DisputeQueue myDisputes={tab === 'mine'} showTriageControls={isCouncilOrAdmin ?? false} />
      </div>
    </PageContainer>
  );
}
