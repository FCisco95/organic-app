import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appealDisputeSchema } from '@/features/disputes/schemas';
import { DEFAULT_DISPUTE_CONFIG } from '@/features/disputes/types';
import type { DisputeConfig } from '@/features/disputes/types';

/**
 * POST /api/disputes/[id]/appeal
 * Disputant appeals a council ruling to admin.
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

    // Only disputant can appeal
    if (dispute.disputant_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the disputant can appeal' },
        { status: 403 }
      );
    }

    // Must be resolved at council tier (not already at admin tier)
    if (dispute.tier === 'admin') {
      return NextResponse.json(
        { error: 'Admin rulings are final and cannot be appealed' },
        { status: 400 }
      );
    }

    // Must be resolved or dismissed (not withdrawn/mediated)
    if (dispute.status !== 'resolved' && dispute.status !== 'dismissed') {
      return NextResponse.json(
        { error: 'Can only appeal resolved or dismissed disputes' },
        { status: 400 }
      );
    }

    // Check appeal deadline
    const { data: org } = await supabase
      .from('orgs')
      .select('gamification_config')
      .limit(1)
      .single();

    const config: DisputeConfig = {
      ...DEFAULT_DISPUTE_CONFIG,
      ...(org?.gamification_config as Partial<DisputeConfig>),
    };

    if (dispute.resolved_at) {
      const resolvedAt = new Date(dispute.resolved_at);
      const appealDeadline = new Date(
        resolvedAt.getTime() + config.dispute_appeal_hours * 60 * 60 * 1000
      );

      if (new Date() > appealDeadline) {
        return NextResponse.json(
          { error: `Appeal window has expired (${config.dispute_appeal_hours}h after resolution)` },
          { status: 400 }
        );
      }
    }

    // Parse input
    const body = await request.json();
    const parseResult = appealDisputeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // Calculate new appeal deadline
    const appealDeadlineDate = new Date(
      Date.now() + config.dispute_appeal_hours * 60 * 60 * 1000
    );

    // Update dispute to appealed status
    const { data: updated, error: updateError } = await supabase
      .from('disputes')
      .update({
        status: 'appealed',
        tier: 'admin',
        arbitrator_id: null, // Clear council arbitrator
        resolution: null, // Clear previous resolution
        resolution_notes: null,
        resolved_at: null,
        appeal_deadline: appealDeadlineDate.toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Store appeal reason as a dispute comment
    await supabase.from('dispute_comments').insert({
      dispute_id: id,
      user_id: user.id,
      content: `**Appeal reason:** ${parseResult.data.appeal_reason}`,
      visibility: 'arbitrator',
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error appealing dispute:', error);
    return NextResponse.json(
      { error: 'Failed to appeal dispute' },
      { status: 500 }
    );
  }
}
