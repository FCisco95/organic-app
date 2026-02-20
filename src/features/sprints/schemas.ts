import { z } from 'zod';

export const sprintStatusSchema = z.enum([
  'planning',
  'active',
  'review',
  'dispute_window',
  'settlement',
  'completed',
]);

export const createSprintSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  start_at: z.string().min(1, 'Start date is required'),
  end_at: z.string().min(1, 'End date is required'),
  goal: z.string().max(500).optional(),
  capacity_points: z.number().int().min(0).optional().nullable(),
});

export type CreateSprintInput = z.infer<typeof createSprintSchema>;

export const updateSprintSchema = createSprintSchema.partial();

export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;

export const completeSprintSchema = z
  .object({
    incomplete_action: z.enum(['backlog', 'next_sprint']).optional(),
    next_sprint_id: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.incomplete_action === 'next_sprint' && !value.next_sprint_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['next_sprint_id'],
        message: 'next_sprint_id is required when incomplete_action is next_sprint',
      });
    }
  });

export type CompleteSprintInput = z.infer<typeof completeSprintSchema>;
