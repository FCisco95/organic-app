import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reviewClaimSchema } from '@/features/rewards/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Admin only
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }
    const parsed = reviewClaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status, admin_note } = parsed.data;

    // Fetch claim
    const { data: claim, error: claimError } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('id', id)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    if (claim.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending claims can be reviewed' },
        { status: 400 }
      );
    }

    // Update claim
    const { data: updated, error: updateError } = await supabase
      .from('reward_claims')
      .update({
        status,
        admin_note: admin_note ?? null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Claim review error:', updateError);
      return NextResponse.json({ error: 'Failed to review claim' }, { status: 500 });
    }

    // If rejected, refund claimable_points
    if (status === 'rejected') {
      const { data: claimUser } = await supabase
        .from('user_profiles')
        .select('claimable_points')
        .eq('id', claim.user_id)
        .single();

      if (claimUser) {
        const { error: refundError } = await supabase
          .from('user_profiles')
          .update({
            claimable_points: claimUser.claimable_points + claim.points_amount,
          })
          .eq('id', claim.user_id);

        if (refundError) {
          logger.error('Points refund error:', refundError);
        }
      }
    }

    return NextResponse.json({ claim: updated });
  } catch (err) {
    logger.error('Claim review error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
