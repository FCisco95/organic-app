import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Loose-typed Supabase client for reading/writing engagement_* tables.
 *
 * The generated Database types in `src/types/database.ts` are created from
 * a Supabase type-dump and do not yet include the engagement_* tables from
 * migration 20260424000000_engagement_xp.sql. Rather than scatter casts
 * across every feature module, we cast once here. Once the types are
 * regenerated post-deploy, this helper can be dropped.
 */
// Using `any` is deliberate: we lose compile-time knowledge of the new tables
// until Supabase types are regenerated from the live schema.
// eslint-disable-next-line
export type EngagementDb = SupabaseClient<any, any, any>;

export function asEngDb(client: unknown): EngagementDb {
  return client as EngagementDb;
}
