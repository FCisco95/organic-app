import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { payClaimSchema } from '@/features/rewards/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';

export async function POST(
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

    const parsed = payClaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tx_signature } = parsed.data;

    // Fetch claim
    const { data: claim, error: claimError } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('id', id)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    if (claim.status !== 'approved') {
      return NextResponse.json(
        { error: 'Only approved claims can be marked as paid' },
        { status: 400 }
      );
    }

    // Atomically update claim to paid (optimistic lock on status to prevent double-pay)
    const { data: updated, error: updateError } = await supabase
      .from('reward_claims')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_tx_signature: tx_signature,
      })
      .eq('id', id)
      .eq('status', 'approved') // only pay if still approved
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Claim pay error:', updateError);
      return NextResponse.json({ error: 'Failed to mark claim as paid' }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: 'Claim status changed. It may have already been paid.' }, { status: 409 });
    }

    // Create distribution record
    const { error: distError } = await supabase.from('reward_distributions').insert({
      user_id: claim.user_id,
      type: 'claim',
      claim_id: claim.id,
      points_earned: claim.points_amount,
      token_amount: claim.token_amount,
      category: 'claim_payout',
      reason: `Claim payout - tx: ${tx_signature.slice(0, 16)}...`,
      created_by: user.id,
    });

    if (distError) {
      console.error('Distribution record error:', distError);
      // Don't fail the pay action since the claim is already marked as paid
    }

    return NextResponse.json({ claim: updated });
  } catch (err) {
    console.error('Claim pay error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
