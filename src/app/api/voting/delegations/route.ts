import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

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

    // Delegations I've made (who I delegated to)
    const { data: outgoing, error: outError } = await supabase
      .from('vote_delegations')
      .select(
        `
        id,
        delegator_id,
        delegate_id,
        category,
        created_at,
        delegate:user_profiles!vote_delegations_delegate_id_fkey(
          id, name, email, organic_id, avatar_url
        )
      `
      )
      .eq('delegator_id', user.id)
      .order('created_at', { ascending: false });

    if (outError) {
      console.error('Error fetching outgoing delegations:', outError);
      return NextResponse.json({ error: 'Failed to fetch delegations' }, { status: 500 });
    }

    // Delegations to me (who delegated to me)
    const { data: incoming, error: inError } = await supabase
      .from('vote_delegations')
      .select(
        `
        id,
        delegator_id,
        delegate_id,
        category,
        created_at,
        delegator:user_profiles!vote_delegations_delegator_id_fkey(
          id, name, email, organic_id, avatar_url
        )
      `
      )
      .eq('delegate_id', user.id)
      .order('created_at', { ascending: false });

    if (inError) {
      console.error('Error fetching incoming delegations:', inError);
      return NextResponse.json({ error: 'Failed to fetch delegations' }, { status: 500 });
    }

    return NextResponse.json({
      outgoing: outgoing ?? [],
      incoming: incoming ?? [],
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

    const body = await request.json();
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

    const body = await request.json();
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
