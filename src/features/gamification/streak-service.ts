import type { SupabaseClient } from '@supabase/supabase-js';
import { awardXp } from './xp-service';
import { logger } from '@/lib/logger';

// ─── Streak Milestones ─────────────────────────────────────────────────

export interface StreakMilestone {
  days: number;
  xp_bonus: number;
  label: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 7, xp_bonus: 25, label: '1 Week Streak' },
  { days: 14, xp_bonus: 50, label: '2 Week Streak' },
  { days: 30, xp_bonus: 100, label: '1 Month Streak' },
  { days: 60, xp_bonus: 200, label: '2 Month Streak' },
  { days: 100, xp_bonus: 500, label: '100 Day Streak' },
];

export const MAX_STREAK_FREEZES = 3;

// ─── Check & Award Streak Milestones ───────────────────────────────────

/**
 * Check if the user's current streak has hit a new milestone.
 * Awards XP bonus and logs the milestone if not already claimed.
 */
export async function checkStreakMilestones(
  supabase: SupabaseClient,
  userId: string,
  currentStreak: number,
  lastClaimedMilestone: number
): Promise<{ milestoneClaimed: StreakMilestone | null }> {
  // Find the highest unclaimed milestone
  const unclaimed = STREAK_MILESTONES.filter(
    (m) => currentStreak >= m.days && m.days > lastClaimedMilestone
  );

  if (unclaimed.length === 0) {
    return { milestoneClaimed: null };
  }

  // Claim the highest one
  const milestone = unclaimed[unclaimed.length - 1];

  try {
    // Award XP
    await awardXp(supabase, {
      userId,
      eventType: 'streak_milestone',
      xpAmount: milestone.xp_bonus,
      sourceType: 'streak',
      sourceId: `${userId}_streak_${milestone.days}`,
      metadata: { milestone_days: milestone.days, label: milestone.label },
    });

    // Update claimed milestone
    await supabase
      .from('user_profiles')
      .update({ streak_milestone_claimed: milestone.days } as never)
      .eq('id', userId);

    // Log activity
    await supabase.from('activity_log').insert({
      actor_id: userId,
      event_type: 'streak_milestone' as any,
      subject_type: 'streak',
      subject_id: `${userId}_streak_${milestone.days}`,
      metadata: { days: milestone.days, xp_bonus: milestone.xp_bonus },
    });

    return { milestoneClaimed: milestone };
  } catch (error) {
    logger.error('Failed to award streak milestone', error);
    return { milestoneClaimed: null };
  }
}

// ─── Streak Freeze Logic ───────────────────────────────────────────────

/**
 * Award a streak freeze for completing all weekly quests.
 * Max 3 freezes stockpiled.
 */
export async function awardStreakFreeze(
  supabase: SupabaseClient,
  userId: string
): Promise<{ awarded: boolean; totalFreezes: number }> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('streak_freezes')
    .eq('id', userId)
    .single();

  const currentFreezes = Number((profile as Record<string, unknown> | null)?.streak_freezes ?? 0);

  if (currentFreezes >= MAX_STREAK_FREEZES) {
    return { awarded: false, totalFreezes: currentFreezes };
  }

  const newFreezes = currentFreezes + 1;

  await supabase
    .from('user_profiles')
    .update({ streak_freezes: newFreezes } as never)
    .eq('id', userId);

  await supabase.from('activity_log').insert({
    actor_id: userId,
    event_type: 'streak_freeze_earned' as any,
    subject_type: 'streak',
    subject_id: userId,
    metadata: { total_freezes: newFreezes },
  });

  return { awarded: true, totalFreezes: newFreezes };
}

/**
 * Use a streak freeze to preserve the streak on a missed day.
 * Called during the daily streak check when no activity is detected.
 */
export async function useStreakFreeze(
  supabase: SupabaseClient,
  userId: string
): Promise<{ used: boolean; remainingFreezes: number }> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('streak_freezes, current_streak')
    .eq('id', userId)
    .single();

  const p = profile as Record<string, unknown> | null;
  const currentFreezes = Number(p?.streak_freezes ?? 0);

  if (currentFreezes <= 0) {
    return { used: false, remainingFreezes: 0 };
  }

  const remainingFreezes = currentFreezes - 1;
  const today = new Date().toISOString().split('T')[0];

  await supabase
    .from('user_profiles')
    .update({
      streak_freezes: remainingFreezes,
      streak_freeze_used_at: today,
    } as never)
    .eq('id', userId);

  await supabase.from('activity_log').insert({
    actor_id: userId,
    event_type: 'streak_freeze_used' as any,
    subject_type: 'streak',
    subject_id: userId,
    metadata: { remaining_freezes: remainingFreezes, streak: Number(p?.current_streak ?? 0) },
  });

  return { used: true, remainingFreezes };
}

// ─── Streak Danger Check ───────────────────────────────────────────────

/**
 * Check if user's streak is at risk (no activity today and it's past the
 * danger threshold hour). Returns notification data if at risk.
 *
 * Intended to be called by a cron/scheduled job or client-side poll.
 */
export async function checkStreakDanger(
  supabase: SupabaseClient,
  userId: string,
  dangerHourUtc: number = 20 // 8 PM UTC default
): Promise<{
  atRisk: boolean;
  currentStreak: number;
  hasFreezes: boolean;
  message: string | null;
}> {
  const now = new Date();
  const currentHour = now.getUTCHours();

  if (currentHour < dangerHourUtc) {
    return { atRisk: false, currentStreak: 0, hasFreezes: false, message: null };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('current_streak, last_active_date, streak_freezes')
    .eq('id', userId)
    .single();

  if (!profile) {
    return { atRisk: false, currentStreak: 0, hasFreezes: false, message: null };
  }

  const p = profile as Record<string, unknown>;
  const currentStreak = Number(p.current_streak ?? 0);
  const lastActiveDate = p.last_active_date as string | null;
  const hasFreezes = Number(p.streak_freezes ?? 0) > 0;

  if (currentStreak === 0) {
    return { atRisk: false, currentStreak: 0, hasFreezes, message: null };
  }

  const today = now.toISOString().split('T')[0];

  if (lastActiveDate === today) {
    // Already active today, no risk
    return { atRisk: false, currentStreak, hasFreezes, message: null };
  }

  const message = `Your ${currentStreak}-day streak is at risk!${
    hasFreezes ? ' You have streak freezes available.' : ' Complete any activity to keep it going.'
  }`;

  return { atRisk: true, currentStreak, hasFreezes, message };
}
