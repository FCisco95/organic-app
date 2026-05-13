import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import { adminActionSchema, APPROVAL_POINTS } from '@/features/testimonials/schemas';
import { awardXp } from '@/features/gamification/xp-service';
import type { PendingTestimonial } from '@/features/testimonials/types';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['admin', 'council'];

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, status: 401, error: 'Not authenticated' };
  }
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.role || !ADMIN_ROLES.includes(profile.role)) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }
  return { ok: true as const, userId: user.id, role: profile.role };
}

export async function GET(_request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ data: null, error: auth.error }, { status: auth.status });
  }

  const service = createServiceClient();
  const { data, error } = (await service
    .from('testimonials' as never)
    .select('id, rating, quote, status, member_id, created_at, approved_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })) as unknown as {
    data: Array<{
      id: string;
      rating: number;
      quote: string;
      status: string;
      member_id: string;
      created_at: string | null;
      approved_at: string | null;
    }> | null;
    error: { message: string } | null;
  };

  if (error) {
    logger.error('testimonials admin GET failed', { error });
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    );
  }

  const memberIds = Array.from(new Set((data ?? []).map((r) => r.member_id)));
  const memberMap = new Map<
    string,
    { id: string; name: string | null; organic_id: number | null; avatar_url: string | null }
  >();
  if (memberIds.length > 0) {
    const { data: profiles } = await service
      .from('user_profiles')
      .select('id, name, organic_id, avatar_url')
      .in('id', memberIds);
    for (const p of profiles ?? []) memberMap.set(p.id, p);
  }

  const result: PendingTestimonial[] = (data ?? []).map((row) => {
    const member = memberMap.get(row.member_id);
    return {
      id: row.id,
      rating: row.rating,
      quote: row.quote,
      approvedAt: row.approved_at,
      createdAt: row.created_at ?? new Date().toISOString(),
      member: {
        id: row.member_id,
        name: member?.name ?? null,
        organicId: member?.organic_id ?? null,
        avatarUrl: member?.avatar_url ?? null,
      },
    };
  });

  return NextResponse.json({ data: result, error: null });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ data: null, error: auth.error }, { status: auth.status });
  }

  const { data: bodyRaw, error: jsonErr } = await parseJsonBody(request);
  if (jsonErr) {
    return NextResponse.json({ data: null, error: jsonErr }, { status: 400 });
  }
  const parsed = adminActionSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: 'Invalid input', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  const { data: testimonial, error: lookupErr } = (await service
    .from('testimonials' as never)
    .select('id, member_id, status')
    .eq('id', parsed.data.testimonialId)
    .maybeSingle()) as unknown as {
    data: { id: string; member_id: string; status: string } | null;
    error: { message: string } | null;
  };

  if (lookupErr || !testimonial) {
    return NextResponse.json(
      { data: null, error: 'Testimonial not found' },
      { status: 404 }
    );
  }

  if (testimonial.status !== 'pending') {
    return NextResponse.json(
      { data: null, error: 'This testimonial has already been reviewed' },
      { status: 409 }
    );
  }

  if (parsed.data.action === 'reject') {
    const { error: updateErr } = await service
      .from('testimonials' as never)
      .update({ status: 'rejected' } as never)
      .eq('id', testimonial.id);

    if (updateErr) {
      logger.error('testimonials admin reject failed', { error: updateErr });
      return NextResponse.json(
        { data: null, error: 'Could not reject' },
        { status: 500 }
      );
    }
    return NextResponse.json({ data: { ok: true }, error: null });
  }

  // Approve path: update status, award XP, emit notification.
  const nowIso = new Date().toISOString();
  const { error: updateErr } = await service
    .from('testimonials' as never)
    .update({
      status: 'approved',
      approved_by: auth.userId,
      approved_at: nowIso,
      points_awarded: APPROVAL_POINTS,
    } as never)
    .eq('id', testimonial.id);

  if (updateErr) {
    logger.error('testimonials admin approve failed', { error: updateErr });
    return NextResponse.json({ data: null, error: 'Could not approve' }, { status: 500 });
  }

  // Award XP via existing reputation service. Don't fail the request if XP fails.
  try {
    await awardXp(service, {
      userId: testimonial.member_id,
      eventType: 'testimonial_approved',
      xpAmount: APPROVAL_POINTS,
      sourceType: 'testimonial',
      sourceId: testimonial.id,
    });
  } catch (error) {
    logger.warn('testimonials approve: XP award failed', {
      testimonialId: testimonial.id,
      error: String(error),
    });
  }

  // Insert notification. Best-effort — don't fail the request if it errors.
  try {
    await service.from('notifications').insert({
      user_id: testimonial.member_id,
      actor_id: auth.userId,
      category: 'system',
      event_type: 'testimonial_approved' as never,
      subject_type: 'testimonial',
      subject_id: testimonial.id,
      metadata: { points_awarded: APPROVAL_POINTS },
    });
  } catch (error) {
    logger.warn('testimonials approve: notification failed', {
      testimonialId: testimonial.id,
      error: String(error),
    });
  }

  return NextResponse.json({ data: { ok: true }, error: null });
}
