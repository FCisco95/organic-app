'use client';

import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { useTreasury } from '@/features/treasury';
import { TOKEN_CONFIG } from '@/config/token';
import { TreasuryHero } from '@/components/treasury/treasury-hero';
import { BalanceCards } from '@/components/treasury/balance-cards';
import { AllocationChart } from '@/components/treasury/allocation-chart';
import { TransactionTable } from '@/components/treasury/transaction-table';

export default function TreasuryPage() {
  const t = useTranslations('Treasury');
  const { data, isLoading } = useTreasury();

  return (
    <PageContainer width="wide">
      <div className="space-y-6">
        {/* Hero explainer */}
        <TreasuryHero walletAddress={TOKEN_CONFIG.treasuryWallet} />

        {/* Balance cards */}
        <BalanceCards balances={data?.balances} loading={isLoading} />

        {/* Charts + transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AllocationChart allocations={data?.allocations} loading={isLoading} />
          <TransactionTable
            transactions={data?.transactions}
            loading={isLoading}
          />
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          {t('disclaimer')}
        </p>
      </div>
    </PageContainer>
  );
}
