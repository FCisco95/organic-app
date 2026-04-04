import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { eggClaimSchema } from '@/features/easter/schemas';
import { getEggElement } from '@/features/easter/elements';
import { awardXp } from '@/features/gamification/xp-service';

export async function GET() {
  // Return user's egg collection
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('golden_eggs' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('egg_number', { ascending: true });

    if (error) {
      logger.error('Egg collection GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch eggs' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    logger.error('Egg collection route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = eggClaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { egg_number, found_on_page } = parsed.data;
    const element = getEggElement(egg_number);
    if (!element) {
      return NextResponse.json({ error: 'Invalid egg number' }, { status: 400 });
    }

    // Check hunt is enabled
    const { data: configRaw } = await supabase
      .from('egg_hunt_config' as any)
      .select('hunt_enabled')
      .limit(1)
      .single();
    const config = configRaw as any;

    if (!config?.hunt_enabled) {
      return NextResponse.json({ error: 'Egg hunt is not active' }, { status: 403 });
    }

    // Check user doesn't already have this egg
    const { data: existing } = await supabase
      .from('golden_eggs' as any)
      .select('id')
      .eq('user_id', user.id)
      .eq('egg_number', egg_number)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'You already found this egg' }, { status: 409 });
    }

    // Insert the egg
    const { data: eggRaw, error: insertError } = await supabase
      .from('golden_eggs' as any)
      .insert({
        user_id: user.id,
        egg_number,
        element: element.element,
        found_on_page,
      })
      .select()
      .single();
    const egg = eggRaw as any;

    if (insertError) {
      logger.error('Egg claim insert error:', insertError);
      return NextResponse.json({ error: 'Failed to claim egg' }, { status: 500 });
    }

    // Award XP (100 per egg) — use service client to bypass RLS on xp_events
    const service = createServiceClient();
    await awardXp(service as any, {
      userId: user.id,
      eventType: 'egg_found',
      xpAmount: 100,
      sourceType: 'golden_egg',
      sourceId: egg.id as string,
      metadata: { egg_number, element: element.element },
    });

    // Reset page loads since last find
    await supabase
      .from('egg_hunt_luck' as any)
      .upsert({
        user_id: user.id,
        page_loads_since_last_find: 0,
        last_calculated_at: new Date().toISOString(),
      });

    // Build share tweet template
    const isRare = element.rarityModifier <= 0.5;
    const eggCount = await supabase
      .from('golden_eggs' as any)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const totalFound = (eggCount.count ?? 1);
    const elementName = element.element.charAt(0).toUpperCase() + element.element.slice(1);

    let tweetText: string;
    if (totalFound === 1) {
      tweetText = `🥚 I just discovered something hidden in @OrganicDAO...\n\nWhat is this?? #OrganicEaster`;
    } else if (isRare) {
      tweetText = `🌌 NO WAY. I just found a ${elementName} Egg in @OrganicDAO — one of the rarest in the game.\n\nHow many people will ever find this?\n\n#OrganicEaster #GoldenEggs #GenesisHatch`;
    } else {
      tweetText = `Found another Golden Egg in @OrganicDAO! That's ${totalFound}/10 🥚\n\n${element.emoji} ${elementName} Egg secured. These are RARE.\n\n#OrganicEaster #GoldenEggs`;
    }

    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    return NextResponse.json({
      data: egg,
      xp_awarded: 100,
      share_url: shareUrl,
      tweet_text: tweetText,
    }, { status: 201 });
  } catch (error) {
    logger.error('Egg claim route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
