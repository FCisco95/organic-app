import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { voteIdeaSchema } from '@/features/ideas/schemas';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';
import { awardXp } from '@/features/gamification/xp-service';

type RouteParams = { params: Promise<{ id: string }> };

function normalizeVoteValue(value: 'up' | 'down' | 'none'): -1 | 0 | 1 {
  if (value === 'up') return 1;
  if (value === 'down') return -1;
  return 0;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    if (!isIdeasIncubatorEnabled()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id: ideaId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyUserRateLimit(user.id, 'ideas:vote', RATE_LIMITS.write);
    if (rateLimited) return rateLimited;

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const parsed = voteIdeaSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const desiredVote = normalizeVoteValue(parsed.data.value);

    const [profileResult, ideaResult, existingResult] = await Promise.all([
      supabase.from('user_profiles').select('id, organic_id').eq('id', user.id).single(),
      supabase
        .from('ideas')
        .select('id, author_id, status, removed_at')
        .eq('id', ideaId)
        .single(),
      supabase
        .from('idea_votes')
        .select('id, value')
        .eq('idea_id', ideaId)
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!profileResult.data.organic_id) {
      return NextResponse.json({ error: 'You must have an Organic ID to vote on ideas' }, { status: 403 });
    }

    if (ideaResult.error || !ideaResult.data) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const idea = ideaResult.data;

    if (idea.removed_at) {
      return NextResponse.json({ error: 'Idea has been removed' }, { status: 400 });
    }

    if (idea.status !== 'open') {
      return NextResponse.json({ error: 'Voting is locked for this idea' }, { status: 400 });
    }

    if (idea.author_id === user.id) {
      return NextResponse.json({ error: 'You cannot vote on your own idea' }, { status: 403 });
    }

    const existing = existingResult.data;
    const existingValue = Number(existing?.value ?? 0);

    // If user submits the same vote again, toggle back to neutral.
    const shouldClearVote = desiredVote === 0 || (existing && existingValue === desiredVote);

    if (shouldClearVote && existing) {
      const { error: deleteError } = await supabase.from('idea_votes').delete().eq('id', existing.id);
      if (deleteError) {
        logger.error('Idea vote delete failed', deleteError);
        return NextResponse.json({ error: 'Failed to clear vote' }, { status: 500 });
      }
    }

    if (!shouldClearVote) {
      const { error: upsertError } = await supabase.from('idea_votes').upsert(
        {
          idea_id: ideaId,
          user_id: user.id,
          value: desiredVote,
        },
        { onConflict: 'idea_id,user_id' }
      );

      if (upsertError) {
        logger.error('Idea vote upsert failed', upsertError);
        return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 });
      }
    }

    const finalVote: -1 | 0 | 1 = shouldClearVote ? 0 : desiredVote;

    const service = createServiceClient();
    const xpPromises: Promise<unknown>[] = [
      service.from('idea_events').insert({
        idea_id: ideaId,
        actor_id: user.id,
        event_type: 'vote_changed',
        metadata: {
          previous: existingValue,
          next: finalVote,
        },
      }),
    ];

    if (finalVote !== 0) {
      xpPromises.push(
        service.from('activity_log').insert({
          actor_id: user.id,
          event_type: 'idea_voted',
          subject_type: 'idea',
          subject_id: ideaId,
          metadata: { value: finalVote },
        }),
        // XP for the voter (1 XP, cap 5/day)
        awardXp(service, {
          userId: user.id,
          eventType: 'idea_voted',
          xpAmount: 1,
          sourceType: 'idea_vote',
          sourceId: ideaId,
          metadata: { value: finalVote },
        }),
        // XP for the idea author (1 XP for receiving a vote, cap 10/day)
        awardXp(service, {
          userId: idea.author_id,
          eventType: 'idea_vote_received',
          xpAmount: 1,
          sourceType: 'idea_vote',
          sourceId: `${ideaId}:${user.id}`,
          metadata: { voter_id: user.id, idea_id: ideaId },
        })
      );
    }

    await Promise.allSettled(xpPromises);

    const { data: ideaSnapshot, error: snapshotError } = await supabase
      .from('ideas')
      .select('id, score, upvotes, downvotes')
      .eq('id', ideaId)
      .single();

    if (snapshotError || !ideaSnapshot) {
      return NextResponse.json({ error: 'Vote updated but failed to fetch score' }, { status: 500 });
    }

    return NextResponse.json({
      idea: ideaSnapshot,
      user_vote: finalVote,
    });
  } catch (error) {
    logger.error('Idea vote POST route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
