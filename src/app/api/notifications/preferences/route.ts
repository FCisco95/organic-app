import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updatePreferenceSchema } from '@/features/notifications/schemas';
import type { NotificationCategory } from '@/features/notifications/types';

const ALL_CATEGORIES: NotificationCategory[] = [
  'tasks',
  'proposals',
  'voting',
  'comments',
  'system',
];

// GET /api/notifications/preferences — get user preferences (seed defaults if missing)
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch existing preferences
    const { data: existing, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Preferences query error:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    const existingCategories = new Set((existing ?? []).map((p) => p.category));
    const missing = ALL_CATEGORIES.filter((c) => !existingCategories.has(c));

    // Seed missing categories with defaults (all enabled)
    if (missing.length > 0) {
      const rows = missing.map((category) => ({
        user_id: user.id,
        category,
        in_app: true,
        email: true,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('notification_preferences')
        .insert(rows)
        .select();

      if (insertError) {
        console.error('Seed preferences error:', insertError);
      }

      return NextResponse.json({
        preferences: [...(existing ?? []), ...(inserted ?? [])],
      });
    }

    return NextResponse.json({ preferences: existing ?? [] });
  } catch (err) {
    console.error('Preferences API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/notifications/preferences — update a single category preference
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updatePreferenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { category, in_app, email } = parsed.data;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (in_app !== undefined) updateData.in_app = in_app;
    if (email !== undefined) updateData.email = email;

    // Upsert: update if exists, insert if not
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          category,
          in_app: in_app ?? true,
          email: email ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,category' }
      )
      .select()
      .single();

    if (error) {
      console.error('Update preference error:', error);
      return NextResponse.json({ error: 'Failed to update preference' }, { status: 500 });
    }

    return NextResponse.json({ preference: data });
  } catch (err) {
    console.error('Update preference API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
