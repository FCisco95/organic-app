import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import type { CreateBoostInput, SubmitProofInput } from './schemas';

const MAX_DAILY_ENGAGEMENTS = 20;

// ─── Create Boost ────────────────────────────────────────────────────────────

export async function createBoost(
  supabase: SupabaseClient,
  userId: string,
  input: CreateBoostInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  // Use atomic RPC with advisory lock to prevent race conditions
  const { data, error } = await supabase.rpc('marketplace_create_boost' as any, {
    p_user_id: userId,
    p_tweet_url: input.tweet_url,
    p_points_offered: input.points_offered,
    p_max_engagements: input.max_engagements,
  });

  if (error) {
    logger.error('marketplace_create_boost RPC error', error);
    return { ok: false, error: 'Failed to create boost' };
  }

  const result = data as { ok: boolean; id?: string; error?: string };
  return result;
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
    .maybeSingle();

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
  // Use atomic RPC with advisory lock to prevent race conditions
  const { data, error } = await supabase.rpc('marketplace_cancel_boost' as any, {
    p_user_id: userId,
    p_boost_id: boostId,
  });

  if (error) {
    logger.error('marketplace_cancel_boost RPC error', error);
    return { ok: false, error: 'Failed to cancel boost' };
  }

  const result = data as { ok: boolean; error?: string };
  return result;
}
