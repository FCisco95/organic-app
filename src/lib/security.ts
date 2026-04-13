/**
 * Security utilities for frontend input sanitization.
 */

const BLOCKED_PROTOCOLS = /^(javascript|data|vbscript):/i;

/**
 * Sanitize an external URL for use in href attributes.
 * Blocks dangerous protocols (javascript:, data:, vbscript:).
 * Returns undefined for unsafe values so the link can be omitted.
 */
export function sanitizeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (BLOCKED_PROTOCOLS.test(trimmed)) return undefined;
  // Block protocol-relative URLs that could load arbitrary origins
  if (trimmed.startsWith('//') && !trimmed.startsWith('///')) {
    // Allow protocol-relative only if it looks like a real URL (has a dot)
    // But still risky — block it for safety
    return undefined;
  }
  return trimmed;
}

/**
 * Sanitize a returnTo / redirect path to prevent open-redirect attacks.
 * Only relative paths starting with '/' are allowed.
 */
/**
 * Escape a user-supplied string for safe interpolation inside PostgREST
 * filter expressions (.or(), .filter(), etc.).
 * Strips only the characters that can break out of a filter value:
 *   , — OR separator   ( ) — grouping operators
 * Dots, backslashes, and percent signs are safe inside ilike patterns.
 */
export function escapePostgrestValue(value: string): string {
  return value.replace(/[,()]/g, '');
}

export function sanitizeReturnTo(returnTo: string | null): string {
  if (!returnTo) return '/';
  if (
    returnTo.startsWith('//') ||
    returnTo.includes('://') ||
    BLOCKED_PROTOCOLS.test(returnTo)
  ) {
    return '/';
  }
  if (!returnTo.startsWith('/')) return '/';
  return returnTo;
}
