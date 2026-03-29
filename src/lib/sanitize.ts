/**
 * HTML sanitization utilities for XSS prevention.
 * Uses regex-based tag stripping (safe for server-side use).
 * For client-side rich HTML rendering, install DOMPurify.
 */

/** Strip HTML tags, keeping only text content */
function stripTags(html: string, allowedTags: string[] = []): string {
  if (allowedTags.length === 0) {
    // Strip all tags
    return html.replace(/<[^>]*>/g, '');
  }
  // Strip tags not in allowlist
  const allowedPattern = allowedTags.map((t) => t.toLowerCase()).join('|');
  const regex = new RegExp(`<(?!\\/?(?:${allowedPattern})\\b)[^>]*>`, 'gi');
  return regex[Symbol.replace](html, '');
}

/** Decode common HTML entities */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

/**
 * Sanitize user-generated HTML content to prevent XSS.
 * Strips all HTML tags by default (text-only output).
 * Use allowedTags option for controlled HTML rendering.
 */
export function sanitizeHtml(
  dirty: string,
  options?: { allowedTags?: string[] }
): string {
  if (!dirty) return '';
  const stripped = stripTags(dirty, options?.allowedTags);
  // Remove event handlers from any allowed tags
  return stripped.replace(/\s+on\w+\s*=\s*(['"])[^'"]*\1/gi, '');
}

/**
 * Sanitize scraped tweet content to prevent stored XSS.
 * Strips all HTML and control characters.
 */
export function sanitizeTweetContent(raw: string): string {
  if (!raw) return '';
  return stripTags(raw)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim()
    .substring(0, 10000);
}
