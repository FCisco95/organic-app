import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/features/onboarding/types';
import type { OnboardingProgress, OnboardingStep } from '@/features/onboarding/types';

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

    // Fetch existing onboarding steps
    const { data: rows, error: fetchError } = await supabase
      .from('onboarding_steps')
      .select('step, completed_at')
      .eq('user_id', user.id);

    if (fetchError) {
      logger.error('Failed to fetch onboarding steps:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch onboarding steps' }, { status: 500 });
    }

    // Build a set of completed steps from DB
    const completedMap = new Map<string, string>();
    for (const row of rows ?? []) {
      completedMap.set(row.step, row.completed_at);
    }

    // Auto-backfill: check if user already has wallet/organic_id set
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('wallet_pubkey, organic_id')
      .eq('id', user.id)
      .maybeSingle();

    const backfillSteps: OnboardingStep[] = [];

    if (profile?.wallet_pubkey && !completedMap.has('connect_wallet')) {
      backfillSteps.push('connect_wallet');
    }
    if (profile?.organic_id && !completedMap.has('verify_token')) {
      backfillSteps.push('verify_token');
    }

    // Insert backfill rows
    if (backfillSteps.length > 0) {
      const insertRows = backfillSteps.map((step) => ({
        user_id: user.id,
        step,
      }));

      const { error: backfillError } = await supabase
        .from('onboarding_steps')
        .upsert(insertRows, { onConflict: 'user_id,step', ignoreDuplicates: true });

      if (!backfillError) {
        for (const step of backfillSteps) {
          completedMap.set(step, new Date().toISOString());
        }
      }
    }

    // Build response
    const steps = {} as OnboardingProgress;
    for (const step of ONBOARDING_STEPS) {
      const completedAt = completedMap.get(step) ?? null;
      steps[step] = {
        completed: completedAt !== null,
        completed_at: completedAt,
      };
    }

    const completedCount = completedMap.size;
    const allComplete = completedCount >= TOTAL_ONBOARDING_STEPS;

    return NextResponse.json({
      steps,
      all_complete: allComplete,
      completed_count: completedCount,
      total_steps: TOTAL_ONBOARDING_STEPS,
    });
  } catch (error) {
    logger.error('Onboarding steps GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
