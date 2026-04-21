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
    const { id: proposalId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isTranslationEnabled(supabase, 'proposals'))) {
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

    const { data: proposal, error: proposalError } = await (supabase as any)
      .from('proposals')
      .select('id, title, body, summary, detected_language')
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const fields: TranslationField[] = [
      { name: 'title', text: proposal.title ?? '' },
      { name: 'body', text: proposal.body ?? '' },
      { name: 'summary', text: proposal.summary ?? '' },
    ].filter((f) => f.text.length > 0);

    const result = await translateContent({
      contentType: 'proposal',
      contentId: proposalId,
      fields,
      sourceLocale: (proposal as { detected_language: string | null }).detected_language ?? null,
      targetLocale,
    });

    return NextResponse.json({
      data: {
        title: result.translations.title ?? proposal.title,
        body: result.translations.body ?? proposal.body,
        summary: result.translations.summary ?? proposal.summary,
      },
      cached: result.cached,
      sourceLocale: result.sourceLocale,
    });
  } catch (err) {
    logger.error('Proposal translation API error:', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
