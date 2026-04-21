import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { translateRequestSchema } from '@/features/translation/schemas';
import { translateContent, type TranslationField } from '@/lib/translation/translate-content';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { isTranslationEnabled } from '@/lib/translation/flags';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: taskId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isTranslationEnabled(supabase, 'tasks'))) {
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

    const { data: task, error: taskError } = await (supabase as any)
      .from('tasks')
      .select('id, title, description, detected_language')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const fields: TranslationField[] = [
      { name: 'title', text: task.title ?? '' },
      { name: 'description', text: task.description ?? '' },
    ].filter((f) => f.text.length > 0);

    const result = await translateContent({
      contentType: 'task',
      contentId: taskId,
      fields,
      sourceLocale: (task as { detected_language: string | null }).detected_language ?? null,
      targetLocale,
    });

    return NextResponse.json({
      data: {
        title: result.translations.title ?? task.title,
        description: result.translations.description ?? task.description,
      },
      cached: result.cached,
      sourceLocale: result.sourceLocale,
    });
  } catch (err) {
    logger.error('Task translation API error:', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
