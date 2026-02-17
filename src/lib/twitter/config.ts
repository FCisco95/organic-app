type ResolveTwitterRedirectUriOptions = {
  override?: string;
  fallbackOrigin?: string;
};

type ResolveAppOriginOptions = {
  fallbackOrigin?: string;
};

function normalizeNonEmpty(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function assertValidUrl(value: string, label: string): string {
  try {
    return new URL(value).toString();
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
}

function normalizeOrigin(value: string, label: string): string {
  return new URL(assertValidUrl(value, label)).origin;
}

export function resolveAppOrigin(options: ResolveAppOriginOptions = {}): string {
  const appUrl = normalizeNonEmpty(process.env.NEXT_PUBLIC_APP_URL);
  if (appUrl) {
    return normalizeOrigin(appUrl, 'NEXT_PUBLIC_APP_URL');
  }

  const fallbackOrigin = normalizeNonEmpty(options.fallbackOrigin);
  if (fallbackOrigin) {
    return normalizeOrigin(fallbackOrigin, 'App origin fallback');
  }

  throw new Error('App origin is not configured. Set NEXT_PUBLIC_APP_URL.');
}

export function resolveTwitterRedirectUri(
  options: ResolveTwitterRedirectUriOptions = {}
): string {
  const override = normalizeNonEmpty(options.override);
  if (override) {
    return assertValidUrl(override, 'Twitter redirect URI override');
  }

  const redirectUri = normalizeNonEmpty(process.env.TWITTER_REDIRECT_URI);
  if (redirectUri) {
    return assertValidUrl(redirectUri, 'TWITTER_REDIRECT_URI');
  }

  const callbackUrl = normalizeNonEmpty(process.env.TWITTER_CALLBACK_URL);
  if (callbackUrl) {
    return assertValidUrl(callbackUrl, 'TWITTER_CALLBACK_URL');
  }

  try {
    const appOrigin = resolveAppOrigin({ fallbackOrigin: options.fallbackOrigin });
    return assertValidUrl(
      new URL('/api/twitter/link/callback', appOrigin).toString(),
      'Twitter redirect URI fallback'
    );
  } catch {
    // Fall through to explicit configuration error below.
  }

  throw new Error(
    'Twitter redirect URI is not configured. Set TWITTER_REDIRECT_URI, TWITTER_CALLBACK_URL, or NEXT_PUBLIC_APP_URL.'
  );
}
