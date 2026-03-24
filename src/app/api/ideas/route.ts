import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { applyUserRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createIdeaSchema, listIdeasQuerySchema } from '@/features/ideas/schemas';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';
import { awardXp } from '@/features/gamification/xp-service';

const IDEA_SELECT =
  '*, author:user_profiles!ideas_author_id_fkey(id,name,email,organic_id,avatar_url)';

type IdeaRow = {
  id: string;
  created_at: string;
  score: number;
  [key: string]: unknown;
};

function decorateIdeasWithVotes<T extends IdeaRow>(
  ideas: T[],
  votes: Array<{ idea_id: string; value: number }>
) {
  if (ideas.length === 0) return [] as Array<T & { user_vote: -1 | 0 | 1 }>;

  const voteByIdeaId = new Map(votes.map((vote) => [vote.idea_id, vote.value]));

  return ideas.map((idea) => {
    const rawVote = Number(voteByIdeaId.get(idea.id) ?? 0);
    const userVote: -1 | 0 | 1 = rawVote > 0 ? 1 : rawVote < 0 ? -1 : 0;
    return { ...idea, user_vote: userVote };
  });
}

export async function GET(request: NextRequest) {
  try {
    if (!isIdeasIncubatorEnabled()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const queryResult = listIdeasQuerySchema.safeParse({
      sort: searchParams.get('sort') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: queryResult.error.flatten() },
        { status: 400 }
      );
    }

    const { sort, search, limit } = queryResult.data;

    let query = supabase
      .from('ideas')
      .select(IDEA_SELECT)
      .is('removed_at', null)
      .limit(limit);

    if (search) {
      query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
    }

    const weekStart = new Date();
    weekStart.setUTCDate(weekStart.getUTCDate() - 7);

    if (sort === 'new') {
      query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    } else if (sort === 'top_week') {
      query = query
        .gte('created_at', weekStart.toISOString())
        .order('score', { ascending: false })
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
    } else if (sort === 'top_all') {
      query = query.order('score', { ascending: false }).order('is_pinned', { ascending: false });
    } else {
      query = query
        .order('is_pinned', { ascending: false })
        .order('score', { ascending: false })
        .order('last_activity_at', { ascending: false });
    }

    const { data: ideas, error } = await query;

    if (error) {
      logger.error('Ideas feed query failed', error);
      return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !ideas || ideas.length === 0) {
      return NextResponse.json({ items: decorateIdeasWithVotes(ideas ?? [], []) });
    }

    const ideaIds = ideas.map((idea) => idea.id);
    const { data: votes } = await supabase
      .from('idea_votes')
      .select('idea_id, value')
      .eq('user_id', user.id)
      .in('idea_id', ideaIds);

    return NextResponse.json({ items: decorateIdeasWithVotes(ideas, votes ?? []) });
  } catch (error) {
    logger.error('Ideas GET route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isIdeasIncubatorEnabled()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyUserRateLimit(user.id, 'ideas:create', RATE_LIMITS.write);
    if (rateLimited) return rateLimited;

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, organic_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!profile.organic_id) {
      return NextResponse.json(
        { error: 'You must have an Organic ID to create ideas' },
        { status: 403 }
      );
    }

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const parsed = createIdeaSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, body, tags } = parsed.data;

    const { data: idea, error: insertError } = await supabase
      .from('ideas')
      .insert({
        author_id: user.id,
        title,
        body,
        tags: tags ?? [],
      })
      .select(IDEA_SELECT)
      .single();

    if (insertError || !idea) {
      logger.error('Idea creation failed', insertError);
      return NextResponse.json({ error: 'Failed to create idea' }, { status: 500 });
    }

    const service = createServiceClient();
    await Promise.allSettled([
      service.from('idea_events').insert({
        idea_id: idea.id,
        actor_id: user.id,
        event_type: 'created',
        metadata: { tags: tags ?? [] },
      }),
      service.from('activity_log').insert({
        actor_id: user.id,
        event_type: 'idea_created',
        subject_type: 'idea',
        subject_id: idea.id,
        metadata: { source: 'ideas' },
      }),
      awardXp(service, {
        userId: user.id,
        eventType: 'idea_created',
        xpAmount: 5,
        sourceType: 'idea',
        sourceId: idea.id,
        metadata: { title },
      }),
    ]);

    return NextResponse.json({ ...idea, user_vote: 0 }, { status: 201 });
  } catch (error) {
    logger.error('Ideas POST route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
