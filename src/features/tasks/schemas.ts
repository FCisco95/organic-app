import { z } from 'zod';

// Task type enum
export const taskTypeSchema = z.enum(['development', 'content', 'design', 'custom']);
export const taskStatusSchema = z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']);
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const reviewStatusSchema = z.enum(['pending', 'approved', 'rejected', 'disputed']);

// Create task schema
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  task_type: taskTypeSchema.default('custom'),
  is_team_task: z.boolean().default(false),
  max_assignees: z.number().int().min(1).max(20).default(1),
  priority: taskPrioritySchema.default('medium'),
  base_points: z.number().int().min(0).max(10000).optional(),
  due_date: z.string().datetime().optional().nullable(),
  labels: z.array(z.string().max(50)).max(10).default([]),
  sprint_id: z.string().uuid().optional().nullable(),
  proposal_id: z.string().uuid().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// Update task schema
export const updateTaskSchema = createTaskSchema.partial().extend({
  status: taskStatusSchema.optional(),
  points: z.number().int().min(0).optional().nullable(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// Reach metrics schema for content submissions
export const reachMetricsSchema = z.object({
  views: z.number().int().min(0).optional(),
  likes: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  impressions: z.number().int().min(0).optional(),
  engagement_rate: z.number().min(0).max(100).optional(),
});

// Development submission schema
export const developmentSubmissionSchema = z.object({
  submission_type: z.literal('development'),
  pr_link: z
    .string()
    .url('Must be a valid URL')
    .refine(
      (url) =>
        url.includes('github.com') || url.includes('gitlab.com') || url.includes('bitbucket.org'),
      'Must be a GitHub, GitLab, or Bitbucket URL'
    ),
  description: z.string().max(2000, 'Description too long').optional(),
  testing_notes: z.string().max(2000, 'Testing notes too long').optional(),
});

// Content submission schema (base object for discriminated union)
export const contentSubmissionSchemaBase = z.object({
  submission_type: z.literal('content'),
  content_link: z.string().url('Must be a valid URL').optional(),
  content_text: z.string().max(10000, 'Content too long').optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  reach_metrics: reachMetricsSchema.optional(),
});

// Content submission schema with refinement (for standalone use)
export const contentSubmissionSchema = contentSubmissionSchemaBase.refine(
  (data) => data.content_link || data.content_text,
  'Either content link or content text is required'
);

// Design submission schema
export const designSubmissionSchema = z.object({
  submission_type: z.literal('design'),
  file_urls: z
    .array(z.string().url('Must be a valid URL'))
    .min(1, 'At least one file is required')
    .max(20, 'Maximum 20 files allowed'),
  description: z.string().max(2000, 'Description too long').optional(),
  revision_notes: z.string().max(2000, 'Revision notes too long').optional(),
});

// Custom submission schema
export const customSubmissionSchema = z.object({
  submission_type: z.literal('custom'),
  description: z.string().max(2000, 'Description too long').optional(),
  custom_fields: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

// Combined submission schema (discriminated union)
// Note: Uses contentSubmissionSchemaBase to work with discriminatedUnion (refine creates ZodEffects)
export const taskSubmissionSchema = z.discriminatedUnion('submission_type', [
  developmentSubmissionSchema,
  contentSubmissionSchemaBase,
  designSubmissionSchema,
  customSubmissionSchema,
]);

export type TaskSubmissionInput = z.infer<typeof taskSubmissionSchema>;

// Quality score schema (1-5 stars)
export const qualityScoreSchema = z.number().int().min(1).max(5);

// Review submission schema
export const reviewSubmissionSchema = z
  .object({
    quality_score: qualityScoreSchema,
    reviewer_notes: z.string().max(2000, 'Notes too long').optional(),
    action: z.enum(['approve', 'reject']),
    rejection_reason: z.string().max(1000, 'Rejection reason too long').optional(),
  })
  .refine((data) => data.action !== 'reject' || data.rejection_reason, {
    message: 'Rejection reason is required when rejecting',
    path: ['rejection_reason'],
  });

export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;

// Claim task schema
export const claimTaskSchema = z.object({
  task_id: z.string().uuid(),
});

export type ClaimTaskInput = z.infer<typeof claimTaskSchema>;

// Unclaim task schema
export const unclaimTaskSchema = z.object({
  task_id: z.string().uuid(),
});

export type UnclaimTaskInput = z.infer<typeof unclaimTaskSchema>;

// Task filters schema
export const taskFiltersSchema = z.object({
  status: taskStatusSchema.optional(),
  task_type: taskTypeSchema.optional(),
  priority: taskPrioritySchema.optional(),
  sprint_id: z.string().uuid().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  is_claimable: z.boolean().optional(),
  search: z.string().max(100).optional(),
  labels: z.array(z.string()).optional(),
});

export type TaskFilters = z.infer<typeof taskFiltersSchema>;
