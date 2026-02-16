import { z } from 'zod';

const notificationCategoryEnum = z.enum([
  'tasks',
  'proposals',
  'voting',
  'comments',
  'disputes',
  'system',
]);

export const notificationFiltersSchema = z.object({
  category: notificationCategoryEnum.optional(),
  unread: z.coerce.boolean().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const updatePreferenceSchema = z.object({
  category: notificationCategoryEnum,
  in_app: z.boolean().optional(),
  email: z.boolean().optional(),
});

export const followSchema = z.object({
  subject_type: z.enum(['task', 'proposal']),
  subject_id: z.string().uuid(),
});

export type NotificationFiltersInput = z.infer<typeof notificationFiltersSchema>;
export type UpdatePreferenceInput = z.infer<typeof updatePreferenceSchema>;
export type FollowInput = z.infer<typeof followSchema>;
