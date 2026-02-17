import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TwitterClient } from '@/lib/twitter/client';
import { resolveTwitterRedirectUri } from '@/lib/twitter/config';
import { generatePkcePair } from '@/lib/twitter/pkce';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

const startTwitterLinkSchema = z
  .object({
    redirect_uri: z.string().url().optional(),
  })
  .optional();

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError, code: 'INVALID_JSON' }, { status: 400 });
    }

    const parsed = startTwitterLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request payload',
          code: 'INVALID_REQUEST',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const state = randomUUID();
    const { codeVerifier, codeChallenge } = generatePkcePair();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await serviceClient
      .from('twitter_oauth_sessions')
      .delete()
      .eq('user_id', user.id)
      .lt('expires_at', new Date().toISOString());

    const { error: insertError } = await serviceClient.from('twitter_oauth_sessions').insert({
      user_id: user.id,
      state,
      code_verifier: codeVerifier,
      expires_at: expiresAt,
    });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to initialize Twitter OAuth session' }, { status: 500 });
    }

    const requestUrl = new URL(request.url);
    const redirectUri = resolveTwitterRedirectUri({
      override: parsed.data?.redirect_uri,
      fallbackOrigin: requestUrl.origin,
    });

    const twitterClient = new TwitterClient({ redirectUri });
    const authUrl = twitterClient.generateAuthUrl(state, codeChallenge);

    return NextResponse.json({
      auth_url: authUrl,
      expires_at: expiresAt,
    });
  } catch (error: unknown) {
    logger.error('Error starting Twitter OAuth flow:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
