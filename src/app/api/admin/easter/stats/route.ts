import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user };
  }

  return { error: null, user };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { error: authErr } = await requireAdmin(supabase);
    if (authErr) return authErr;

    // Total eggs found
    const { count: totalEggs } = await supabase
      .from('golden_eggs' as any)
      .select('*', { count: 'exact', head: true });

    // Unique hunters
    const { data: hunters } = await supabase
      .from('golden_eggs' as any)
      .select('user_id') as { data: any[] | null };

    const uniqueHunters = new Set((hunters ?? []).map((h: any) => h.user_id)).size;

    // Eggs by element
    const { data: allEggs } = await supabase
      .from('golden_eggs' as any)
      .select('element, found_at, user_id')
      .order('found_at', { ascending: true }) as { data: any[] | null };

    const eggsByElement: Record<string, number> = {};
    for (const egg of allEggs ?? []) {
      const el = egg.element as string;
      eggsByElement[el] = (eggsByElement[el] || 0) + 1;
    }

    // First discovery
    let firstDiscovery = null;
    if (allEggs && allEggs.length > 0) {
      const first = allEggs[0];
      const { data: discoverer } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('id', first.user_id)
        .maybeSingle();

      firstDiscovery = {
        user_name: discoverer?.name ?? 'Unknown',
        element: first.element as string,
        found_at: first.found_at as string,
      };
    }

    return NextResponse.json({
      data: {
        total_eggs_found: totalEggs ?? 0,
        unique_hunters: uniqueHunters,
        eggs_by_element: eggsByElement,
        first_discovery: firstDiscovery,
      },
    });
  } catch (error) {
    logger.error('Admin egg hunt stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
