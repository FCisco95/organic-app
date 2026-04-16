import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { translateRequestSchema } from '@/features/translation/schemas';
import { translateContent } from '@/lib/translation/translate-content';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type {
  TranslatableContentType,
  TranslationField,
} from '@/lib/translation/translate-content';

type RouteParams = { params: Promise<{ commentId: string }> };

interface CommentLookup {
  contentType: Extract<TranslatableContentType, 'comment' | 'task_comment'>;
  text: string;
  detectedLanguage: string | null;
}

/**
 * Unified comment translation: looks up the comment in the polymorphic
 * `comments` table first (post/proposal/idea comments), then falls back to
 * `task_comments` (which diverged from the polymorphic design). Cached under
 * distinct content_type values so they never collide.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { commentId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

    const lookup = await findComment(supabase, commentId);
    if (!lookup) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const fields: TranslationField[] = [{ name: 'body', text: lookup.text }];

    const result = await translateContent({
      contentType: lookup.contentType,
      contentId: commentId,
      fields,
      sourceLocale: lookup.detectedLanguage,
      targetLocale,
    });

    return NextResponse.json({
      data: { body: result.translations.body ?? lookup.text },
      cached: result.cached,
      sourceLocale: result.sourceLocale,
    });
  } catch (err) {
    logger.error('Comment translation error:', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}

async function findComment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  commentId: string
): Promise<CommentLookup | null> {
  const { data: comment } = await (supabase as any)
    .from('comments')
    .select('id, body, detected_language')
    .eq('id', commentId)
    .maybeSingle();

  if (comment) {
    return {
      contentType: 'comment',
      text: comment.body,
      detectedLanguage: comment.detected_language ?? null,
    };
  }

  const { data: taskComment } = await (supabase as any)
    .from('task_comments')
    .select('id, content, detected_language')
    .eq('id', commentId)
    .maybeSingle();

  if (taskComment) {
    return {
      contentType: 'task_comment',
      text: taskComment.content,
      detectedLanguage: taskComment.detected_language ?? null,
    };
  }

  return null;
}
