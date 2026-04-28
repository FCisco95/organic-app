import { z } from 'zod';

export const submitTestimonialSchema = z.object({
  rating: z.number().int().min(1).max(5),
  quote: z.string().trim().min(10).max(500),
});

export const adminActionSchema = z.object({
  testimonialId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
});

export type SubmitTestimonialBody = z.infer<typeof submitTestimonialSchema>;
export type AdminActionBody = z.infer<typeof adminActionSchema>;

export const SUBMISSION_COOLDOWN_DAYS = 30;
export const APPROVAL_POINTS = 50;
