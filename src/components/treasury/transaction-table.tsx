'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { ChartCard } from '@/components/analytics/chart-card';
import { cn } from '@/lib/utils';
import type { TreasuryTransaction } from '@/features/treasury';

interface TransactionTableProps {
  transactions: TreasuryTransaction[] | undefined;
  loading: boolean;
}

function formatDate(blockTime: number | null): string {
  if (blockTime == null) return '—';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(blockTime * 1000));
}

function formatAmount(amount: number | null, token: string | null): string {
  if (amount == null) return '—';
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M ${token ?? ''}`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K ${token ?? ''}`;
  return `${amount.toFixed(4)} ${token ?? ''}`;
}

function shortSig(signature: string): string {
  return `${signature.slice(0, 8)}...${signature.slice(-4)}`;
}

export function TransactionTable({ transactions, loading }: TransactionTableProps) {
  const t = useTranslations('Treasury');

  return (
    <ChartCard title={t('transactionsTitle')} description={t('transactionsDesc')} loading={loading}>
      {!transactions || transactions.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          {t('noTransactions')}
        </p>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 pb-2 text-left text-xs font-medium text-gray-400">
                  {t('colSignature')}
                </th>
                <th className="px-3 pb-2 text-left text-xs font-medium text-gray-400">
                  {t('colType')}
                </th>
                <th className="px-3 pb-2 text-right text-xs font-medium text-gray-400">
                  {t('colAmount')}
                </th>
                <th className="px-3 pb-2 text-right text-xs font-medium text-gray-400">
                  {t('colDate')}
                </th>
                <th className="px-5 pb-2 text-right text-xs font-medium text-gray-400" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map((tx) => (
                <tr
                  key={tx.signature}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-5 py-2.5">
                    <code className="text-xs font-mono text-gray-600">
                      {shortSig(tx.signature)}
                    </code>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {tx.direction === 'in' ? (
                        <ArrowDownLeft className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span
                        className={cn(
                          'text-xs font-medium',
                          tx.direction === 'in'
                            ? 'text-green-600'
                            : 'text-red-600'
                        )}
                      >
                        {tx.type === 'transfer'
                          ? 'SOL Transfer'
                          : tx.type === 'token_transfer'
                            ? 'Token Transfer'
                            : t('txUnknown')}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        'text-xs font-mono tabular-nums',
                        tx.direction === 'in'
                          ? 'text-green-600'
                          : 'text-red-600'
                      )}
                    >
                      {tx.direction === 'in' ? '+' : '-'}
                      {formatAmount(tx.amount, tx.token)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-gray-500">
                    {formatDate(tx.block_time)}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <a
                      href={`https://solscan.io/tx/${tx.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={t('viewOnSolscan')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}
