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

    if (!response.data) {
      console.error('[twitter] getUserInfo: response missing data field', JSON.stringify(response));
      throw new Error('Twitter user profile is missing in response');
    }
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

  /**
   * Fetch recent tweets from a handle (username, without @). Used by the
   * X Engagement Rewards poll cron to discover new official posts.
   *
   * Pass `sinceId` to only return tweets newer than the given ID — this is
   * the only robust way to avoid re-processing the same tweets across polls.
   */
  async fetchPostsByHandle(
    accessToken: string,
    handle: string,
    options: { sinceId?: string; maxResults?: number } = {}
  ): Promise<{
    tweets: Array<{ id: string; text: string; created_at: string; author_id: string }>;
    authorId: string | null;
  }> {
    const lookup = await this.fetchApi<TwitterApiEnvelope<{ id: string; username: string }>>(
      `/users/by/username/${encodeURIComponent(handle.replace(/^@/, ''))}`,
      accessToken
    );
    const authorId = lookup.data?.id ?? null;
    if (!authorId) return { tweets: [], authorId: null };

    const params = new URLSearchParams({
      max_results: String(Math.min(Math.max(options.maxResults ?? 20, 5), 100)),
      'tweet.fields': 'created_at,author_id',
      exclude: 'replies,retweets',
    });
    if (options.sinceId) params.set('since_id', options.sinceId);

    const response = await this.fetchApi<
      TwitterApiEnvelope<Array<{ id: string; text: string; created_at: string; author_id: string }>>
    >(`/users/${authorId}/tweets?${params.toString()}`, accessToken);

    return { tweets: response.data ?? [], authorId };
  }

  /**
   * Fetch a single tweet with public metrics. Used to refresh engagement
   * counts on tracked posts.
   */
  async fetchTweet(
    accessToken: string,
    tweetId: string
  ): Promise<{
    id: string;
    text: string;
    created_at: string;
    author_id: string;
    public_metrics: {
      like_count: number;
      reply_count: number;
      retweet_count: number;
      quote_count: number;
    };
  } | null> {
    const response = await this.fetchApi<
      TwitterApiEnvelope<{
        id: string;
        text: string;
        created_at: string;
        author_id: string;
        public_metrics: {
          like_count: number;
          reply_count: number;
          retweet_count: number;
          quote_count: number;
        };
      }>
    >(
      `/tweets/${encodeURIComponent(tweetId)}?tweet.fields=created_at,author_id,public_metrics`,
      accessToken
    );
    return response.data ?? null;
  }

  /**
   * Fetch replies to a tweet via the recent-search endpoint. Returns
   * replies authored in the last ~7 days (API limitation on free/basic tiers).
   *
   * `paginationToken` supports multi-page fetches when a post accumulates
   * more than 100 replies between polls.
   */
  async fetchReplies(
    accessToken: string,
    tweetId: string,
    options: { paginationToken?: string; maxResults?: number } = {}
  ): Promise<{
    replies: Array<{ id: string; text: string; created_at: string; author_id: string; conversation_id: string }>;
    nextToken: string | null;
  }> {
    const query = encodeURIComponent(`conversation_id:${tweetId}`);
    const params = new URLSearchParams({
      query,
      max_results: String(Math.min(Math.max(options.maxResults ?? 100, 10), 100)),
      'tweet.fields': 'created_at,author_id,conversation_id',
    });
    if (options.paginationToken) params.set('next_token', options.paginationToken);

    // URLSearchParams double-encodes the query value since it was already
    // percent-encoded. Build the path manually to avoid that.
    const path =
      `/tweets/search/recent?query=${query}&max_results=${params.get('max_results')}` +
      `&tweet.fields=created_at,author_id,conversation_id` +
      (options.paginationToken ? `&next_token=${encodeURIComponent(options.paginationToken)}` : '');

    const response = await this.fetchApi<
      TwitterApiEnvelope<
        Array<{ id: string; text: string; created_at: string; author_id: string; conversation_id: string }>
      > & { meta?: { next_token?: string } }
    >(path, accessToken);

    return {
      replies: response.data ?? [],
      nextToken: response.meta?.next_token ?? null,
    };
  }

  private async fetchApi<T>(path: string, accessToken: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const text = await response.text();
    let payload: T | Record<string, unknown>;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { detail: text };
    }

    if (!response.ok) {
      console.error(`[twitter] API error ${response.status} for ${path}:`, payload);
      throw new Error(getApiError(payload, `Twitter API request failed for ${path} (${response.status})`));
    }
    return payload as T;
  }
}
