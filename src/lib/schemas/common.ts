import { z } from 'zod';

// ─── Comment body builders ───────────────────────────────────────────────

/** Reusable comment body shape — customize field name and max via wrapper. */
export const commentBodySchema = (max = 5000) =>
  z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(max, `Comment must be at most ${max} characters`);

// ─── Pagination ──────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

// ─── Search ──────────────────────────────────────────────────────────────

export const searchSchema = z.object({
  search: z.string().trim().max(200).optional(),
});

// ─── UUID param ──────────────────────────────────────────────────────────

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});
