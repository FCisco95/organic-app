import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProposalSchema } from '@/features/proposals/schemas';

/**
 * POST /api/proposals
 * Create a new proposal. Requires verified member (Organic ID).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile — check for Organic ID (verified member)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organic_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!profile.organic_id) {
      return NextResponse.json(
        { error: 'You must have an Organic ID to create proposals' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { status: submitStatus, ...fields } = body;
    const parseResult = createProposalSchema.safeParse(fields);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const input = parseResult.data;
    const proposalStatus = submitStatus === 'submitted' ? 'submitted' : 'draft';

    // Build legacy body from structured sections
    const bodyText = [
      input.summary,
      '',
      '## Problem / Motivation',
      input.motivation,
      '',
      '## Proposed Solution',
      input.solution,
      ...(input.budget ? ['', '## Budget / Resources', input.budget] : []),
      ...(input.timeline ? ['', '## Timeline', input.timeline] : []),
    ].join('\n');

    const { data, error } = await supabase
      .from('proposals')
      .insert({
        title: input.title,
        body: bodyText,
        category: input.category,
        summary: input.summary,
        motivation: input.motivation,
        solution: input.solution,
        budget: input.budget || null,
        timeline: input.timeline || null,
        status: proposalStatus,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating proposal:', error);
    return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 });
  }
}
