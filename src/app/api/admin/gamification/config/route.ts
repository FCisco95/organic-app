import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { gamificationConfigSchema } from '@/features/gamification/schemas';
import { z } from 'zod';

const patchSchema = gamificationConfigSchema.extend({
  reason: z.string().trim().min(8).max(500),
});

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { reason, ...configUpdates } = parsed.data;

    // Get current config
    const { data: org } = await supabase
      .from('orgs')
      .select('id, gamification_config')
      .limit(1)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const currentConfig = (org.gamification_config ?? {}) as Record<string, unknown>;
    const newConfig = { ...currentConfig, ...configUpdates };

    const { error: updateError } = await supabase
      .from('orgs')
      .update({ gamification_config: newConfig })
      .eq('id', org.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log audit event (non-critical)
    try {
      await supabase.from('activity_log').insert({
        actor_id: user.id,
        event_type: 'settings_updated' as never,
        subject_type: 'org',
        subject_id: org.id,
        metadata: { section: 'gamification', reason, changes: configUpdates },
      });
    } catch {
      // Audit log failure shouldn't block the response
    }

    return NextResponse.json({ success: true, config: newConfig });
  } catch (error) {
    logger.error('Admin gamification config PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
