import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { translateRequestSchema } from '@/features/translation/schemas';
import { getTranslationProvider } from '@/lib/translation';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type { SupportedLocale } from '@/lib/translation/types';

type RouteParams = { params: Promise<{ id: string; commentId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { commentId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyUserRateLimit(user.id, 'translate', RATE_LIMITS.translate);
    if (rateLimited) return rateLimited;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = translateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { targetLocale } = parsed.data;

    // Check cache
    const serviceClient = createServiceClient();
    const { data: cached } = await (serviceClient as any)
      .from('content_translations')
      .select('translated_text')
      .eq('content_type', 'comment')
      .eq('content_id', commentId)
      .eq('field_name', 'body')
      .eq('target_locale', targetLocale)
      .single();

    if (cached) {
      return NextResponse.json({
        data: { body: cached.translated_text },
        cached: true,
      });
    }

    // Fetch comment
    const { data: comment, error: commentError } = await (supabase as any)
      .from('comments')
      .select('id, body')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Translate
    const provider = getTranslationProvider();
    const result = await provider.translate({
      text: [comment.body],
      targetLocale: targetLocale as SupportedLocale,
    });

    const translatedBody = result.translations[0].text;

    // Cache (fire-and-forget)
    (serviceClient as any)
      .from('content_translations')
      .upsert([{
        content_type: 'comment',
        content_id: commentId,
        field_name: 'body',
        source_locale: result.translations[0].detectedSourceLanguage.toLowerCase(),
        target_locale: targetLocale,
        translated_text: translatedBody,
        provider: provider.name,
      }], { onConflict: 'content_type,content_id,field_name,target_locale' })
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) logger.error('Failed to cache comment translation', { commentId, error: error.message });
      });

    return NextResponse.json({
      data: { body: translatedBody },
      cached: false,
    });
  } catch (err) {
    logger.error('Comment translation error:', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
