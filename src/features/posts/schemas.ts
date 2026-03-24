import { z } from 'zod';
import { commentBodySchema } from '@/lib/schemas/common';

export const postTypeSchema = z.enum(['text', 'thread', 'announcement', 'link_share']);
export const postSortSchema = z.enum(['new', 'popular', 'top_week']);

export const listPostsQuerySchema = z.object({
  sort: postSortSchema.optional().default('new'),
  search: z.string().trim().max(120).optional(),
  type: postTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const createPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be under 200 characters'),
  body: z
    .string()
    .trim()
    .min(1, 'Post body is required')
    .max(10000, 'Post body must be under 10000 characters'),
  post_type: postTypeSchema.optional().default('text'),
  tags: z.array(z.string().trim().min(1).max(24)).max(5).optional(),
  twitter_url: z.string().url().optional().nullable(),
  thread_parts: z
    .array(
      z.object({
        body: z.string().trim().min(1).max(5000),
      })
    )
    .max(20)
    .optional(),
});

export const updatePostSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  body: z.string().trim().min(1).max(10000).optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(5).optional(),
  status: z.enum(['published', 'archived']).optional(),
});

export const moderatePostSchema = z.object({
  is_pinned: z.boolean().optional(),
  status: z.enum(['published', 'removed']).optional(),
  removed_reason: z.string().trim().max(500).optional(),
});

export const addPostCommentSchema = z.object({
  body: commentBodySchema(),
});

export type PostSortInput = z.infer<typeof postSortSchema>;
export type ListPostsQueryInput = z.infer<typeof listPostsQuerySchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type ModeratePostInput = z.infer<typeof moderatePostSchema>;
export type AddPostCommentInput = z.infer<typeof addPostCommentSchema>;
