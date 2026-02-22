'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/context';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { DisputeQueue } from '@/components/disputes/DisputeQueue';
import { DisputeStats } from '@/components/disputes/DisputeStats';
import { cn } from '@/lib/utils';
import { ShieldAlert, Scale } from 'lucide-react';

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
      <div data-testid="disputes-page" className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-gray-900">{t('pageTitle')}</h1>
        <p className="text-gray-600 mt-1">{t('pageDescription')}</p>
      </div>

      {/* Tab toggle for council/admin */}
      {isCouncilOrAdmin && (
        <div
          data-testid="disputes-command-deck"
          className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Scale className="mt-0.5 h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('triage.commandDeckTitle')}</p>
                <p className="text-xs text-gray-500">{t('triage.commandDeckSubtitle')}</p>
              </div>
            </div>
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-700">
              {t('triage.escalationSlaHint')}
            </span>
          </div>
          <DisputeStats />
          <div data-testid="disputes-view-tabs" className="mt-4 flex gap-2">
            <button
              type="button"
              data-testid="disputes-view-tab-queue"
              onClick={() => setTab('queue')}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                tab === 'queue'
                  ? 'bg-organic-orange text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              )}
            >
              {t('queueTitle')}
            </button>
            <button
              type="button"
              data-testid="disputes-view-tab-mine"
              onClick={() => setTab('mine')}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                tab === 'mine'
                  ? 'bg-organic-orange text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              )}
            >
              {t('title')}
            </button>
          </div>
        </div>
      )}

      {!isCouncilOrAdmin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-700" />
            <div>
              <p className="text-sm font-medium text-amber-900">{t('triage.memberQueueTitle')}</p>
              <p className="text-xs text-amber-700">{t('triage.memberQueueSubtitle')}</p>
            </div>
          </div>
        </div>
      )}

      <DisputeQueue myDisputes={tab === 'mine'} />
      </div>
    </PageContainer>
  );
}
