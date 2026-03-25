'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TOKEN_CONFIG } from '@/config/token';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

type ChartProvider = 'dexscreener' | 'geckoterminal';

const PROVIDERS: { key: ChartProvider; label: string; buildSrc: (mint: string) => string }[] = [
  {
    key: 'dexscreener',
    label: 'DexScreener',
    buildSrc: (mint) =>
      `https://dexscreener.com/solana/${mint}?embed=1&theme=dark&trades=0&info=0`,
  },
  {
    key: 'geckoterminal',
    label: 'GeckoTerminal',
    buildSrc: (mint) =>
      `https://www.geckoterminal.com/solana/tokens/${mint}?embed=1&info=0&swaps=0&light_chart=0&resolution=1d`,
  },
];

export function TokenChart() {
  const t = useTranslations('Analytics');
  const [provider, setProvider] = useState<ChartProvider>('dexscreener');
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const mint = TOKEN_CONFIG.mint;

  if (!mint) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">{t('chartUnavailableTitle')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('chartUnavailableDesc')}</p>
      </div>
    );
  }

  const activeProvider = PROVIDERS.find((p) => p.key === provider)!;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header with provider tabs */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-foreground">{t('chartTitle')}</h3>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.key}
              onClick={() => setProvider(p.key)}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                provider === p.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart iframe — all 3 stay in DOM to avoid reloads on switch */}
      <div className="relative w-full" style={{ paddingBottom: 'clamp(400px, 50%, 600px)' }}>
        {PROVIDERS.map((p) => (
          <div
            key={p.key}
            className={cn(
              'absolute inset-0',
              provider === p.key ? 'block' : 'hidden'
            )}
          >
            {/* Loading skeleton */}
            {!loaded[p.key] && provider === p.key && (
              <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-orange-500" />
                  <p className="text-xs text-muted-foreground">{t('chartLoading')}</p>
                </div>
              </div>
            )}
            <iframe
              src={p.buildSrc(mint)}
              className="absolute inset-0 w-full h-full border-0"
              loading={p.key === 'dexscreener' ? 'eager' : 'lazy'}
              onLoad={() => setLoaded((prev) => ({ ...prev, [p.key]: true }))}
              allow="clipboard-write"
              title={`${p.label} ${TOKEN_CONFIG.symbol} chart`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
