import { resolveTwitterRedirectUri } from '@/lib/twitter/config';

export interface TwitterTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
}

export interface TwitterUserInfo {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

export interface TwitterVerificationResult<T = unknown> {
  verified: boolean;
  data?: T;
}

type TwitterClientOptions = {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scope?: string[];
};

type TwitterApiEnvelope<T> = {
  data?: T;
  errors?: Array<{ detail?: string; message?: string; title?: string }>;
};

// ✅ Use X hosts (not api.twitter.com / twitter.com) per current docs
const AUTH_URL = 'https://x.com/i/oauth2/authorize';
const TOKEN_URL = 'https://api.x.com/2/oauth2/token';
const API_BASE_URL = 'https://api.x.com/2';

const DEFAULT_SCOPE = ['tweet.read', 'users.read', 'like.read', 'offline.access'];

function ensureString(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${name} is required`);
  return trimmed;
}

function getApiError(payload: unknown, fallbackMessage: string): string {
  if (typeof payload !== 'object' || payload === null) return fallbackMessage;
  const c = payload as { error?: string; error_description?: string; detail?: string; message?: string };
  return c.error_description || c.error || c.detail || c.message || fallbackMessage;
}

export class TwitterClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scope: string[];

  constructor(options: TwitterClientOptions = {}) {
    this.clientId = ensureString(options.clientId ?? process.env.TWITTER_CLIENT_ID, 'TWITTER_CLIENT_ID');
    this.clientSecret = ensureString(
      options.clientSecret ?? process.env.TWITTER_CLIENT_SECRET,
      'TWITTER_CLIENT_SECRET'
    );
    this.redirectUri = resolveTwitterRedirectUri({ override: options.redirectUri });

    const scopeValue = process.env.TWITTER_OAUTH_SCOPE;
    this.scope = options.scope ?? (scopeValue ? scopeValue.split(/\s+/).filter(Boolean) : DEFAULT_SCOPE);
  }

  generateAuthUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<TwitterTokenResponse> {
    console.log('[twitter] redirectUri:', this.redirectUri);
    console.log('[twitter] clientSecret loaded?', Boolean(this.clientSecret), 'len:', this.clientSecret.length);

    // Confidential client: Basic base64(client_id:client_secret)
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    // Per docs: code, grant_type, redirect_uri, code_verifier
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(TOKEN_URL, {
  method: 'POST',
  redirect: 'manual', // IMPORTANT: do NOT follow redirects
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Basic ${basic}`,
  },
  body,
});

console.log('[twitter] token status', response.status);
console.log('[twitter] token location', response.headers.get('location'));

    const text = await response.text();

    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { detail: text };
    }

    if (!response.ok) {
      console.error('[twitter] token exchange failed', { status: response.status, payload });
      throw new Error(getApiError(payload, `Failed to exchange Twitter OAuth code for token (${response.status})`));
    }

    return payload as TwitterTokenResponse;
  }

  async refreshAccessToken(refreshToken: string): Promise<TwitterTokenResponse> {
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body,
    });

    const text = await response.text();

    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { detail: text };
    }

    if (!response.ok) {
      console.error('[twitter] refresh failed', { status: response.status, payload });
      throw new Error(getApiError(payload, `Failed to refresh Twitter access token (${response.status})`));
    }

    return payload as TwitterTokenResponse;
  }

  async getUserInfo(accessToken: string): Promise<TwitterUserInfo> {
    const response = await this.fetchApi<TwitterApiEnvelope<TwitterUserInfo>>(
      '/users/me?user.fields=profile_image_url',
      accessToken
    );

    if (!response.data) throw new Error('Twitter user profile is missing in response');
    return response.data;
  }

  async verifyLike(
    accessToken: string,
    userId: string,
    tweetId: string
  ): Promise<TwitterVerificationResult<{ likedTweets?: Array<{ id: string }> }>> {
    const response = await this.fetchApi<TwitterApiEnvelope<Array<{ id: string }>>>(
      `/users/${userId}/liked_tweets?max_results=100&tweet.fields=id`,
      accessToken
    );

    const likedTweets = response.data ?? [];
    return { verified: likedTweets.some((t) => t.id === tweetId), data: { likedTweets } };
  }

  async verifyRetweet(
    accessToken: string,
    tweetId: string,
    userId: string
  ): Promise<TwitterVerificationResult<{ users?: Array<{ id: string }> }>> {
    const response = await this.fetchApi<TwitterApiEnvelope<Array<{ id: string }>>>(
      `/tweets/${tweetId}/retweeted_by?max_results=100`,
      accessToken
    );

    const users = response.data ?? [];
    return { verified: users.some((u) => u.id === userId), data: { users } };
  }

  async searchUserReply(
    accessToken: string,
    userId: string,
    tweetId: string
  ): Promise<
    TwitterVerificationResult<{ replies?: Array<{ id: string; author_id: string; conversation_id: string }> }>
  > {
    const query = encodeURIComponent(`conversation_id:${tweetId} from:${userId}`);
    const response = await this.fetchApi<
      TwitterApiEnvelope<Array<{ id: string; author_id: string; conversation_id: string }>>
    >(
      `/tweets/search/recent?query=${query}&max_results=100&tweet.fields=author_id,conversation_id`,
      accessToken
    );

    const replies = response.data ?? [];
    const hasReply = replies.some((r) => r.author_id === userId && r.conversation_id === tweetId);
    return { verified: hasReply, data: { replies } };
  }

  private async fetchApi<T>(path: string, accessToken: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const payload = (await response.json()) as T | Record<string, unknown>;
    if (!response.ok) throw new Error(getApiError(payload, `Twitter API request failed for ${path}`));
    return payload as T;
  }
}
