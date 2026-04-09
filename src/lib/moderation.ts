import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

type RestrictionStatus = 'active' | 'warned' | 'restricted' | 'banned';

interface RestrictionCheck {
  restricted: boolean;
  status: RestrictionStatus;
  reason: string | null;
}

/**
 * Check if a user is restricted from performing write actions.
 * Returns a 403 NextResponse if restricted/banned, or null if allowed.
 */
export async function checkUserRestriction(
  supabase: SupabaseClient,
  userId: string
): Promise<NextResponse | null> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('restriction_status, restriction_reason')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) return null;

  const status = (profile.restriction_status ?? 'active') as RestrictionStatus;

  if (status === 'restricted' || status === 'banned') {
    return NextResponse.json(
      {
        error: 'Your account has been restricted',
        restriction_status: status,
        restriction_reason: profile.restriction_reason,
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Get restriction info for a user (used by components/context).
 */
export async function getRestrictionInfo(
  supabase: SupabaseClient,
  userId: string
): Promise<RestrictionCheck> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('restriction_status, restriction_reason')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    return { restricted: false, status: 'active', reason: null };
  }

  const status = (profile.restriction_status ?? 'active') as RestrictionStatus;

  return {
    restricted: status === 'restricted' || status === 'banned',
    status,
    reason: profile.restriction_reason,
  };
}
