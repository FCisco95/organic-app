export interface OgMetadata {
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
}

const OG_FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 100_000;

export async function fetchOgMetadata(url: string): Promise<OgMetadata> {
  const empty: OgMetadata = { og_title: null, og_description: null, og_image_url: null };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OG_FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OrganicBot/1.0 (Open Graph Preview)',
        Accept: 'text/html',
      },
      redirect: 'follow',
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
