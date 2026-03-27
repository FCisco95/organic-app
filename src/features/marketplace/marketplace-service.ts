import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import type { CreateBoostInput, SubmitProofInput } from './schemas';

const MAX_ACTIVE_BOOSTS = 3;
const MAX_DAILY_ENGAGEMENTS = 20;
const MIN_LEVEL = 2;

// ─── Create Boost ────────────────────────────────────────────────────────────

export async function createBoost(
  supabase: SupabaseClient,
  userId: string,
  input: CreateBoostInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const db = supabase as any;

  // Check user level
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('level, claimable_points')
    .eq('id', userId)
    .single();

  if (!profile) {
    return { ok: false, error: 'Profile not found' };
  }

  if ((profile.level ?? 1) < MIN_LEVEL) {
    return { ok: false, error: `Level ${MIN_LEVEL}+ required to create boosts` };
  }

  if ((profile.claimable_points ?? 0) < input.points_offered) {
    return { ok: false, error: 'Insufficient points' };
  }

  // Check active boost limit
  const { count: activeCount } = await db
    .from('boost_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');

  if ((activeCount ?? 0) >= MAX_ACTIVE_BOOSTS) {
    return { ok: false, error: `Maximum ${MAX_ACTIVE_BOOSTS} active boosts allowed` };
  }

  // Deduct points
  const { error: deductError } = await supabase
    .from('user_profiles')
    .update({
      claimable_points: (profile.claimable_points ?? 0) - input.points_offered,
    })
    .eq('id', userId);

  if (deductError) {
    logger.error('Failed to deduct points for boost', deductError);
    return { ok: false, error: 'Failed to deduct points' };
  }

  // Create boost request
  const { data: boost, error: boostError } = await db
    .from('boost_requests')
    .insert({
      user_id: userId,
      tweet_url: input.tweet_url,
      points_offered: input.points_offered,
      max_engagements: input.max_engagements,
      status: 'active',
    })
    .select('id')
    .single();

  if (boostError) {
    // Refund points on failure
    await supabase
      .from('user_profiles')
      .update({
        claimable_points: (profile.claimable_points ?? 0),
      })
      .eq('id', userId);
    logger.error('Failed to create boost request', boostError);
    return { ok: false, error: 'Failed to create boost' };
  }

  // Create escrow entry
  await db.from('points_escrow').insert({
    boost_id: boost.id,
    user_id: userId,
    amount: input.points_offered,
    status: 'held',
  });

  return { ok: true, id: boost.id };
}

// ─── Submit Engagement Proof ─────────────────────────────────────────────────

export async function submitEngagementProof(
  supabase: SupabaseClient,
  engagerId: string,
  boostId: string,
  input: SubmitProofInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const db = supabase as any;

  // Check boost exists and is active
  const { data: boost } = await db
    .from('boost_requests')
    .select('id, user_id, status, current_engagements, max_engagements')
    .eq('id', boostId)
    .single();

  if (!boost) {
    return { ok: false, error: 'Boost not found' };
  }

  if (boost.status !== 'active') {
    return { ok: false, error: 'Boost is no longer active' };
  }

  if (boost.user_id === engagerId) {
    return { ok: false, error: 'Cannot engage with your own boost' };
  }

  if (boost.current_engagements >= boost.max_engagements) {
    return { ok: false, error: 'Boost has reached maximum engagements' };
  }

  // Check daily engagement limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: dailyCount } = await db
    .from('engagement_proofs')
    .select('id', { count: 'exact', head: true })
    .eq('engager_id', engagerId)
    .gte('created_at', today.toISOString());

  if ((dailyCount ?? 0) >= MAX_DAILY_ENGAGEMENTS) {
    return { ok: false, error: `Maximum ${MAX_DAILY_ENGAGEMENTS} engagements per day` };
  }

  // Create engagement proof
  const { data: proof, error: proofError } = await db
    .from('engagement_proofs')
    .insert({
      boost_id: boostId,
      engager_id: engagerId,
      proof_type: input.proof_type,
      proof_url: input.proof_url ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (proofError) {
    if (proofError.code === '23505') {
      return { ok: false, error: 'You already submitted this proof type for this boost' };
    }
    logger.error('Failed to create engagement proof', proofError);
    return { ok: false, error: 'Failed to submit proof' };
  }

  return { ok: true, id: proof.id };
}

// ─── Cancel Boost ────────────────────────────────────────────────────────────

export async function cancelBoost(
  supabase: SupabaseClient,
  userId: string,
  boostId: string
): Promise<{ ok: boolean; error?: string }> {
  const db = supabase as any;

  const { data: boost } = await db
    .from('boost_requests')
    .select('id, user_id, status, points_offered')
    .eq('id', boostId)
    .single();

  if (!boost || boost.user_id !== userId) {
    return { ok: false, error: 'Boost not found or unauthorized' };
  }

  if (boost.status !== 'active' && boost.status !== 'pending') {
    return { ok: false, error: 'Cannot cancel this boost' };
  }

  // Cancel boost
  await db.from('boost_requests').update({ status: 'cancelled' }).eq('id', boostId);

  // Refund escrow
  await db
    .from('points_escrow')
    .update({ status: 'refunded', released_at: new Date().toISOString() })
    .eq('boost_id', boostId)
    .eq('status', 'held');

  // Refund points to user
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('claimable_points')
    .eq('id', userId)
    .single();

  await supabase
    .from('user_profiles')
    .update({
      claimable_points: (profile?.claimable_points ?? 0) + boost.points_offered,
    })
    .eq('id', userId);

  return { ok: true };
}
