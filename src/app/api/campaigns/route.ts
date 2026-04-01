import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get user (optional — used for audience filtering)
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Not authenticated — that's fine for public campaigns
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('campaigns' as any)
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false }) as { data: any[] | null; error: any };

    if (error) {
      logger.error('Campaigns GET error:', error);
      return NextResponse.json({ data: [] });
    }

    // Filter by date range (ends_at is nullable)
    let campaigns = (data ?? []).filter(
      (c: any) => !c.ends_at || new Date(c.ends_at) > new Date()
    );

    // Filter by visibility condition
    // Check egg_hunt_config for campaign_revealed
    let eggHuntRevealed = false;
    try {
      const { data: config } = await supabase
        .from('egg_hunt_config' as any)
        .select('campaign_revealed')
        .limit(1)
        .single();
      eggHuntRevealed = !!(config as any)?.campaign_revealed;
    } catch {
      // Table might not exist or be empty
    }

    campaigns = campaigns.filter((c: any) => {
      if (c.visibility_condition === 'always') return true;
      if (c.visibility_condition === 'egg_hunt_revealed') return eggHuntRevealed;
      return true;
    });

    // Filter by target audience
    const hasUser = !!userId;
    campaigns = campaigns.filter((c: any) => {
      if (c.target_audience === 'all') return true;
      if (c.target_audience === 'members' && hasUser) return true;
      if (c.target_audience === 'new_users' && !hasUser) return true;
      return false;
    });

    return NextResponse.json({ data: campaigns });
  } catch (error) {
    logger.error('Campaigns route error:', error);
    return NextResponse.json({ data: [] });
  }
}
