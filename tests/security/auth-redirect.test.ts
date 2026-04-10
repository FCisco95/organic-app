import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { sanitizeReturnTo } from '../../src/lib/security';

describe('Auth Callback Open Redirect Prevention', () => {
  const callbackRoute = readFileSync(
    'src/app/[locale]/auth/callback/route.ts',
    'utf-8'
  );

  it('should import sanitizeReturnTo', () => {
    expect(callbackRoute).toContain("import { sanitizeReturnTo } from '@/lib/security'");
  });

  it('should use sanitizeReturnTo on the returnTo param', () => {
    expect(callbackRoute).toContain('sanitizeReturnTo(');
    // Should NOT have unsanitized direct usage
    expect(callbackRoute).not.toMatch(/const destination = returnTo \?\?/);
  });

  it('sanitizeReturnTo blocks protocol-relative redirects', () => {
    expect(sanitizeReturnTo('//evil.com')).toBe('/');
    expect(sanitizeReturnTo('//evil.com/steal')).toBe('/');
  });

  it('sanitizeReturnTo blocks absolute URL redirects', () => {
    expect(sanitizeReturnTo('https://evil.com')).toBe('/');
    expect(sanitizeReturnTo('http://evil.com/phish')).toBe('/');
  });

  it('sanitizeReturnTo blocks javascript: URIs', () => {
    expect(sanitizeReturnTo('javascript:alert(document.cookie)')).toBe('/');
  });

  it('sanitizeReturnTo allows valid relative paths', () => {
    expect(sanitizeReturnTo('/proposals')).toBe('/proposals');
    expect(sanitizeReturnTo('/tasks/123')).toBe('/tasks/123');
    expect(sanitizeReturnTo('/')).toBe('/');
  });
});
