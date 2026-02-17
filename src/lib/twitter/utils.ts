const TWITTER_HOSTS = new Set(['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com']);

export function extractTweetIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!TWITTER_HOSTS.has(parsed.hostname)) {
      return null;
    }

    const match = parsed.pathname.match(/\/status\/(\d{5,25})/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function normalizeTwitterUsername(username: string): string {
  return username.trim().replace(/^@+/, '').toLowerCase();
}

export function withAtPrefix(username: string): string {
  const normalized = normalizeTwitterUsername(username);
  return normalized ? `@${normalized}` : '';
}
