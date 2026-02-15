import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mediateDisputeSchema } from '@/features/disputes/schemas';

/**
 * POST /api/disputes/[id]/mediate
 * Both parties agree to a mediated resolution.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load dispute
    const { data: dispute, error: fetchError } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Only disputant or reviewer can propose mediation
    if (dispute.disputant_id !== user.id && dispute.reviewer_id !== user.id) {
      return NextResponse.json(
        { error: 'Only dispute parties can mediate' },
        { status: 403 }
      );
    }

    // Check dispute is in a mediatable state
    const mediatableStatuses = ['open', 'mediation', 'awaiting_response'];
    if (!mediatableStatuses.includes(dispute.status)) {
      return NextResponse.json(
        { error: 'Dispute is not in a state that allows mediation' },
        { status: 400 }
      );
    }

    // Check mediation deadline if applicable
    if (dispute.mediation_deadline && new Date() > new Date(dispute.mediation_deadline)) {
      return NextResponse.json(
        { error: 'Mediation window has expired' },
        { status: 400 }
      );
    }

    // Parse input
    const body = await request.json();
    const parseResult = mediateDisputeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // Mark dispute as mediated
    const { data: updated, error: updateError } = await supabase
      .from('disputes')
      .update({
        status: 'mediated',
        resolution_notes: parseResult.data.agreed_outcome,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Record the mediation agreement as a comment
    await supabase.from('dispute_comments').insert({
      dispute_id: id,
      user_id: user.id,
      content: `**Mediation agreement:** ${parseResult.data.agreed_outcome}`,
      visibility: 'parties_only',
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error mediating dispute:', error);
    return NextResponse.json(
      { error: 'Failed to mediate dispute' },
      { status: 500 }
    );
  }
}
