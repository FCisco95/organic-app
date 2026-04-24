import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

type RestrictionStatus = 'active' | 'warned' | 'restricted' | 'banned';

// Returns 403 NextResponse if the user is restricted/banned, or null if allowed.
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
