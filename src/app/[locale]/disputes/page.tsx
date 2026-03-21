'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/context';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { DisputeQueue } from '@/components/disputes/dispute-queue';
import { cn } from '@/lib/utils';
import { AlertCircle, Search } from 'lucide-react';

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
        {/* Compact command bar — GitHub-style horizontal */}
        <div
          data-testid="disputes-command-deck"
          className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">{t('pageTitle')}</h1>
            {isCouncilOrAdmin && (
              <div data-testid="disputes-view-tabs" className="flex rounded-md border border-gray-200">
                <button
                  type="button"
                  data-testid="disputes-view-tab-queue"
                  onClick={() => setTab('queue')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-md last:rounded-r-md',
                    tab === 'queue'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {t('queueTitle')}
                </button>
                <button
                  type="button"
                  data-testid="disputes-view-tab-mine"
                  onClick={() => setTab('mine')}
                  className={cn(
                    'border-l border-gray-200 px-3 py-1.5 text-sm font-medium transition-colors last:rounded-r-md',
                    tab === 'mine'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {t('title')}
                </button>
              </div>
            )}
          </div>

          {isCouncilOrAdmin && (
            <p className="text-xs text-gray-500">{t('pageDescription')}</p>
          )}
        </div>

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
