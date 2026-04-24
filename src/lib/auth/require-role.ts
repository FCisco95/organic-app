import { NextResponse } from 'next/server';
import type { createClient } from '@/lib/supabase/server';

type AppSupabase = Awaited<ReturnType<typeof createClient>>;

export interface RequireRoleSuccess {
  error: null;
  user: { id: string; email?: string | null };
  profile: { id: string; role: string; organic_id: number | null; xp_total: number };
}

export interface RequireRoleFailure {
  error: NextResponse;
  user: null;
  profile: null;
}

/**
 * Admin/council role guard for API routes. Usage:
 *
 *   const gate = await requireAdminOrCouncil(supabase);
 *   if (gate.error) return gate.error;
 */
export async function requireAdminOrCouncil(
  supabase: AppSupabase
): Promise<RequireRoleSuccess | RequireRoleFailure> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
      user: null,
      profile: null,
    };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, organic_id, xp_total')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['admin', 'council'].includes(profile.role ?? '')) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      profile: null,
    };
  }

  return {
    error: null,
    user: { id: user.id, email: user.email ?? null },
    profile: {
      id: profile.id as string,
      role: profile.role as string,
      organic_id: (profile.organic_id as number | null) ?? null,
      xp_total: (profile.xp_total as number) ?? 0,
    },
  };
}

/**
 * Verified-member guard for API routes. Requires the user to have a
 * non-null `organic_id` on their profile (i.e. they've completed the
 * human-verification step).
 */
export async function requireVerifiedMember(
  supabase: AppSupabase
): Promise<RequireRoleSuccess | RequireRoleFailure> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
      user: null,
      profile: null,
    };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, organic_id, xp_total')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    return {
      error: NextResponse.json({ error: 'Profile not found' }, { status: 403 }),
      user: null,
      profile: null,
    };
  }

  if (profile.organic_id == null) {
    return {
      error: NextResponse.json({ error: 'Organic ID verification required' }, { status: 403 }),
      user: null,
      profile: null,
    };
  }

  return {
    error: null,
    user: { id: user.id, email: user.email ?? null },
    profile: {
      id: profile.id as string,
      role: (profile.role as string) ?? 'member',
      organic_id: profile.organic_id as number,
      xp_total: (profile.xp_total as number) ?? 0,
    },
  };
}
