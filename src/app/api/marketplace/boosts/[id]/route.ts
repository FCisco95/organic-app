import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { isMarketplaceEnabled } from '@/config/feature-flags';
import { cancelBoost } from '@/features/marketplace/marketplace-service';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isMarketplaceEnabled()) {
    return NextResponse.json({ error: 'Marketplace is not enabled' }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const db = supabase as any;

    const { data: boost, error } = await db
      .from('boost_requests')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !boost) {
      return NextResponse.json({ error: 'Boost not found' }, { status: 404 });
    }

    const { data: proofs } = await db
      .from('engagement_proofs')
      .select('*')
      .eq('boost_id', params.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ boost, proofs: proofs ?? [] });
  } catch (error) {
    logger.error('Marketplace boost detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    if (body.action === 'cancel') {
      const result = await cancelBoost(supabase, user.id, params.id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    logger.error('Marketplace boost PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
