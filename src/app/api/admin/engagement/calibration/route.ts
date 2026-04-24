import { NextResponse } from 'next/server';
import { asEngDb } from '@/features/engagement/db';
import { createClient } from '@/lib/supabase/server';
import { requireAdminOrCouncil } from '@/lib/auth/require-role';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/engagement/calibration
 *
 * Returns unreviewed calibration samples so admins can manually score them
 * and compare against the AI's score. The 5% sampling happens in the
 * processor; this route surfaces the queue.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const gate = await requireAdminOrCouncil(supabase);
    if (gate.error) return gate.error;

    const { data, error } = await asEngDb(supabase)
      .from('engagement_calibration_samples')
      .select(
        `
        id, ai_score, human_score, reviewed_at, created_at,
        submission:engagement_submissions (
          id, comment_text, comment_score_axes, comment_score_reasoning,
          engagement_type, user_id, post_id
        )
      `
      )
      .is('human_score', null)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      logger.error('[engagement.admin.calibration] list failed', error);
      return NextResponse.json({ error: 'Failed to load calibration queue' }, { status: 500 });
    }

    return NextResponse.json({ samples: data ?? [] });
  } catch (err) {
    logger.error('[engagement.admin.calibration.GET] exception', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
