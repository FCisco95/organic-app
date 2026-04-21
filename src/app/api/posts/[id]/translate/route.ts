import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { translateRequestSchema } from '@/features/translation/schemas';
import { translateContent, type TranslationField } from '@/lib/translation/translate-content';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { isTranslationEnabled } from '@/lib/translation/flags';

type RouteParams = { params: Promise<{ id: string }> };

interface ThreadPartRow {
  part_order: number;
  body: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isTranslationEnabled(supabase, 'posts'))) {
      return NextResponse.json(
        { error: 'Translation disabled for this content type' },
        { status: 403 }
      );
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

    const { data: post, error: postError } = await (supabase as any)
      .from('posts')
      .select('id, title, body, detected_language, post_type')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    let threadParts: ThreadPartRow[] = [];
    if (post.post_type === 'thread') {
      const { data: parts } = await (supabase as any)
        .from('post_thread_parts')
        .select('part_order, body')
        .eq('post_id', postId)
        .order('part_order', { ascending: true });
      threadParts = (parts ?? []) as ThreadPartRow[];
    }

    const fields: TranslationField[] = [
      { name: 'title', text: post.title },
      { name: 'body', text: post.body },
      ...threadParts.map((p) => ({
        name: `thread_part_${p.part_order}`,
        text: p.body,
      })),
    ];

    const result = await translateContent({
      contentType: 'post',
      contentId: postId,
      fields,
      sourceLocale: post.detected_language ?? null,
      targetLocale,
    });

    return NextResponse.json({
      data: result.translations,
      cached: result.cached,
      sourceLocale: result.sourceLocale,
    });
  } catch (err) {
    logger.error('Translation API error:', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
