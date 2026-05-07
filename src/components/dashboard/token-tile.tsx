'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import { CopyAddressButton } from '@/components/ui/copy-address-button';
import { TrustStrip, type TrustItem } from '@/components/ui/trust-strip';
import type { TenantBranding } from '@/lib/tenant/types';
import type { TokenTrust } from '@/features/token/onchain';

interface TokenTileProps {
  branding: TenantBranding;
  /** Token mint address (Solana). When empty/null the entire tile is hidden. */
  mint: string;
  symbol: string;
  /**
   * Server-fetched on-chain trust signals: mint authority status, freeze
   * authority status, holder count. When `null` the trust strip is hidden.
   */
  tokenTrust?: TokenTrust | null;
}

function formatHolderCount(count: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(count);
}

function buildTrustItems(
  trust: TokenTrust,
  t: (key: string, values?: Record<string, string | number>) => string,
  locale: string
): TrustItem[] {
  const items: TrustItem[] = [
    {
      key: 'mint',
      label: trust.mintAuthorityRevoked ? t('trust.mintRevoked') : t('trust.mintActive'),
      variant: trust.mintAuthorityRevoked ? 'positive' : 'warning',
    },
    {
      key: 'freeze',
      label: trust.freezeAuthorityRevoked
        ? t('trust.freezeRevoked')
        : t('trust.freezeActive'),
      variant: trust.freezeAuthorityRevoked ? 'positive' : 'warning',
    },
  ];

  if (trust.holderCount !== null) {
    items.push({
      key: 'holders',
      label: t('trust.holders', { count: formatHolderCount(trust.holderCount, locale) }),
      variant: 'neutral',
    });
  }

  return items;
}

interface OutboundLink {
  key: string;
  label: string;
  href: string;
}

function buildOutboundLinks(mint: string): OutboundLink[] {
  return [
    {
      key: 'solscan',
      label: 'Solscan',
      href: `https://solscan.io/token/${mint}`,
    },
    {
      key: 'dexscreener',
      label: 'DexScreener',
      href: `https://dexscreener.com/solana/${mint}`,
    },
    {
      key: 'coingecko',
      label: 'CoinGecko',
      href: `https://www.coingecko.com/en/coins/solana/contract/${mint}`,
    },
    {
      key: 'jupiter',
      label: 'Jupiter',
      href: `https://jup.ag/swap/SOL-${mint}`,
    },
  ];
}

export function TokenTile({ branding, mint, symbol, tokenTrust }: TokenTileProps) {
  const t = useTranslations('Dashboard.tokenTile');
  const locale = useLocale();
  const accent = branding.accentPrimary;

  if (!mint || mint.length === 0) return null;

  const outbound = buildOutboundLinks(mint);
  const trustItems = tokenTrust ? buildTrustItems(tokenTrust, t, locale) : [];
  const tileStyle = {
    backgroundImage: `radial-gradient(80% 60% at 50% 0%, hsl(${accent} / 0.18), transparent 60%)`,
  } as const;

  return (
    <section
      data-testid="token-tile"
      aria-labelledby="dashboard-token-symbol"
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-7"
      style={tileStyle}
    >
      <div className="flex items-center gap-4">
        <div
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-border bg-background"
          style={{ boxShadow: `0 0 0 1px hsl(${accent} / 0.4), 0 0 24px hsl(${accent} / 0.25)` }}
        >
          <Image
            src={branding.logoUrl}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('label')}
          </p>
          <h2
            id="dashboard-token-symbol"
            className="font-mono text-2xl font-semibold leading-tight text-foreground"
          >
            {symbol}
          </h2>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('contractAddress')}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <CopyAddressButton address={mint} />
          <a
            href={`https://solscan.io/token/${mint}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('viewOnSolscanAria')}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-organic-terracotta motion-reduce:transition-none"
          >
            {t('viewOnSolscan')}
          </a>
        </div>
      </div>

      {trustItems.length > 0 && (
        <div className="mt-4">
          <TrustStrip items={trustItems} />
        </div>
      )}

      <div className="mt-auto pt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('officialLinks')}
        </p>
        <ul role="list" className="mt-2 flex flex-wrap gap-1.5">
          {outbound.map((link) => (
            <li key={link.key}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-2.5 py-1 text-xs text-foreground/80 transition-colors hover:border-organic-terracotta/40 hover:text-organic-terracotta motion-reduce:transition-none"
              >
                {link.label}
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-snug text-muted-foreground/80">
          {t('antiPhishing')}
        </p>
      </div>
    </section>
  );
}
