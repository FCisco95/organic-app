import { z } from 'zod';

export const dailyTaskProgressSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  task_key: z.string(),
  progress: z.number().int().min(0),
  target: z.number().int().min(1),
  completed: z.boolean(),
  completed_at: z.string().nullable(),
  date: z.string(),
  xp_awarded: z.number().int(),
  points_awarded: z.number().int(),
});

export type DailyTaskProgress = z.infer<typeof dailyTaskProgressSchema>;

export const loginStreakSchema = z.object({
  user_id: z.string().uuid(),
  current_streak: z.number().int().min(0),
  longest_streak: z.number().int().min(0),
  last_login_date: z.string().nullable(),
  updated_at: z.string(),
});

export type LoginStreak = z.infer<typeof loginStreakSchema>;

export const trackTaskSchema = z.object({
  task_key: z.string().min(1).max(100),
});
