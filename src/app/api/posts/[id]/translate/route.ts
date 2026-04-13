import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { translateRequestSchema } from '@/features/translation/schemas';
import { getTranslationProvider } from '@/lib/translation';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type { SupportedLocale } from '@/lib/translation/types';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit
    const rateLimited = await applyUserRateLimit(user.id, 'translate', RATE_LIMITS.translate);
    if (rateLimited) return rateLimited;

    // Validate input
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

    // Fetch the post
    const { data: post, error: postError } = await (supabase as any)
      .from('posts')
      .select('id, title, body, detected_language, post_type')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Don't translate if already in target language
    if (post.detected_language === targetLocale) {
      return NextResponse.json({
        data: { title: post.title, body: post.body, threadParts: null },
        cached: true,
        sourceLocale: post.detected_language,
      });
    }

    // Check cache first
    const serviceClient = createServiceClient();
    const { data: cached } = await (serviceClient as any)
      .from('content_translations')
      .select('field_name, translated_text')
      .eq('content_type', 'post')
      .eq('content_id', postId)
      .eq('target_locale', targetLocale);

    if (cached && cached.length > 0) {
      const titleTranslation = cached.find((c: { field_name: string }) => c.field_name === 'title');
      const bodyTranslation = cached.find((c: { field_name: string }) => c.field_name === 'body');
      const threadPartsTranslation = cached.find((c: { field_name: string }) => c.field_name === 'thread_parts');

      return NextResponse.json({
        data: {
          title: titleTranslation?.translated_text ?? post.title,
          body: bodyTranslation?.translated_text ?? post.body,
          threadParts: threadPartsTranslation
            ? JSON.parse(threadPartsTranslation.translated_text)
            : null,
        },
        cached: true,
        sourceLocale: post.detected_language,
      });
    }

    // Cache miss — call translation provider
    const provider = getTranslationProvider();
    const textsToTranslate = [post.title, post.body];

    // Fetch thread parts if this is a thread post
    let threadParts: { part_order: number; body: string }[] | null = null;
    if (post.post_type === 'thread') {
      const { data: parts } = await (supabase as any)
        .from('post_thread_parts')
        .select('part_order, body')
        .eq('post_id', postId)
        .order('part_order', { ascending: true });
      if (parts && parts.length > 0) {
        threadParts = parts;
        for (const part of parts) {
          textsToTranslate.push(part.body);
        }
      }
    }

    const result = await provider.translate({
      text: textsToTranslate,
      targetLocale: targetLocale as SupportedLocale,
      sourceLocale: (post.detected_language as SupportedLocale) ?? undefined,
    });

    const translatedTitle = result.translations[0].text;
    const translatedBody = result.translations[1].text;

    // Build cache entries
    const sourceLocale = post.detected_language ?? result.translations[0].detectedSourceLanguage.toLowerCase();
    const cacheRows = [
      {
        content_type: 'post',
        content_id: postId,
        field_name: 'title',
        source_locale: sourceLocale,
        target_locale: targetLocale,
        translated_text: translatedTitle,
        provider: provider.name,
      },
      {
        content_type: 'post',
        content_id: postId,
        field_name: 'body',
        source_locale: sourceLocale,
        target_locale: targetLocale,
        translated_text: translatedBody,
        provider: provider.name,
      },
    ];

    // Thread parts
    let translatedThreadParts: { part_order: number; body: string }[] | null = null;
    if (threadParts && threadParts.length > 0) {
      translatedThreadParts = threadParts.map((part, i) => ({
        part_order: part.part_order,
        body: result.translations[2 + i].text,
      }));
      cacheRows.push({
        content_type: 'post',
        content_id: postId,
        field_name: 'thread_parts',
        source_locale: sourceLocale,
        target_locale: targetLocale,
        translated_text: JSON.stringify(translatedThreadParts),
        provider: provider.name,
      });
    }

    // Store in cache (fire-and-forget)
    (serviceClient as any)
      .from('content_translations')
      .upsert(cacheRows, { onConflict: 'content_type,content_id,field_name,target_locale' })
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) {
          logger.error('Failed to cache translation', { postId, targetLocale, error: error.message });
        }
      });

    return NextResponse.json({
      data: {
        title: translatedTitle,
        body: translatedBody,
        threadParts: translatedThreadParts,
      },
      cached: false,
      sourceLocale,
    });
  } catch (err) {
    logger.error('Translation API error:', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
