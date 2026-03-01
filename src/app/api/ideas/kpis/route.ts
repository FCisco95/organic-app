import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWeekWindow } from '@/features/ideas/server';
import { logger } from '@/lib/logger';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';

export async function GET() {
  try {
    if (!isIdeasIncubatorEnabled()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const week = getCurrentWeekWindow();

    const [totalResult, activeResult, promotedResult, spotlightResult] = await Promise.all([
      supabase.from('ideas').select('id', { count: 'exact', head: true }),
      supabase
        .from('ideas')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
        .is('removed_at', null),
      supabase
        .from('ideas')
        .select('id', { count: 'exact', head: true })
        .not('promoted_to_proposal_id', 'is', null),
      supabase
        .from('ideas')
        .select('id,title,score,comments_count,upvotes,downvotes')
        .is('removed_at', null)
        .gte('created_at', week.startIso)
        .lt('created_at', week.endIso)
        .order('score', { ascending: false })
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    if (totalResult.error || activeResult.error || promotedResult.error) {
      throw totalResult.error ?? activeResult.error ?? promotedResult.error;
    }

    const totalIdeas = totalResult.count ?? 0;
    const promotedIdeas = promotedResult.count ?? 0;

    return NextResponse.json({
      total_ideas: totalIdeas,
      active_ideas: activeResult.count ?? 0,
      promoted_ideas: promotedIdeas,
      conversion_rate: totalIdeas === 0 ? 0 : Number(((promotedIdeas / totalIdeas) * 100).toFixed(1)),
      current_cycle_start: week.startIso,
      current_cycle_end: week.endIso,
      spotlight: spotlightResult.data ?? null,
    });
  } catch (error) {
    logger.error('Ideas KPIs route error', error);
    return NextResponse.json({ error: 'Failed to fetch ideas KPIs' }, { status: 500 });
  }
}
