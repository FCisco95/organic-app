import { z } from 'zod';

export const activityEventSchema = z.object({
  id: z.string().uuid(),
  event_type: z.enum([
    'task_created',
    'task_status_changed',
    'task_completed',
    'task_deleted',
    'submission_created',
    'submission_reviewed',
    'comment_created',
    'comment_deleted',
    'proposal_created',
    'proposal_status_changed',
    'proposal_deleted',
    'vote_cast',
    'voting_reminder_24h',
    'voting_reminder_1h',
  ]),
  actor_id: z.string().uuid().nullable(),
  subject_type: z.string(),
  subject_id: z.string().uuid(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string(),
  actor: z
    .object({
      id: z.string().uuid(),
      name: z.string().nullable(),
      organic_id: z.number().nullable(),
      avatar_url: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

export const dashboardStatsSchema = z.object({
  total_users: z.number(),
  org_holders: z.number(),
  tasks_completed: z.number(),
  active_proposals: z.number(),
  org_price: z.number().nullable(),
});

export const activityFeedResponseSchema = z.object({
  events: z.array(activityEventSchema),
  has_more: z.boolean(),
});

export const statsResponseSchema = z.object({
  stats: dashboardStatsSchema,
});
