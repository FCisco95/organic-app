import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user to verify they're authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch all members with Organic IDs (eligible to be assigned tasks)
    const { data: assignees, error } = await supabase
      .from('user_profiles')
      .select('id, email, organic_id, role')
      .not('organic_id', 'is', null)
      .in('role', ['member', 'council', 'admin'])
      .order('organic_id', { ascending: true });

    if (error) {
      console.error('Error fetching assignees:', error);
      return NextResponse.json({ error: 'Failed to fetch assignees' }, { status: 500 });
    }

    return NextResponse.json({ assignees });
  } catch (error: any) {
    console.error('Error in assignees route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
