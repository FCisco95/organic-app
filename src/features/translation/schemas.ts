import { z } from 'zod';

export const translateRequestSchema = z.object({
  targetLocale: z.enum(['en', 'pt-PT', 'zh-CN']),
});
