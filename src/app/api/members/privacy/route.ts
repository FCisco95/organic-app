import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updatePrivacySchema } from '@/features/members/schemas';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updatePrivacySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ profile_visible: parsed.data.profile_visible })
      .eq('id', user.id);

    if (error) {
      console.error('Privacy update error:', error);
      return NextResponse.json({ error: 'Failed to update privacy' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Privacy API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
