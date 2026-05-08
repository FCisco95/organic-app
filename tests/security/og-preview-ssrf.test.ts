import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchOgMetadata, isSafeOgUrl } from '../../src/lib/og-preview';

/**
 * CRIT-2 regression test (Security audit 2026-05-08).
 *
 * fetchOgMetadata previously accepted any URL and called fetch() directly,
 * exposing the server to SSRF: AWS IMDS (169.254.169.254), localhost, and
 * arbitrary internal hosts could be probed by submitting a post with a
 * twitter_url pointing to them.
 *
 * The fix is a strict allowlist (twitter.com, x.com, etc.) plus a
 * private-IP / loopback / link-local block. fetchOgMetadata MUST return
 * an empty metadata object — without ever calling fetch — when the URL
 * fails validation.
 */

describe('isSafeOgUrl - SSRF protection (CRIT-2)', () => {
  describe('rejects dangerous URLs', () => {
    it.each([
      ['http://169.254.169.254/latest/meta-data/', 'AWS IMDS'],
      ['http://169.254.169.254/computeMetadata/v1/', 'GCP metadata'],
      ['http://100.100.100.200/latest/meta-data/', 'Alibaba metadata'],
      ['http://127.0.0.1/admin', 'IPv4 loopback'],
      ['http://localhost:6379/', 'localhost Redis'],
      ['http://10.0.0.5/internal', 'RFC1918 10/8'],
      ['http://172.16.0.5/internal', 'RFC1918 172.16/12'],
      ['http://172.31.255.1/internal', 'RFC1918 172.16/12 upper'],
      ['http://192.168.1.1/router', 'RFC1918 192.168/16'],
      ['http://[::1]/admin', 'IPv6 loopback'],
      ['http://[fc00::1]/internal', 'IPv6 ULA'],
      ['http://[fd00::1]/internal', 'IPv6 ULA fd'],
      ['file:///etc/passwd', 'file scheme'],
      ['gopher://attacker.com/_GET / HTTP/1.0', 'gopher scheme'],
      ['ftp://attacker.com/', 'ftp scheme'],
      ['javascript:alert(1)', 'javascript scheme'],
      ['data:text/html,<script>1</script>', 'data scheme'],
      ['', 'empty string'],
      ['not-a-url', 'malformed'],
      ['http://attacker.com/', 'arbitrary external host not on allowlist'],
      ['http://twitter.com.attacker.com/', 'subdomain confusion'],
      ['http://twittercom/', 'no dot'],
    ])('rejects %s (%s)', (url) => {
      expect(isSafeOgUrl(url)).toBe(false);
    });
  });

  describe('accepts allowlisted URLs', () => {
    it.each([
      'https://twitter.com/elonmusk/status/123',
      'https://x.com/elonmusk/status/123',
      'https://www.twitter.com/somebody',
      'https://mobile.twitter.com/somebody',
      'http://twitter.com/somebody', // http accepted; fetchOgMetadata may upgrade in future
    ])('accepts %s', (url) => {
      expect(isSafeOgUrl(url)).toBe(true);
    });
  });
});

describe('fetchOgMetadata - never calls fetch for unsafe URL (CRIT-2)', () => {
  const originalFetch = global.fetch;
  const fetchSpy = vi.fn();

  beforeEach(() => {
    fetchSpy.mockReset();
    global.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns empty metadata and does NOT call fetch for AWS IMDS URL', async () => {
    const result = await fetchOgMetadata('http://169.254.169.254/latest/meta-data/');
    expect(result).toEqual({ og_title: null, og_description: null, og_image_url: null });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns empty metadata and does NOT call fetch for localhost', async () => {
    const result = await fetchOgMetadata('http://localhost:8080/');
    expect(result).toEqual({ og_title: null, og_description: null, og_image_url: null });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns empty metadata and does NOT call fetch for non-http scheme', async () => {
    const result = await fetchOgMetadata('file:///etc/passwd');
    expect(result).toEqual({ og_title: null, og_description: null, og_image_url: null });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns empty metadata and does NOT call fetch for non-allowlisted host', async () => {
    const result = await fetchOgMetadata('http://attacker.example/og');
    expect(result).toEqual({ og_title: null, og_description: null, og_image_url: null });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
