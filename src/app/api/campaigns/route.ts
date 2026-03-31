import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('campaigns' as any)
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Campaigns GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    // Filter by date range (ends_at is nullable)
    let campaigns = (data ?? []).filter(
      (c: any) => !c.ends_at || new Date(c.ends_at) > new Date()
    );

    // Filter by visibility condition
    campaigns = campaigns.filter((c: any) => {
      if (c.visibility_condition === 'always') return true;
      if (c.visibility_condition === 'egg_hunt_revealed') {
        // Will be checked against egg_hunt_config when that table exists
        // For now, egg_hunt_revealed campaigns are hidden
        return false;
      }
      return true;
    });

    // Filter by target audience
    const hasOrganicId = !!user;
    campaigns = campaigns.filter((c: any) => {
      if (c.target_audience === 'all') return true;
      if (c.target_audience === 'members' && hasOrganicId) return true;
      if (c.target_audience === 'new_users' && !hasOrganicId) return true;
      return false;
    });

    return NextResponse.json({ data: campaigns });
  } catch (error) {
    logger.error('Campaigns route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
