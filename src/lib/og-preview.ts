export interface OgMetadata {
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
}

const OG_FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 100_000;

// SSRF guard: only allow OG fetches against the social platforms users are
// expected to paste links from. Any new domain must be added intentionally.
const ALLOWED_OG_HOSTS: ReadonlyArray<string> = [
  'twitter.com',
  'x.com',
  't.co',
];

function isPrivateOrLoopbackHost(hostname: string): boolean {
  // Strip IPv6 brackets if present.
  const host = hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
  // IPv4 private / loopback / link-local / CGNAT-ish ranges.
  const ipv4Patterns: RegExp[] = [
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^169\.254\./,
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // 100.64/10 CGNAT
    /^0\./,
    /^100\.100\.100\.200$/, // Alibaba metadata
  ];
  if (ipv4Patterns.some((re) => re.test(host))) return true;
  // IPv6 loopback / unique-local / link-local.
  if (host === '::1') return true;
  if (/^fc[0-9a-f]{0,2}:/.test(host)) return true;
  if (/^fd[0-9a-f]{0,2}:/.test(host)) return true;
  if (/^fe[89ab][0-9a-f]?:/.test(host)) return true;
  // localhost
  if (host === 'localhost') return true;
  return false;
}

export function isSafeOgUrl(raw: string): boolean {
  if (typeof raw !== 'string' || raw.length === 0) return false;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) return false;
  if (isPrivateOrLoopbackHost(hostname)) return false;
  return ALLOWED_OG_HOSTS.some(
    (h) => hostname === h || hostname.endsWith(`.${h}`),
  );
}

export async function fetchOgMetadata(url: string): Promise<OgMetadata> {
  const empty: OgMetadata = { og_title: null, og_description: null, og_image_url: null };

  if (!isSafeOgUrl(url)) return empty;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OG_FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OrganicBot/1.0 (Open Graph Preview)',
        Accept: 'text/html',
      },
      // Disable redirect-following: an allowlisted twitter.com URL could
      // otherwise 30x to an internal IP, defeating the host check.
      redirect: 'manual',
    });

    clearTimeout(timeout);

    if (!response.ok || !response.body) return empty;

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (totalBytes < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      totalBytes += value.byteLength;
    }

    reader.cancel().catch(() => {});

    const html = new TextDecoder().decode(
      chunks.length === 1 ? chunks[0] : concatUint8Arrays(chunks, totalBytes),
    );

    return parseOgTags(html);
  } catch {
    return empty;
  }
}

function concatUint8Arrays(arrays: Uint8Array[], totalLength: number): Uint8Array {
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.byteLength;
  }
  return result;
}

function parseOgTags(html: string): OgMetadata {
  const result: OgMetadata = { og_title: null, og_description: null, og_image_url: null };

  const metaRegex =
    /<meta\s+[^>]*?(?:property|name)\s*=\s*["']og:([^"']+)["'][^>]*?content\s*=\s*["']([^"']*)["'][^>]*?\/?>/gi;
  const metaRegexReverse =
    /<meta\s+[^>]*?content\s*=\s*["']([^"']*)["'][^>]*?(?:property|name)\s*=\s*["']og:([^"']+)["'][^>]*?\/?>/gi;

  function processMatch(property: string, content: string) {
    const value = decodeHtmlEntities(content.trim());
    if (!value) return;

    switch (property) {
      case 'title':
        if (!result.og_title) result.og_title = value.slice(0, 500);
        break;
      case 'description':
        if (!result.og_description) result.og_description = value.slice(0, 1000);
        break;
      case 'image':
        if (!result.og_image_url) result.og_image_url = value.slice(0, 2000);
        break;
    }
  }

  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    processMatch(match[1], match[2]);
  }
  while ((match = metaRegexReverse.exec(html)) !== null) {
    processMatch(match[2], match[1]);
  }

  if (!result.og_title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      result.og_title = decodeHtmlEntities(titleMatch[1].trim()).slice(0, 500);
    }
  }

  return result;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}
