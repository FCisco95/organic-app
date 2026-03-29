import { NextResponse } from 'next/server';
import { encryptToken } from '@/lib/encryption';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TwitterClient, type TwitterTokenResponse, type TwitterUserInfo } from '@/lib/twitter/client';
import { resolveAppOrigin, resolveTwitterRedirectUri } from '@/lib/twitter/config';
import { withAtPrefix } from '@/lib/twitter/utils';
import { logger } from '@/lib/logger';

function buildProfileRedirect(origin: string, linked: boolean, reason?: string): URL {
  const target = new URL('/profile', origin);
  target.searchParams.set('twitter_linked', linked ? '1' : '0');
  if (reason) {
    target.searchParams.set('reason', reason);
  }
  return target;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const appOrigin = (() => {
    try {
      return resolveAppOrigin({ fallbackOrigin: requestUrl.origin });
    } catch (error) {
      logger.error('Error resolving app origin for Twitter OAuth callback:', error);
      return requestUrl.origin;
    }
  })();

  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(buildProfileRedirect(appOrigin, false, 'missing_params'));
  }

  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: oauthSession, error: sessionError } = await serviceClient
      .from('twitter_oauth_sessions')
      .select('id, user_id, code_verifier, expires_at')
      .eq('state', state)
      .maybeSingle();

    if (sessionError || !oauthSession) {
      return NextResponse.redirect(buildProfileRedirect(appOrigin, false, 'invalid_state'));
    }

    if (user && user.id !== oauthSession.user_id) {
      return NextResponse.redirect(buildProfileRedirect(appOrigin, false, 'session_mismatch'));
    }

    const expired = new Date(oauthSession.expires_at).getTime() <= Date.now();
    if (expired) {
      await serviceClient.from('twitter_oauth_sessions').delete().eq('id', oauthSession.id);
      return NextResponse.redirect(buildProfileRedirect(appOrigin, false, 'expired_state'));
    }

    let redirectUri: string;
    try {
      redirectUri = resolveTwitterRedirectUri({ fallbackOrigin: appOrigin });
    } catch (error) {
      logger.error('Error resolving Twitter redirect URI:', error);
      return NextResponse.redirect(buildProfileRedirect(appOrigin, false, 'redirect_uri_config_failed'));
    }

    const twitterClient = new TwitterClient({ redirectUri });
    let tokenResponse: TwitterTokenResponse;
    try {
      tokenResponse = await twitterClient.exchangeCodeForToken(code, oauthSession.code_verifier);
    } catch (error) {
      logger.error('Error exchanging Twitter OAuth code for token:', error);
      return NextResponse.redirect(buildProfileRedirect(appOrigin, false, 'token_exchange_failed'));
    }

    let twitterProfile: TwitterUserInfo;
    try {
      twitterProfile = await twitterClient.getUserInfo(tokenResponse.access_token);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn('getUserInfo failed, falling back to manual handle entry:', { message: msg });

      // Free-tier Twitter apps can't call /users/me — store with placeholder username
      // and let the user update their handle from the profile page.
      twitterProfile = {
        id: `pending_${Date.now()}`,
        name: 'pending',
        username: 'pending',
      };
    }

    const encryptionKey = process.env.TWITTER_TOKEN_ENCRYPTION_KEY;
    if (!encryptionKey) {
      return NextResponse.redirect(buildProfileRedirect(appOrigin, false, 'missing_encryption_key'));
    }

    let accessTokenEncrypted: string;
    let refreshTokenEncrypted: string | null = null;
    try {
      accessTokenEncrypted = encryptToken(tokenResponse.access_token, encryptionKey);
      refreshTokenEncrypted = tokenResponse.refresh_token
        ? encryptToken(tokenResponse.refresh_token, encryptionKey)
        : null;
    } catch (error) {
      logger.error('Error encrypting Twitter tokens:', error);
      return NextResponse.redirect(buildProfileRedirect(appOrigin, false, 'token_encryption_failed'));
    }

    const tokenExpiresAt = Number.isFinite(tokenResponse.expires_in)
      ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
      : null;

    const scope = tokenResponse.scope
      ? tokenResponse.scope.split(/\s+/).filter(Boolean)
      : [];

    // Check if this Twitter account is already linked to a different user
    if (!twitterProfile.id.startsWith('pending_')) {
      const { data: existingAccount } = await serviceClient
        .from('twitter_accounts')
        .select('id, user_id')
        .eq('twitter_user_id', twitterProfile.id)
        .eq('is_active', true)
        .neq('user_id', oauthSession.user_id)
        .maybeSingle();

      if (existingAccount) {
        await serviceClient.from('twitter_oauth_sessions').delete().eq('id', oauthSession.id);
        return NextResponse.redirect(buildProfileRedirect(appOrigin, false, 'twitter_already_linked'));
      }
    }

    await serviceClient
      .from('twitter_accounts')
      .update({
        is_active: false,
      })
      .eq('user_id', oauthSession.user_id)
      .eq('is_active', true);

    const { error: accountInsertError } = await serviceClient.from('twitter_accounts').insert({
      user_id: oauthSession.user_id,
      twitter_user_id: twitterProfile.id,
      twitter_username: twitterProfile.username,
      display_name: twitterProfile.name,
      profile_image_url: twitterProfile.profile_image_url ?? null,
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      token_expires_at: tokenExpiresAt,
      scope,
      is_active: true,
      verified_at: new Date().toISOString(),
    });

    if (accountInsertError) {
      // Log failed Twitter link (non-blocking)
      serviceClient
        .from('activity_log')
        .insert({
          actor_id: oauthSession.user_id,
          event_type: 'twitter_link_failed' as any,
          subject_type: 'user',
          subject_id: oauthSession.user_id,
          metadata: { reason: 'account_insert_failed' },
        })
        .then(() => {});
      return NextResponse.redirect(buildProfileRedirect(appOrigin, false, 'account_insert_failed'));
    }

    const profileUpdate: Record<string, unknown> = { twitter_verified: true };
    if (twitterProfile.username && twitterProfile.username !== 'pending') {
      profileUpdate.twitter = withAtPrefix(twitterProfile.username);
    }

    const { error: profileUpdateError } = await serviceClient
      .from('user_profiles')
      .update(profileUpdate)
      .eq('id', oauthSession.user_id);

    if (profileUpdateError) {
      // Log failed Twitter link (non-blocking)
      serviceClient
        .from('activity_log')
        .insert({
          actor_id: oauthSession.user_id,
          event_type: 'twitter_link_failed' as any,
          subject_type: 'user',
          subject_id: oauthSession.user_id,
          metadata: { reason: 'profile_update_failed' },
        })
        .then(() => {});
      return NextResponse.redirect(buildProfileRedirect(appOrigin, false, 'profile_update_failed'));
    }

    await serviceClient.from('twitter_oauth_sessions').delete().eq('id', oauthSession.id);

    // Log successful Twitter link activity (non-blocking)
    serviceClient
      .from('activity_log')
      .insert({
        actor_id: oauthSession.user_id,
        event_type: 'twitter_linked' as any,
        subject_type: 'user',
        subject_id: oauthSession.user_id,
        metadata: { twitter_username: twitterProfile.username },
      })
      .then(({ error: logError }) => {
        if (logError) {
          logger.error('Failed to log twitter_linked activity:', logError);
        }
      });

    const needsHandle = twitterProfile.username === 'pending';
    const redirect = buildProfileRedirect(appOrigin, true);
    if (needsHandle) {
      redirect.searchParams.set('twitter_needs_handle', '1');
    }
    return NextResponse.redirect(redirect);
  } catch (error: unknown) {
    logger.error('Error handling Twitter OAuth callback:', error);
    return NextResponse.redirect(buildProfileRedirect(appOrigin, false, 'oauth_callback_failed'));
  }
}
