import { z } from 'zod';
import { ONBOARDING_STEPS } from './types';

export const onboardingStepSchema = z.enum(ONBOARDING_STEPS);

export const completeStepBodySchema = z.object({
  task_id: z.string().uuid().optional(),
  sprint_id: z.string().uuid().optional(),
});

export const onboardingStepStatusSchema = z.object({
  completed: z.boolean(),
  completed_at: z.string().nullable(),
});

export const onboardingStateSchema = z.object({
  steps: z.record(onboardingStepSchema, onboardingStepStatusSchema),
  all_complete: z.boolean(),
  completed_count: z.number().int().nonnegative(),
  total_steps: z.number().int().positive(),
});

export type CompleteStepBody = z.infer<typeof completeStepBodySchema>;
