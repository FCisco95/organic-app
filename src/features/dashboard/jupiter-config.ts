/**
 * Pure helpers for the Jupiter swap embed.
 *
 * Kept separate from the React component so they can be unit-tested without
 * pulling in `@jup-ag/plugin` (which references `window`/DOM APIs and is
 * loaded only on the client).
 */

/**
 * Referral fee in basis points charged on every swap routed through the
 * embed. 50 bps = 0.50%. This is the contracted rate for the Organic
 * tenant's referral program on Jupiter Developer Platform.
 *
 * Hard deadline 2026-06-30 to bill on Jupiter — do not change without
 * coordinating with treasury.
 */
export const JUPITER_REFERRAL_FEE_BPS = 50;

/**
 * Resolve the referral account that should receive Jupiter's referral
 * rebates.
 *
 * Precedence:
 *   1. `envValue` — typically `NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT` (per-deploy override).
 *   2. `treasuryWallet` — typically `TOKEN_CONFIG.treasuryWallet`, the
 *      DAO-controlled treasury used as a sane default so referral fees always
 *      have a destination.
 *   3. `null` when neither is configured (caller should not initialize the
 *      embed in this case to avoid silently leaking fees).
 *
 * Both arguments are explicit (no defaults) so `(undefined, undefined)`
 * unambiguously resolves to `null` — important for tests and for ensuring the
 * caller knows to fall back to a hardcoded treasury wallet.
 */
export function resolveReferralAccount(
  envValue: string | undefined,
  treasuryWallet: string | undefined
): string | null {
  const envTrimmed = envValue?.trim();
  if (envTrimmed && envTrimmed.length > 0) return envTrimmed;
  const treasuryTrimmed = treasuryWallet?.trim();
  if (treasuryTrimmed && treasuryTrimmed.length > 0) return treasuryTrimmed;
  return null;
}

/**
 * Gate that decides whether the swap embed should render. Mirrors the
 * existing `<TokenTile />` guard so both surfaces hide together when the
 * tenant has not configured an org token mint yet.
 */
export function shouldRenderSwapEmbed(mint: string | null | undefined): boolean {
  if (!mint) return false;
  return mint.trim().length > 0;
}
