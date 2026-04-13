'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { TOKEN_CONFIG } from '@/config/token';
import type { TreasuryBalance } from '@/features/treasury';

interface BalanceCardsProps {
  balances: TreasuryBalance | undefined;
  loading: boolean;
}

function formatUsd(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatAmount(value: number, decimals = 4): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(decimals);
}

export function BalanceCards({ balances, loading }: BalanceCardsProps) {
  const t = useTranslations('Treasury');

  const cards = [
    {
      label: t('totalValue'),
      value: formatUsd(balances?.total_usd),
      mono: true,
      accent: true,
    },
    {
      label: t('solBalance'),
      value: balances ? `${formatAmount(balances.sol)} SOL` : '—',
      sub: formatUsd(balances?.sol_usd),
      mono: true,
    },
    {
      label: t('orgBalance', { symbol: TOKEN_CONFIG.symbol }),
      value: balances ? `${formatAmount(balances.org, 0)} ${TOKEN_CONFIG.symbol}` : '—',
      sub: formatUsd(balances?.org_usd),
      mono: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            'rounded-2xl bg-card shadow-sm ring-1 ring-border px-5 py-5',
            card.accent && 'ring-organic-terracotta-light/70 bg-organic-terracotta-lightest/30'
          )}
        >
          {loading ? (
            <>
              <div className="h-7 w-24 rounded-md bg-muted animate-pulse" />
              <div className="mt-2 h-3 w-16 rounded bg-muted/50 animate-pulse" />
            </>
          ) : (
            <>
              <p
                className={cn(
                  'text-2xl font-bold text-foreground leading-none',
                  card.mono && 'font-mono tabular-nums text-xl'
                )}
              >
                {card.value}
              </p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <p className="text-xs text-muted-foreground leading-tight">{card.label}</p>
                {card.sub && (
                  <p className="text-xs font-mono text-gray-400 tabular-nums">{card.sub}</p>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
