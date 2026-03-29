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
