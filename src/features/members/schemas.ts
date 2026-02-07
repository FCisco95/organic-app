import { z } from 'zod';

export const memberFiltersSchema = z.object({
  search: z.string().optional().default(''),
  role: z.enum(['admin', 'council', 'member', 'guest', 'all']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const updatePrivacySchema = z.object({
  profile_visible: z.boolean(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'council', 'member', 'guest']),
});

export type MemberFiltersInput = z.infer<typeof memberFiltersSchema>;
export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
