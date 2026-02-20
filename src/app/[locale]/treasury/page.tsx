'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { useTreasury } from '@/features/treasury';
import { TOKEN_CONFIG } from '@/config/token';
import { TreasuryHero } from '@/components/treasury/treasury-hero';
import { BalanceCards } from '@/components/treasury/balance-cards';
import { ShieldCheck, TimerReset } from 'lucide-react';

const AllocationChart = dynamic(
  () => import('@/components/treasury/allocation-chart').then((mod) => mod.AllocationChart),
  { loading: () => <div className="h-80 rounded-2xl bg-gray-100 animate-pulse" /> }
);
const TransactionTable = dynamic(
  () => import('@/components/treasury/transaction-table').then((mod) => mod.TransactionTable),
  { loading: () => <div className="h-80 rounded-2xl bg-gray-100 animate-pulse" /> }
);

export default function TreasuryPage() {
  const t = useTranslations('Treasury');
  const { data, isLoading } = useTreasury();
  const trust = data?.trust;
  const updatedAtLabel = trust?.updated_at ? new Date(trust.updated_at).toLocaleString() : t('notAvailable');

  return (
    <PageContainer width="wide">
      <div className="space-y-6">
        {/* Hero explainer */}
        <TreasuryHero walletAddress={TOKEN_CONFIG.treasuryWallet} trust={trust} />

        <section
          className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-orange-50/30 to-slate-50 p-5"
          data-testid="treasury-transparency-panel"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-700">
                {t('transparencyTitle')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">{t('transparencyDescription')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600"
                data-testid="treasury-trust-updated"
              >
                <TimerReset className="h-3.5 w-3.5 text-gray-500" />
                {t('updatedAt', { date: updatedAtLabel })}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600"
                data-testid="treasury-trust-cadence"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                {t('refreshCadence', { seconds: trust?.refresh_interval_seconds ?? 60 })}
              </span>
            </div>
          </div>
        </section>

        {/* Balance cards */}
        <BalanceCards balances={data?.balances} loading={isLoading} />

        {/* Charts + transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AllocationChart allocations={data?.allocations} loading={isLoading} />
          <TransactionTable transactions={data?.transactions} loading={isLoading} />
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-400 pb-4">{t('disclaimer')}</p>
      </div>
    </PageContainer>
  );
}
