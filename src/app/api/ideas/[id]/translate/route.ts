import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { translateRequestSchema } from '@/features/translation/schemas';
import { translateContent, type TranslationField } from '@/lib/translation/translate-content';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    if (!isIdeasIncubatorEnabled()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id: ideaId } = await params;

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

    const { data: idea, error: ideaError } = await (supabase as any)
      .from('ideas')
      .select('id, title, body, detected_language')
      .eq('id', ideaId)
      .single();

    if (ideaError || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const fields: TranslationField[] = [
      { name: 'title', text: idea.title ?? '' },
      { name: 'body', text: idea.body ?? '' },
    ].filter((f) => f.text.length > 0);

    const result = await translateContent({
      contentType: 'idea',
      contentId: ideaId,
      fields,
      sourceLocale: (idea as { detected_language: string | null }).detected_language ?? null,
      targetLocale,
    });

    return NextResponse.json({
      data: {
        title: result.translations.title ?? idea.title,
        body: result.translations.body ?? idea.body,
      },
      cached: result.cached,
      sourceLocale: result.sourceLocale,
    });
  } catch (err) {
    logger.error('Idea translation API error:', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
