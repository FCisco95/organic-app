'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Script from 'next/script';
import { useTranslations } from 'next-intl';
import { useWallet, type WalletContextState } from '@solana/wallet-adapter-react';
import type { TenantBranding } from '@/lib/tenant/types';
import { TOKEN_CONFIG } from '@/config/token';
import {
  JUPITER_REFERRAL_FEE_BPS,
  resolveReferralAccount,
  shouldRenderSwapEmbed,
} from '@/features/dashboard/jupiter-config';

interface JupiterSwapEmbedProps {
  branding: TenantBranding;
  /** Org token mint address (Solana). When empty, the embed renders null. */
  mint: string;
  symbol: string;
}

interface JupiterFormProps {
  initialOutputMint: string;
  swapMode: 'ExactIn' | 'ExactOut';
  referralAccount?: string;
  referralFee: number;
}

interface JupiterInitConfig {
  displayMode: 'integrated' | 'modal' | 'widget';
  integratedTargetId: string;
  enableWalletPassthrough: boolean;
  passthroughWalletContextState: WalletContextState;
  formProps: JupiterFormProps;
  branding: { name: string; logoUri: string };
}

interface JupiterGlobal {
  init: (config: JupiterInitConfig) => Promise<void> | void;
  syncProps: (props: { passthroughWalletContextState: WalletContextState }) => void;
  close: () => void;
  resume?: () => void;
}

declare global {
  interface Window {
    Jupiter?: JupiterGlobal;
  }
}

/**
 * Jupiter Plugin URL on Jupiter's CDN. Loaded as a `<Script>` so Next.js
 * applies the per-request CSP nonce automatically (`strict-dynamic` then
 * trusts anything this script loads transitively).
 *
 * Using the CDN script avoids the `@jup-ag/plugin` npm package's stale
 * peer-dep range (`@solana/spl-token@^0.1.8`) which conflicts with the
 * project's `^0.4.0` and breaks `npm ci` in CI/Vercel.
 */
const JUPITER_PLUGIN_SRC = 'https://plugin.jup.ag/plugin-v1.js';

/**
 * Renders Jupiter's "integrated" plugin into a sized container, wired to the
 * app-level Solana wallet adapter via `enableWalletPassthrough`. The plugin
 * is loaded from Jupiter's CDN and exposes a `window.Jupiter` global.
 *
 * Visual treatment matches `IdentityTile` / `TokenTile`: rounded-2xl card
 * with the tenant brand glow.
 */
export function JupiterSwapEmbed({ branding, mint, symbol }: JupiterSwapEmbedProps) {
  const t = useTranslations('Dashboard.swap');
  const accent = branding.accentPrimary;
  const wallet: WalletContextState = useWallet();

  // Stable id for the Jupiter integrated target so two embeds on the same
  // page (unlikely, but cheap insurance) cannot collide.
  const reactId = useId();
  const targetId = `jupiter-swap-embed-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [pluginReady, setPluginReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const initStartedRef = useRef(false);

  const initPlugin = useCallback(async () => {
    if (initStartedRef.current) return;
    if (!shouldRenderSwapEmbed(mint)) return;
    if (typeof window === 'undefined' || !window.Jupiter) return;

    initStartedRef.current = true;
    const referralAccount = resolveReferralAccount(
      process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT,
      TOKEN_CONFIG.treasuryWallet
    );

    try {
      await window.Jupiter.init({
        displayMode: 'integrated',
        integratedTargetId: targetId,
        enableWalletPassthrough: true,
        passthroughWalletContextState: wallet,
        formProps: {
          initialOutputMint: mint,
          swapMode: 'ExactIn',
          ...(referralAccount ? { referralAccount } : {}),
          referralFee: JUPITER_REFERRAL_FEE_BPS,
        },
        branding: {
          name: branding.communityName,
          logoUri: branding.logoUrl,
        },
      });
      setPluginReady(true);
    } catch {
      setLoadError(true);
      initStartedRef.current = false;
    }
    // wallet is intentionally omitted — we forward wallet changes via
    // syncProps (next effect) instead of re-initializing the embed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mint, targetId, branding.communityName, branding.logoUrl]);

  // Initialize the plugin once the CDN script has loaded.
  useEffect(() => {
    if (!scriptLoaded) return;
    void initPlugin();

    return () => {
      const plugin = typeof window !== 'undefined' ? window.Jupiter : undefined;
      if (plugin && initStartedRef.current) {
        try {
          plugin.close();
        } catch {
          // Plugin already torn down — ignore.
        }
      }
    };
  }, [scriptLoaded, initPlugin]);

  // Forward wallet state changes (connect / disconnect / signing capability)
  // into the plugin without re-initializing it.
  useEffect(() => {
    if (!pluginReady) return;
    const plugin = typeof window !== 'undefined' ? window.Jupiter : undefined;
    if (!plugin) return;
    try {
      plugin.syncProps({ passthroughWalletContextState: wallet });
    } catch {
      // syncProps may throw if the plugin was torn down — safe to ignore.
    }
  }, [wallet, pluginReady]);

  if (!shouldRenderSwapEmbed(mint)) return null;

  const sectionStyle = {
    backgroundImage: `radial-gradient(80% 60% at 50% 0%, hsl(${accent} / 0.18), transparent 60%)`,
  } as const;

  return (
    <section
      data-testid="jupiter-swap-embed"
      aria-labelledby="dashboard-swap-heading"
      aria-describedby="dashboard-swap-description"
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-7"
      style={sectionStyle}
    >
      <Script
        src={JUPITER_PLUGIN_SRC}
        strategy="lazyOnload"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setLoadError(true)}
      />

      <header className="mb-5 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('eyebrow')}
        </p>
        <h2
          id="dashboard-swap-heading"
          className="font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl"
        >
          {t('heading', { symbol })}
        </h2>
        <p
          id="dashboard-swap-description"
          className="max-w-2xl text-sm text-muted-foreground"
        >
          {t('subheading', { symbol })}
        </p>
      </header>

      <div className="relative">
        <div
          id={targetId}
          data-testid="jupiter-swap-embed-target"
          className="min-h-[480px] w-full"
        />

        {!pluginReady && !loadError && (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-full w-full animate-pulse rounded-xl bg-muted/30" />
          </div>
        )}

        {loadError && (
          <div
            role="status"
            className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground"
          >
            {t('loadError')}
          </div>
        )}
      </div>

      <p className="mt-4 font-mono text-[11px] leading-snug text-muted-foreground/80">
        {t('referralDisclosure', { feeBps: JUPITER_REFERRAL_FEE_BPS })}
      </p>
    </section>
  );
}
