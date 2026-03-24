import { z } from 'zod';

export const holdingStatsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).optional().default(90),
});

export type HoldingStatsQueryInput = z.infer<typeof holdingStatsQuerySchema>;
