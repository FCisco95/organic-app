import { NextResponse } from 'next/server';
import { createClient, createAnonClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';
import {
  submitTestimonialSchema,
  SUBMISSION_COOLDOWN_DAYS,
} from '@/features/testimonials/schemas';
import type { ApprovedTestimonial } from '@/features/testimonials/types';

export const dynamic = 'force-dynamic';

const APPROVED_LIMIT = 10;

interface TestimonialRow {
  id: string;
  rating: number;
  quote: string;
  approved_at: string | null;
  created_at: string | null;
  member_id: string;
  status: string;
}

export async function GET() {
  try {
    const supabase = createAnonClient();
    const { data, error } = (await supabase
      .from('testimonials' as never)
      .select('id, rating, quote, approved_at, member_id')
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(APPROVED_LIMIT)) as unknown as {
      data: Array<{
        id: string;
        rating: number;
        quote: string;
        approved_at: string | null;
        member_id: string;
      }> | null;
      error: { message: string } | null;
    };

    if (error) {
      logger.error('testimonials GET failed', { error });
      return NextResponse.json(
        { data: null, error: 'Internal server error' },
        { status: 500 }
      );
    }

    const memberIds = Array.from(new Set((data ?? []).map((row) => row.member_id)));
    const memberMap = new Map<
      string,
      { id: string; name: string | null; organic_id: number | null; avatar_url: string | null }
    >();
    if (memberIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, name, organic_id, avatar_url')
        .in('id', memberIds);
      for (const p of profiles ?? []) memberMap.set(p.id, p);
    }

    const testimonials: ApprovedTestimonial[] = (data ?? []).map((row) => {
      const member = memberMap.get(row.member_id);
      return {
        id: row.id,
        rating: row.rating,
        quote: row.quote,
        approvedAt: row.approved_at,
        member: {
          id: row.member_id,
          name: member?.name ?? null,
          organicId: member?.organic_id ?? null,
          avatarUrl: member?.avatar_url ?? null,
        },
      };
    });

    return NextResponse.json({ data: testimonials, error: null });
  } catch (error) {
    logger.error('testimonials GET unexpected', { error: String(error) });
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ data: null, error: 'Not authenticated' }, { status: 401 });
    }

    const { data: bodyRaw, error: jsonErr } = await parseJsonBody(request);
    if (jsonErr) {
      return NextResponse.json({ data: null, error: jsonErr }, { status: 400 });
    }
    const parsed = submitTestimonialSchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Rate limit: 1 per member per 30 days
    const cutoff = new Date(
      Date.now() - SUBMISSION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: recent } = (await supabase
      .from('testimonials' as never)
      .select('id, created_at')
      .eq('member_id', user.id)
      .gte('created_at', cutoff)
      .limit(1)) as unknown as {
      data: Array<{ id: string; created_at: string | null }> | null;
      error: { message: string } | null;
    };

    if ((recent?.length ?? 0) > 0) {
      return NextResponse.json(
        {
          data: null,
          error: 'You can only submit one testimonial every 30 days.',
        },
        { status: 429 }
      );
    }

    const { error: insertErr } = await supabase
      .from('testimonials' as never)
      .insert({
        member_id: user.id,
        rating: parsed.data.rating,
        quote: parsed.data.quote,
        status: 'pending',
      } as never);

    if (insertErr) {
      logger.error('testimonials POST insert failed', { error: insertErr });
      return NextResponse.json(
        { data: null, error: 'Could not submit testimonial' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { ok: true }, error: null }, { status: 201 });
  } catch (error) {
    logger.error('testimonials POST unexpected', { error: String(error) });
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
