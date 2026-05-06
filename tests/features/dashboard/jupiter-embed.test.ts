import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  JUPITER_REFERRAL_FEE_BPS,
  resolveReferralAccount,
  shouldRenderSwapEmbed,
} from '../../../src/features/dashboard/jupiter-config';

describe('JupiterSwapEmbed module', () => {
  // We can't dynamic-import the .tsx file from this vitest config (no JSX
  // transform), so verify the export surface by reading the source. The TS
  // type-check pipeline catches actual binding correctness.
  const source = readFileSync(
    resolve(__dirname, '../../../src/components/dashboard/jupiter-swap-embed.tsx'),
    'utf8'
  );

  it('declares a named JupiterSwapEmbed export', () => {
    expect(source).toMatch(/export\s+function\s+JupiterSwapEmbed\s*\(/);
  });

  it('passes referralAccount and referralFee to formProps', () => {
    expect(source).toMatch(/referralFee:\s*JUPITER_REFERRAL_FEE_BPS/);
    expect(source).toMatch(/referralAccount/);
  });

  it('enables wallet passthrough', () => {
    expect(source).toMatch(/enableWalletPassthrough:\s*true/);
  });

  it('uses ExactIn swap mode', () => {
    expect(source).toMatch(/swapMode:\s*'ExactIn'/);
  });

  it('loads the plugin from the Jupiter CDN, not the npm package', () => {
    expect(source).toMatch(/https:\/\/plugin\.jup\.ag\/plugin-v1\.js/);
    expect(source).not.toMatch(/from\s+['"]@jup-ag\/plugin['"]/);
    expect(source).not.toMatch(/import\(['"]@jup-ag\/plugin['"]\)/);
  });

  it('uses Next.js Script with lazyOnload so the per-request CSP nonce is applied', () => {
    expect(source).toMatch(/from\s+['"]next\/script['"]/);
    expect(source).toMatch(/strategy="lazyOnload"/);
  });
});

describe('resolveReferralAccount', () => {
  const TREASURY = 'CuBV7VVq3zSrh1wf5SZCp36JqpFRCGJHvV7he6K8SDJ1';
  const ENV_ACCOUNT = 'EnvReferralAccountPubkeyXXXXXXXXXXXXXXXXXXX';

  it('prefers the env var when both env and treasury are set', () => {
    expect(resolveReferralAccount(ENV_ACCOUNT, TREASURY)).toBe(ENV_ACCOUNT);
  });

  it('falls back to treasury when env is undefined', () => {
    expect(resolveReferralAccount(undefined, TREASURY)).toBe(TREASURY);
  });

  it('falls back to treasury when env is an empty string', () => {
    expect(resolveReferralAccount('', TREASURY)).toBe(TREASURY);
  });

  it('falls back to treasury when env is whitespace only', () => {
    expect(resolveReferralAccount('   ', TREASURY)).toBe(TREASURY);
  });

  it('returns null when both env and treasury are unset', () => {
    expect(resolveReferralAccount(undefined, undefined)).toBeNull();
    expect(resolveReferralAccount('', '')).toBeNull();
  });

  it('trims whitespace from a valid env value', () => {
    expect(resolveReferralAccount(`  ${ENV_ACCOUNT}  `, TREASURY)).toBe(ENV_ACCOUNT);
  });
});

describe('JUPITER_REFERRAL_FEE_BPS', () => {
  it('is exactly 50 basis points (0.50%)', () => {
    expect(JUPITER_REFERRAL_FEE_BPS).toBe(50);
  });

  it('is a finite non-negative integer', () => {
    expect(Number.isInteger(JUPITER_REFERRAL_FEE_BPS)).toBe(true);
    expect(JUPITER_REFERRAL_FEE_BPS).toBeGreaterThanOrEqual(0);
  });
});

describe('shouldRenderSwapEmbed', () => {
  it('returns false for null', () => {
    expect(shouldRenderSwapEmbed(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(shouldRenderSwapEmbed(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(shouldRenderSwapEmbed('')).toBe(false);
  });

  it('returns false for whitespace only', () => {
    expect(shouldRenderSwapEmbed('   ')).toBe(false);
  });

  it('returns true for a non-empty mint', () => {
    expect(shouldRenderSwapEmbed('CuBV7VVq3zSrh1wf5SZCp36JqpFRCGJHvV7he6K8SDJ1')).toBe(true);
  });
});
