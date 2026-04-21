import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

// Regression suite for the Pulse analytics bugs.
//
// Original symptoms:
//   1. Top-10 concentration bar rendered empty because the class
//      `bg-organic-terracotta-lightest0` is a typo — that token does not
//      exist in tailwind.config.ts, so the fill was styled with no color.
//   2. The distribution card had no always-on narrative summary, which
//      made users perceive the page as broken when the gated callout
//      (whaleCount <= 5) didn't apply.
//   3. The API route had no observability — when market cap looked stale
//      or wrong, there was no way to tell which DexScreener pair was
//      picked or how fresh the data was.
//
// These tests lock in the shape of the fix: correct Tailwind tokens,
// an always-rendered summary block, NaN-safe bar width, and structured
// logs in the analytics route.

const tokenAnalytics = readFileSync(
  'src/components/analytics/token-analytics.tsx',
  'utf-8'
);
const marketRoute = readFileSync(
  'src/app/api/analytics/market/route.ts',
  'utf-8'
);
const dexScreener = readFileSync(
  'src/features/market-data/server/dexscreener.ts',
  'utf-8'
);
const tailwindConfig = readFileSync('tailwind.config.ts', 'utf-8');
const enMessages = JSON.parse(
  readFileSync('messages/en.json', 'utf-8')
) as Record<string, unknown>;
const zhMessages = JSON.parse(
  readFileSync('messages/zh-CN.json', 'utf-8')
) as Record<string, unknown>;
const ptMessages = JSON.parse(
  readFileSync('messages/pt-PT.json', 'utf-8')
) as Record<string, unknown>;

describe('Pulse analytics: concentration bar rendering', () => {
  it('top-10 bar uses a real Tailwind terracotta token, not the lightest0 typo', () => {
    const top10Block = tokenAnalytics.slice(
      tokenAnalytics.indexOf("label={t('holders.top10')}"),
      tokenAnalytics.indexOf("label={t('holders.top50')}")
    );
    expect(top10Block).toMatch(/color="bg-organic-terracotta"/);
    expect(top10Block).not.toMatch(/lightest0/);
  });

  it('tailwind config does not define the lightest0 variant (explains the original bug)', () => {
    expect(tailwindConfig).not.toMatch(/lightest0/);
    // Sanity: the real terracotta palette is still there.
    expect(tailwindConfig).toMatch(/terracotta:\s*\{[\s\S]{0,300}lightest:/);
  });

  it('ConcentrationBar coerces non-finite values to 0 so missing data cannot produce NaN widths', () => {
    const barFn = tokenAnalytics.slice(
      tokenAnalytics.indexOf('function ConcentrationBar'),
      tokenAnalytics.indexOf('export function TokenAnalytics')
    );
    // The bar must sanitize its input instead of trusting the raw value.
    expect(barFn).toMatch(/Number\.isFinite\(value\)/);
    expect(barFn).toMatch(/Math\.max\(0,\s*Math\.min\(value,\s*100\)\)/);
    // The rendered width must use the sanitized variable, not the raw value.
    expect(barFn).toMatch(/width:\s*`\$\{safeValue\}%`/);
  });
});

describe('Pulse analytics: deterministic distribution summary', () => {
  it('summary block renders whenever holders data is present, not only when whales <= 5', () => {
    // Grab the slice covering both the old gated callout and the new always-on block.
    const holderSection = tokenAnalytics.slice(
      tokenAnalytics.indexOf('{/* Distribution summary'),
      tokenAnalytics.indexOf('{/* Distribution Tiers */}')
    );

    // Always-on summary: guarded only by `holders && !isLoading`, not by whaleCount.
    expect(holderSection).toMatch(
      /\{holders && !isLoading && \([\s\S]*?holders\.summary\.title/
    );
    // The healthy vs watch branch chooses the message based on the whale count,
    // but both branches must be rendered, so neither copy key is conditionally absent.
    expect(holderSection).toMatch(/holders\.summary\.healthy/);
    expect(holderSection).toMatch(/holders\.summary\.watch/);
  });

  it('summary surfaces the DexScreener fetchedAt timestamp so users can reason about staleness', () => {
    const holderSection = tokenAnalytics.slice(
      tokenAnalytics.indexOf('{/* Distribution summary'),
      tokenAnalytics.indexOf('{/* Distribution Tiers */}')
    );
    expect(holderSection).toMatch(/market\?\.fetchedAt/);
    expect(holderSection).toMatch(/holders\.summary\.updatedAt/);
  });

  it('en, zh, and pt translations all contain the new summary keys (no untranslated locales)', () => {
    const expected = ['title', 'healthy', 'watch', 'updatedAt'];
    for (const [label, bundle] of [
      ['en', enMessages],
      ['zh', zhMessages],
      ['pt', ptMessages],
    ] as const) {
      const analytics = bundle.Analytics as Record<string, unknown> | undefined;
      const holders = analytics?.holders as Record<string, unknown> | undefined;
      const summary = holders?.summary as Record<string, unknown> | undefined;
      expect(summary, `${label} holders.summary must exist`).toBeDefined();
      for (const key of expected) {
        expect(
          summary?.[key],
          `${label} holders.summary.${key} must be a non-empty string`
        ).toBeTypeOf('string');
        expect((summary?.[key] as string).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Pulse analytics: pair selection + observability', () => {
  it('dexscreener still picks the highest-liquidity pair (matches the DexScreener UI default)', () => {
    // Do not silently switch to another heuristic — users verify against the
    // same pair DexScreener shows by default, so changing this is a visible
    // regression.
    expect(dexScreener).toMatch(/pairs\.reduce/);
    expect(dexScreener).toMatch(/bLiq > aLiq \? b : a/);
  });

  it('dexscreener logs the selected pair for observability', () => {
    expect(dexScreener).toMatch(/logger\.info\('DexScreener pair selected'/);
    expect(dexScreener).toMatch(/pairAddress:\s*best\.pairAddress/);
    expect(dexScreener).toMatch(/liquidityUsd:/);
  });

  it('market route emits a structured log with pair, marketCap, fdv, and holders latency', () => {
    expect(marketRoute).toMatch(/logger\.info\('Market analytics GET'/);
    expect(marketRoute).toMatch(/durationMs:\s*Date\.now\(\) - startedAt/);
    expect(marketRoute).toMatch(/pairAddress:\s*market\?\.pairAddress/);
    expect(marketRoute).toMatch(/marketCap:\s*market\?\.marketCap/);
    expect(marketRoute).toMatch(/fdv:\s*market\?\.fdv/);
    expect(marketRoute).toMatch(/totalHolders:\s*holders\?\.totalHolders/);
  });

  it('market route keeps the 120s cache TTL (changing this risks DexScreener rate limits)', () => {
    expect(marketRoute).toMatch(/s-maxage=120/);
    expect(marketRoute).toMatch(/stale-while-revalidate=300/);
  });
});
