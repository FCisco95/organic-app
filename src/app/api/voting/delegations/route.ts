import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseJsonBody } from '@/lib/parse-json-body';
import { z } from 'zod';

const DELEGATION_COLUMNS = 'id, delegator_id, delegate_id, category, created_at, updated_at';
const DELEGATION_PROFILE_COLUMNS = 'id, name, email, organic_id, avatar_url';

type DelegationProfile = {
  id: string;
  name: string | null;
  email: string;
  organic_id: number | null;
  avatar_url: string | null;
};

const delegateSchema = z.object({
  delegate_id: z.string().uuid('Invalid delegate ID'),
  category: z
    .enum(['feature', 'governance', 'treasury', 'community', 'development'])
    .optional()
    .nullable(),
});

const revokeSchema = z.object({
  delegation_id: z.string().uuid('Invalid delegation ID'),
});

// GET - Fetch delegations for the current user
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const [outgoingResult, incomingResult] = await Promise.all([
      supabase
        .from('vote_delegations')
        .select(DELEGATION_COLUMNS)
        .eq('delegator_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('vote_delegations')
        .select(DELEGATION_COLUMNS)
        .eq('delegate_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    const outgoing = outgoingResult.data ?? [];
    const incoming = incomingResult.data ?? [];

    if (outgoingResult.error) {
      console.error('Error fetching outgoing delegations:', outgoingResult.error);
      return NextResponse.json({ error: 'Failed to fetch delegations' }, { status: 500 });
    }

    if (incomingResult.error) {
      console.error('Error fetching incoming delegations:', incomingResult.error);
      return NextResponse.json({ error: 'Failed to fetch delegations' }, { status: 500 });
    }

    const profileIds = [
      ...new Set([
        ...outgoing.map((delegation) => delegation.delegate_id),
        ...incoming.map((delegation) => delegation.delegator_id),
      ]),
    ];

    const profilesById = new Map<string, DelegationProfile>();
    if (profileIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select(DELEGATION_PROFILE_COLUMNS)
        .in('id', profileIds);

      if (profilesError) {
        console.error('Error fetching delegation profiles:', profilesError);
        return NextResponse.json({ error: 'Failed to fetch delegations' }, { status: 500 });
      }

      for (const profile of profiles ?? []) {
        profilesById.set(profile.id, profile);
      }
    }

    return NextResponse.json({
      outgoing: outgoing.map((delegation) => ({
        ...delegation,
        delegate: profilesById.get(delegation.delegate_id) ?? null,
      })),
      incoming: incoming.map((delegation) => ({
        ...delegation,
        delegator: profilesById.get(delegation.delegator_id) ?? null,
      })),
    });
  } catch (error) {
    console.error('Delegations GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a vote delegation
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user has member role at minimum
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, organic_id')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.role || !['member', 'council', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Must be a member to delegate' }, { status: 403 });
    }

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }
    const parsed = delegateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Cannot delegate to self
    if (parsed.data.delegate_id === user.id) {
      return NextResponse.json({ error: 'Cannot delegate to yourself' }, { status: 400 });
    }

    // Verify delegate exists and is a member
    const { data: delegate } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', parsed.data.delegate_id)
      .single();

    if (!delegate || !delegate.role || !['member', 'council', 'admin'].includes(delegate.role)) {
      return NextResponse.json(
        { error: 'Delegate must be an active member' },
        { status: 400 }
      );
    }

    // Upsert: if delegation for same category exists, update it
    const { data: delegation, error } = await supabase
      .from('vote_delegations')
      .upsert(
        {
          delegator_id: user.id,
          delegate_id: parsed.data.delegate_id,
          category: parsed.data.category || null,
        },
        {
          onConflict: 'unique_delegation',
        }
      )
      .select()
      .single();

    if (error) {
      // Handle unique constraint - the COALESCE-based constraint can't use onConflict directly
      // Instead, try delete + insert
      if (error.code === '23505') {
        const categoryValue = parsed.data.category || null;
        let deleteQuery = supabase
          .from('vote_delegations')
          .delete()
          .eq('delegator_id', user.id);

        if (categoryValue) {
          deleteQuery = deleteQuery.eq('category', categoryValue);
        } else {
          deleteQuery = deleteQuery.is('category', null);
        }

        await deleteQuery;

        const { data: newDelegation, error: retryError } = await supabase
          .from('vote_delegations')
          .insert({
            delegator_id: user.id,
            delegate_id: parsed.data.delegate_id,
            category: parsed.data.category || null,
          })
          .select()
          .single();

        if (retryError) {
          console.error('Error creating delegation (retry):', retryError);
          return NextResponse.json({ error: 'Failed to create delegation' }, { status: 500 });
        }

        return NextResponse.json({ delegation: newDelegation }, { status: 201 });
      }

      console.error('Error creating delegation:', error);
      return NextResponse.json({ error: 'Failed to create delegation' }, { status: 500 });
    }

    return NextResponse.json({ delegation }, { status: 201 });
  } catch (error) {
    console.error('Delegations POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Revoke a delegation
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }
    const parsed = revokeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('vote_delegations')
      .delete()
      .eq('id', parsed.data.delegation_id)
      .eq('delegator_id', user.id);

    if (error) {
      console.error('Error revoking delegation:', error);
      return NextResponse.json({ error: 'Failed to revoke delegation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delegations DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
