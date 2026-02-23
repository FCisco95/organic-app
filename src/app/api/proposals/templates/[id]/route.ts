import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateProposalTemplateSchema } from '@/features/proposals/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/proposals/templates/[id]
 * Fetch a single proposal template. Public.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('proposal_templates')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error fetching proposal template:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

/**
 * PATCH /api/proposals/templates/[id]
 * Update a proposal template. Admin/council only.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.role || !['admin', 'council'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: admin or council role required' },
        { status: 403 }
      );
    }

    // Parse body
    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }

    const parseResult = updateProposalTemplateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('proposal_templates')
      .update(parseResult.data)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error updating proposal template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

/**
 * DELETE /api/proposals/templates/[id]
 * Soft-delete a proposal template (set is_active = false). Admin/council only.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.role || !['admin', 'council'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: admin or council role required' },
        { status: 403 }
      );
    }

    // Soft delete
    const { data, error } = await supabase
      .from('proposal_templates')
      .update({ is_active: false })
      .eq('id', id)
      .eq('is_active', true)
      .select('id')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Template deleted' });
  } catch (error) {
    logger.error('Error deleting proposal template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
