import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { applyUserRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { xpEggClaimSchema } from '@/features/easter/schemas';
import { getEggElement } from '@/features/easter/elements';
import { awardXp } from '@/features/gamification/xp-service';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Rate limit: 1 claim per second
    const rateLimited = await applyUserRateLimit(user.id, 'xp-egg-claim', {
      limit: 1,
      windowMs: 1_000,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const parsed = xpEggClaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    // Atomic claim: delete the pending row and return it
    const { data: pendingRaw, error: deleteError } = await supabase
      .from('xp_egg_pending' as any)
      .delete()
      .eq('id', token)
      .eq('user_id', user.id)
      .select()
      .single();

    const pending = pendingRaw as any;

    if (deleteError || !pending) {
      return NextResponse.json(
        { error: 'Egg not found or already claimed' },
        { status: 404 }
      );
    }

    // Check if token is stale (> 5 minutes)
    const createdAt = new Date(pending.created_at as string);
    if (Date.now() - createdAt.getTime() > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Egg expired' }, { status: 410 });
    }

    const isShiny = pending.is_shiny as boolean;
    const xpAmount = pending.xp_amount as number;

    if (isShiny && pending.egg_number) {
      // Shiny = golden egg discovery
      const eggNumber = pending.egg_number as number;
      const element = getEggElement(eggNumber);

      if (element) {
        // Insert golden egg (ignore if already found — race condition safety)
        const { data: eggRaw } = await supabase
          .from('golden_eggs' as any)
          .insert({
            user_id: user.id,
            egg_number: eggNumber,
            element: element.element,
            found_on_page: 'xp-egg-shiny',
          })
          .select()
          .single();

        const egg = eggRaw as any;

        if (egg) {
          const service = createServiceClient();
    await awardXp(service as any, {
            userId: user.id,
            eventType: 'egg_found',
            xpAmount: 100,
            sourceType: 'golden_egg',
            sourceId: egg.id as string,
            metadata: { egg_number: eggNumber, element: element.element, source: 'xp_egg_shiny' },
          });

          // Reset luck page loads
          await supabase
            .from('egg_hunt_luck' as any)
            .upsert({
              user_id: user.id,
              page_loads_since_last_find: 0,
              last_calculated_at: new Date().toISOString(),
            });
        }

        const elementName = element.element.charAt(0).toUpperCase() + element.element.slice(1);
        const tweetText = `I found a SHINY ${elementName} Egg while browsing @OrganicDAO! ${element.emoji}\n\nKeep it... it will bring good fortune.\n\n#OrganicEaster #GoldenEggs`;
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

        return NextResponse.json({
          xp_amount: 100,
          is_shiny: true,
          egg_number: eggNumber,
          element: element.element,
          share_url: shareUrl,
          tweet_text: tweetText,
        });
      }
    }

    // Regular XP egg — award XP
    const service = createServiceClient();
    await awardXp(service as any, {
      userId: user.id,
      eventType: 'xp_egg_found',
      xpAmount: xpAmount,
      sourceType: 'xp_egg',
      sourceId: token,
      metadata: { xp_amount: xpAmount },
    });

    // Opportunistic cleanup: delete stale pending rows (> 5 min old)
    supabase
      .from('xp_egg_pending' as any)
      .delete()
      .eq('user_id', user.id)
      .lt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .then(() => {});

    return NextResponse.json({
      xp_amount: xpAmount,
      is_shiny: false,
    });
  } catch (error) {
    logger.error('XP egg claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
