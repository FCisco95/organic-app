import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { followSchema } from '@/features/notifications/schemas';

// GET /api/notifications/follow?subject_type=task&subject_id=xxx — check if following
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectType = searchParams.get('subject_type');
    const subjectId = searchParams.get('subject_id');

    if (!subjectType || !subjectId) {
      return NextResponse.json({ error: 'Missing subject_type or subject_id' }, { status: 400 });
    }

    const { data } = await supabase
      .from('user_follows')
      .select('id')
      .eq('user_id', user.id)
      .eq('subject_type', subjectType)
      .eq('subject_id', subjectId)
      .maybeSingle();

    return NextResponse.json({ following: !!data });
  } catch (err) {
    console.error('Follow check API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notifications/follow — follow a task or proposal
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = followSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { subject_type, subject_id } = parsed.data;

    const { error } = await supabase.from('user_follows').upsert(
      {
        user_id: user.id,
        subject_type,
        subject_id,
      },
      { onConflict: 'user_id,subject_type,subject_id' }
    );

    if (error) {
      console.error('Follow error:', error);
      return NextResponse.json({ error: 'Failed to follow' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Follow API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications/follow — unfollow a task or proposal
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = followSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { subject_type, subject_id } = parsed.data;

    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('user_id', user.id)
      .eq('subject_type', subject_type)
      .eq('subject_id', subject_id);

    if (error) {
      console.error('Unfollow error:', error);
      return NextResponse.json({ error: 'Failed to unfollow' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unfollow API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
