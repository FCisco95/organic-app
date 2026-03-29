import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeTweetContent } from '../../src/lib/sanitize';

describe('HTML Sanitization', () => {
  it('strips all HTML tags by default', () => {
    // Tags are removed, text content is preserved (safe — no execution context)
    expect(sanitizeHtml('<script>alert(1)</script>Hello')).not.toContain('<script>');
    expect(sanitizeHtml('<img src=x onerror=alert(1)>text')).not.toContain('<img');
    expect(sanitizeHtml('<b>bold</b>')).toBe('bold');
    expect(sanitizeHtml('plain text')).toBe('plain text');
  });

  it('allows specified tags when configured', () => {
    const result = sanitizeHtml('<b>bold</b> <script>bad</script>', { allowedTags: ['b'] });
    expect(result).toContain('<b>bold</b>');
    expect(result).not.toContain('<script>');
  });

  it('strips event handlers from allowed tags', () => {
    const result = sanitizeHtml('<a href="ok" onclick="alert(1)">link</a>', { allowedTags: ['a'] });
    expect(result).not.toContain('onclick');
  });

  it('sanitizes tweet content', () => {
    expect(sanitizeTweetContent('<script>xss</script>tweet text')).not.toContain('<script>');
    expect(sanitizeTweetContent('normal tweet')).toBe('normal tweet');
  });

  it('strips control characters from tweets', () => {
    expect(sanitizeTweetContent('hello\x00\x01world')).toBe('helloworld');
  });

  it('truncates long content to 10000 chars', () => {
    const long = 'a'.repeat(20000);
    expect(sanitizeTweetContent(long).length).toBe(10000);
  });
});
