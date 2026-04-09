import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/parse-json-body';

const restrictSchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(['warn', 'restrict', 'ban', 'unrestrict']),
  reason: z.string().min(1).max(500),
});

const statusMap = {
  warn: 'warned',
  restrict: 'restricted',
  ban: 'banned',
  unrestrict: 'active',
} as const;

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null, role: null };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Admin only' }, { status: 403 }), user, role: null };
  }

  return { error: null, user, role: profile.role };
}

/**
 * POST /api/admin/users/restrict
 * Set restriction status on one or more users. Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { error: authErr, user } = await requireAdmin(supabase);
    if (authErr || !user) return authErr!;

    const parsedBody = await parseJsonBody<Record<string, unknown>>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const parsed = restrictSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { user_ids, action, reason } = parsed.data;
    const newStatus = statusMap[action];
    const isUnrestrict = action === 'unrestrict';

    const service = createServiceClient();

    // Update all targeted users
    const updatePayload: Record<string, unknown> = {
      restriction_status: newStatus,
      restriction_reason: isUnrestrict ? null : reason,
      restricted_at: isUnrestrict ? null : new Date().toISOString(),
      restricted_by: isUnrestrict ? null : user.id,
    };

    const { error: updateError } = await service
      .from('user_profiles')
      .update(updatePayload)
      .in('id', user_ids);

    if (updateError) {
      logger.error('User restriction update failed', updateError);
      return NextResponse.json({ error: 'Failed to update users' }, { status: 500 });
    }

    // Log to audit trail
    const { data: org } = await supabase
      .from('orgs')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (org) {
      const auditScope = isUnrestrict ? 'user_unrestriction' : 'user_restriction';
      const auditRows = user_ids.map((targetId) => ({
        org_id: org.id,
        actor_id: user.id,
        actor_role: 'admin' as const,
        reason,
        change_scope: auditScope,
        previous_payload: {},
        new_payload: { target_user_id: targetId, new_status: newStatus },
        metadata: { bulk: user_ids.length > 1, total_affected: user_ids.length },
      }));

      const { error: auditError } = await service
        .from('admin_config_audit_events')
        .insert(auditRows);

      if (auditError) {
        logger.error('Restriction audit insert error', auditError);
      }
    }

    return NextResponse.json({
      success: true,
      affected: user_ids.length,
      new_status: newStatus,
    });
  } catch (error) {
    logger.error('Admin restrict route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
