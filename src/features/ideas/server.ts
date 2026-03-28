import { createClient } from '@/lib/supabase/server';

export const IDEA_PROFILE_COLUMNS = 'id, role, organic_id, name, email, avatar_url';

export type IdeaProfile = {
  id: string;
  role: 'admin' | 'council' | 'member' | 'guest' | null;
  organic_id: number | null;
  name: string | null;
  email: string;
  avatar_url: string | null;
};

export function isAdminOrCouncil(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'council';
}

export function getCurrentWeekWindow(now = new Date()): { startIso: string; endIso: string; startDate: string } {
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = utc.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;

  const start = new Date(utc);
  start.setUTCDate(utc.getUTCDate() - daysSinceMonday);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startDate: start.toISOString().slice(0, 10),
  };
}

export async function getAuthenticatedProfile() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, profile: null } as const;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select(IDEA_PROFILE_COLUMNS)
    .eq('id', user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    profile: (profile ?? null) as IdeaProfile | null,
  } as const;
}
