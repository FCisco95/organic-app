import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { onboardingStepSchema, completeStepBodySchema } from '@/features/onboarding/schemas';
import { TOTAL_ONBOARDING_STEPS } from '@/features/onboarding/types';

const XP_PER_STEP = 25;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ step: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Validate step param
    const { step: stepParam } = await params;
    const stepResult = onboardingStepSchema.safeParse(stepParam);
    if (!stepResult.success) {
      return NextResponse.json(
        { error: 'Invalid step. Must be one of: connect_wallet, verify_token, pick_task, join_sprint' },
        { status: 400 }
      );
    }
    const step = stepResult.data;

    // Parse body
    const body = await request.json().catch(() => ({}));
    const bodyResult = completeStepBodySchema.safeParse(body);
    if (!bodyResult.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { task_id, sprint_id } = bodyResult.data;

    // Fetch profile for validation
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('wallet_pubkey, organic_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Per-step validation
    switch (step) {
      case 'connect_wallet': {
        if (!profile.wallet_pubkey) {
          return NextResponse.json(
            { error: 'Wallet not connected. Link a wallet first.' },
            { status: 400 }
          );
        }
        break;
      }
      case 'verify_token': {
        if (!profile.organic_id) {
          return NextResponse.json(
            { error: 'Token not verified. Get your Organic ID first.' },
            { status: 400 }
          );
        }
        break;
      }
      case 'pick_task': {
        if (!task_id) {
          return NextResponse.json(
            { error: 'task_id is required for pick_task step' },
            { status: 400 }
          );
        }
        // Verify user is assigned to this task
        const { data: assignee } = await supabase
          .from('task_assignees')
          .select('id')
          .eq('task_id', task_id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!assignee) {
          return NextResponse.json(
            { error: 'You must be assigned to this task' },
            { status: 400 }
          );
        }
        break;
      }
      case 'join_sprint': {
        if (!sprint_id) {
          return NextResponse.json(
            { error: 'sprint_id is required for join_sprint step' },
            { status: 400 }
          );
        }
        // Verify user has a task in this sprint
        const { data: sprintTask } = await supabase
          .from('tasks')
          .select('id')
          .eq('sprint_id', sprint_id)
          .eq('assignee_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!sprintTask) {
          return NextResponse.json(
            { error: 'You must have a task assigned in this sprint' },
            { status: 400 }
          );
        }
        break;
      }
    }

    // Use service client for writes that bypass RLS
    const serviceSupabase = createServiceClient();

    // Upsert onboarding step (idempotent)
    const { error: upsertError } = await serviceSupabase
      .from('onboarding_steps')
      .upsert(
        { user_id: user.id, step },
        { onConflict: 'user_id,step', ignoreDuplicates: true }
      );

    if (upsertError) {
      logger.error('Failed to upsert onboarding step:', upsertError);
      return NextResponse.json({ error: 'Failed to save step' }, { status: 500 });
    }

    // Check if this is a new completion (for XP award)
    // We check the count of existing steps before this upsert
    let xpAwarded = 0;

    // Award XP via xp_events insert (idempotent check: only award if no existing event for this step)
    const { data: existingXp } = await serviceSupabase
      .from('xp_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_type', 'onboarding_step')
      .eq('source_type', step)
      .maybeSingle();

    if (!existingXp) {
      const { error: xpError } = await serviceSupabase.from('xp_events').insert({
        user_id: user.id,
        event_type: 'onboarding_step',
        source_type: step,
        xp_amount: XP_PER_STEP,
        metadata: { step, source: 'onboarding_wizard' },
      });

      if (!xpError) {
        xpAwarded = XP_PER_STEP;

        // Increment xp_total on profile
        const { data: currentProfile } = await serviceSupabase
          .from('user_profiles')
          .select('xp_total')
          .eq('id', user.id)
          .single();

        if (currentProfile) {
          await serviceSupabase
            .from('user_profiles')
            .update({ xp_total: currentProfile.xp_total + XP_PER_STEP })
            .eq('id', user.id);
        }
      }
    }

    // Check if all steps are now complete
    const { count } = await serviceSupabase
      .from('onboarding_steps')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const allComplete = (count ?? 0) >= TOTAL_ONBOARDING_STEPS;

    // If all complete, set the denormalized flag
    if (allComplete) {
      await serviceSupabase
        .from('user_profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    return NextResponse.json({
      success: true,
      step,
      xp_awarded: xpAwarded,
      all_complete: allComplete,
    });
  } catch (error) {
    logger.error('Onboarding step complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
