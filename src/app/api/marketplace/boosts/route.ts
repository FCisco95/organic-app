import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { isMarketplaceEnabled } from '@/config/feature-flags';
import { createBoostSchema } from '@/features/marketplace/schemas';
import { createBoost } from '@/features/marketplace/marketplace-service';

export const dynamic = 'force-dynamic';

/**
 * Returns true when the Supabase/PostgREST error indicates the underlying
 * table (or a referenced relation) does not exist yet.  This lets us degrade
 * gracefully when the marketplace migration has not been applied.
 */
function isTableMissingError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message ?? '';
  return (
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    msg.includes('undefined table') ||
    error.code === '42P01' // PostgreSQL: undefined_table
  );
}

export async function GET(request: NextRequest) {
  if (!isMarketplaceEnabled()) {
    return NextResponse.json({ error: 'Marketplace is not enabled' }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get('mine') === 'true';

    const db = supabase as any;

    if (mine) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      const { data, error } = await db
        .from('boost_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        if (isTableMissingError(error)) {
          logger.warn('boost_requests table not available, returning empty list');
          return NextResponse.json({ data: [] });
        }
        logger.error('Failed to fetch my boosts', error);
        return NextResponse.json({ error: 'Failed to fetch boosts' }, { status: 500 });
      }

      return NextResponse.json({ data: data ?? [] });
    }

    // List active boosts — use left join (no !inner) so missing profiles don't break the query
    const { data, error } = await db
      .from('boost_requests')
      .select('*, user_profiles(name, avatar_url)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      if (isTableMissingError(error)) {
        logger.warn('boost_requests table not available, returning empty list');
        return NextResponse.json({ data: [] });
      }
      logger.error('Failed to fetch active boosts', error);
      return NextResponse.json({ error: 'Failed to fetch boosts' }, { status: 500 });
    }

    const boosts = (data ?? []).map((row: any) => ({
      ...row,
      author_name: row.user_profiles?.name ?? null,
      author_avatar: row.user_profiles?.avatar_url ?? null,
      user_profiles: undefined,
    }));

    return NextResponse.json({ data: boosts });
  } catch (error) {
    logger.error('Marketplace boosts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isMarketplaceEnabled()) {
    return NextResponse.json({ error: 'Marketplace is not enabled' }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createBoostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const result = await createBoost(supabase, user.id, parsed.data);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  } catch (error) {
    logger.error('Marketplace boosts POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
