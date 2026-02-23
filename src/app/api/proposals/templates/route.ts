import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProposalTemplateSchema } from '@/features/proposals/schemas';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

/**
 * GET /api/proposals/templates
 * List all active proposal templates. Public — no auth required.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('proposal_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error listing proposal templates:', error);
    return NextResponse.json({ error: 'Failed to list templates' }, { status: 500 });
  }
}

/**
 * POST /api/proposals/templates
 * Create a new proposal template. Admin/council only.
 */
export async function POST(request: NextRequest) {
  try {
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

    const parseResult = createProposalTemplateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('proposal_templates')
      .insert({
        ...parseResult.data,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('Error creating proposal template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
