'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/context';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { DisputeQueue } from '@/components/disputes/DisputeQueue';
import { DisputeStats } from '@/components/disputes/DisputeStats';
import { cn } from '@/lib/utils';

export default function DisputesPage() {
  const { profile } = useAuth();
  const t = useTranslations('Disputes');
  const isCouncilOrAdmin =
    profile?.role === 'admin' || profile?.role === 'council';

  const [tab, setTab] = useState<'queue' | 'mine'>(
    isCouncilOrAdmin ? 'queue' : 'mine'
  );

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('pageTitle')}</h1>
        <p className="text-gray-600 mt-1">{t('pageDescription')}</p>
      </div>

      {/* Tab toggle for council/admin */}
      {isCouncilOrAdmin && (
        <>
          <DisputeStats />
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab('queue')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                tab === 'queue'
                  ? 'bg-organic-orange text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              )}
            >
              {t('queueTitle')}
            </button>
            <button
              onClick={() => setTab('mine')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                tab === 'mine'
                  ? 'bg-organic-orange text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              )}
            >
              {t('title')}
            </button>
          </div>
        </>
      )}

      <DisputeQueue myDisputes={tab === 'mine'} />
    </PageContainer>
  );
}
