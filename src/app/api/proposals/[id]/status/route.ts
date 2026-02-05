import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const statusChangeSchema = z.object({
  status: z.enum(['approved', 'rejected', 'voting']),
});

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/proposals/[id]/status
 * Update proposal status. Admin/council only.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: proposalId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin/council role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!profile.role || !['admin', 'council'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: admin or council role required' }, { status: 403 });
    }

    // Parse request
    const body = await request.json();
    const parseResult = statusChangeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { status: newStatus } = parseResult.data;

    // Fetch current proposal to validate transition
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('status')
      .eq('id', proposalId)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      submitted: ['approved', 'rejected', 'voting'],
      voting: ['approved', 'rejected'],
      approved: ['voting'],
    };

    const allowed = validTransitions[proposal.status ?? ''] || [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from "${proposal.status}" to "${newStatus}"`,
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('proposals')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', proposalId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating proposal status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
