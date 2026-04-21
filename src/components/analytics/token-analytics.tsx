'use client';

import { useTranslations } from 'next-intl';
import { useMarketAnalytics } from '@/features/analytics/hooks';
import { TOKEN_CONFIG } from '@/config/token';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Users,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart,
  Shield,
  Zap,
} from 'lucide-react';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('rounded-md bg-muted animate-pulse', className)} />;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(6)}`;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function DeltaBadge({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full font-medium font-mono tabular-nums',
        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'
      )}
    >
      <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function ConcentrationBar({
  value,
  label,
  color,
  highlight,
}: {
  value: number;
  label: string;
  color: string;
  highlight?: boolean;
}) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(value, 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span
          className={cn(
            'text-[11px] font-mono tabular-nums font-semibold',
            highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
          )}
        >
          {safeValue.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

export function TokenAnalytics() {
  const t = useTranslations('Analytics');
  const { data, isLoading } = useMarketAnalytics();
  const market = data?.market;
  const holders = data?.holders;

  return (
    <div className="space-y-4">
      {/* Market Data Strip */}
      <div className="rounded-2xl bg-gradient-to-r from-organic-terracotta/5 via-transparent to-organic-terracotta/5 border border-organic-terracotta/10">
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 divide-x divide-organic-terracotta/10">
          {/* Price */}
          <div className="px-4 py-3.5">
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="mt-1.5 h-3 w-14" />
              </>
            ) : market ? (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                    {formatUsd(market.price)}
                  </p>
                  <DeltaBadge value={market.priceChange24h} size="md" />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {t('market.price', { symbol: TOKEN_CONFIG.symbol })}
                  </span>
                  <DeltaBadge value={market.priceChange1h} />
                  <span className="text-[10px] text-muted-foreground">1h</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('kpiComingSoon')}</p>
            )}
          </div>

          {/* Market Cap */}
          <div className="px-4 py-3.5">
            {isLoading ? (
              <><Skeleton className="h-6 w-16" /><Skeleton className="mt-1.5 h-3 w-14" /></>
            ) : market?.marketCap ? (
              <>
                <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {formatUsd(market.marketCap)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {t('market.marketCap')}
                </p>
              </>
            ) : (
              <><p className="text-sm text-muted-foreground">{t('kpiComingSoon')}</p><p className="mt-1 text-[11px] text-muted-foreground">{t('market.marketCap')}</p></>
            )}
          </div>

          {/* 24h Volume */}
          <div className="px-4 py-3.5">
            {isLoading ? (
              <><Skeleton className="h-6 w-16" /><Skeleton className="mt-1.5 h-3 w-14" /></>
            ) : market ? (
              <>
                <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {formatUsd(market.volume24h)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {t('market.volume24h')}
                </p>
              </>
            ) : null}
          </div>

          {/* 1h Volume */}
          <div className="px-4 py-3.5">
            {isLoading ? (
              <><Skeleton className="h-6 w-16" /><Skeleton className="mt-1.5 h-3 w-14" /></>
            ) : market ? (
              <>
                <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {formatUsd(market.volume1h)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {t('market.volume1h')}
                </p>
              </>
            ) : null}
          </div>

          {/* Liquidity */}
          <div className="px-4 py-3.5">
            {isLoading ? (
              <><Skeleton className="h-6 w-16" /><Skeleton className="mt-1.5 h-3 w-14" /></>
            ) : market ? (
              <>
                <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {formatUsd(market.liquidity)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                  <Droplets className="h-3 w-3" />
                  {t('market.liquidity')}
                </p>
              </>
            ) : null}
          </div>

          {/* On-chain Holders */}
          <div className="px-4 py-3.5">
            {isLoading ? (
              <><Skeleton className="h-6 w-16" /><Skeleton className="mt-1.5 h-3 w-14" /></>
            ) : holders ? (
              <>
                <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {holders.totalHolders.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {t('market.onChainHolders')}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Transactions strip */}
      {market && !isLoading && (
        <div className="flex flex-wrap items-center gap-3 px-1">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
            {t('market.transactions')}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              {market.txns24h.buys} {t('market.buys')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-mono text-red-500 dark:text-red-400">
              <TrendingDown className="h-3 w-3" />
              {market.txns24h.sells} {t('market.sells')}
            </span>
            <span className="text-[10px] text-muted-foreground">24h</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              {market.txns1h.buys}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-mono text-red-500 dark:text-red-400">
              <TrendingDown className="h-3 w-3" />
              {market.txns1h.sells}
            </span>
            <span className="text-[10px] text-muted-foreground">1h</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <span className="text-[10px] text-muted-foreground">
            {t('market.via')} {market.dex}
          </span>
        </div>
      )}

      {/* Distribution summary — deterministic narrative from existing metrics. */}
      {holders && !isLoading && (
        <div className="rounded-xl border border-border bg-card/60 px-4 py-3">
          <div className="flex items-start gap-2">
            <Shield
              className={cn(
                'h-4 w-4 mt-0.5 shrink-0',
                holders.whaleCount <= 5 ? 'text-emerald-500' : 'text-amber-500'
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-foreground">
                {t('holders.summary.title')}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t(
                  holders.whaleCount <= 5
                    ? 'holders.summary.healthy'
                    : 'holders.summary.watch',
                  {
                    top10: holders.top10Concentration.toFixed(1),
                    whaleCount: holders.whaleCount,
                    totalHolders: holders.totalHolders.toLocaleString(),
                  }
                )}
              </p>
              {market?.fetchedAt && (
                <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono tabular-nums">
                  {t('holders.summary.updatedAt', {
                    time: new Date(market.fetchedAt).toLocaleTimeString(),
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Holder Distribution */}
      {holders && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Concentration Analysis */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="h-4 w-4 text-organic-terracotta" />
              <h3 className="text-sm font-semibold text-foreground">{t('holders.concentration')}</h3>
            </div>

            <div className="space-y-3">
              <ConcentrationBar
                label={t('holders.top10')}
                value={holders.top10Concentration}
                color="bg-organic-terracotta"
                highlight={holders.top10Concentration < 50}
              />
              <ConcentrationBar
                label={t('holders.top50')}
                value={holders.top50Concentration}
                color="bg-blue-500"
                highlight={holders.top50Concentration < 80}
              />
              <ConcentrationBar
                label={t('holders.whales', { threshold: '1%' })}
                value={holders.whaleConcentration}
                color="bg-purple-500"
                highlight={holders.whaleCount <= 3}
              />
            </div>

            {/* Highlight callout */}
            {holders.whaleCount <= 5 && (
              <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      {t('holders.healthyDistribution')}
                    </p>
                    <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                      {t('holders.healthyDesc', {
                        whaleCount: holders.whaleCount,
                        top10: holders.top10Concentration.toFixed(1),
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Distribution Tiers */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-foreground">{t('holders.distribution')}</h3>
            </div>

            <div className="space-y-2">
              {holders.tiers.map((tier) => (
                <div key={tier.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-semibold text-foreground w-20">
                      {tier.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {tier.count} {t('holders.wallets')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                      {tier.percentage.toFixed(1)}%
                    </span>
                    <span className="text-[11px] font-mono tabular-nums font-semibold text-foreground w-16 text-right">
                      {tier.supplyPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-border">
              <span className="text-[10px] text-muted-foreground">
                {t('holders.median')}: {formatCompact(holders.medianBalance)} {TOKEN_CONFIG.symbol}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {t('holders.average')}: {formatCompact(holders.averageBalance)} {TOKEN_CONFIG.symbol}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
