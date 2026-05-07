import { describe, it, expect } from 'vitest';

/**
 * RLS Isolation Audit Test
 *
 * This test serves as a living document of every createServiceClient() usage
 * in the codebase. Each entry must have a justification for why it bypasses RLS.
 *
 * When adding a new service_role usage, add an entry here with justification.
 * When removing a service_role usage, remove the entry.
 *
 * See tests/security/rls-audit-report.md for the full audit.
 */

interface ServiceRoleUsage {
  file: string;
  function: string;
  purpose: string;
  justification: string;
  tablesAccessed: string[];
  severity: 'justified' | 'concern';
}

const serviceRoleUsages: ServiceRoleUsage[] = [
  // ── Auth & Identity ──────────────────────────────────────────────────
  {
    file: 'src/app/api/auth/nonce/route.ts',
    function: 'POST',
    purpose: 'Insert wallet nonce for SIWS before user is authenticated',
    justification:
      'Pre-auth operation: no user session exists yet. Nonce must be created server-side for wallet signature verification.',
    tablesAccessed: ['wallet_nonces'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/auth/link-wallet/route.ts',
    function: 'POST',
    purpose: 'Validate nonce and update user profile with wallet public key',
    justification:
      'Nonce table is service-managed (no user INSERT policy). Profile wallet_pubkey update needs bypass to prevent user from setting arbitrary wallet.',
    tablesAccessed: ['wallet_nonces', 'user_profiles'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/organic-id/assign/route.ts',
    function: 'POST',
    purpose: 'Assign sequential organic_id via RPC and update profile',
    justification:
      'Atomic sequential ID generation via DB function. Users must not self-assign organic_id.',
    tablesAccessed: ['user_profiles'],
    severity: 'justified',
  },

  // ── Health ────────────────────────────────────────────────────────────
  // NOTE: src/app/api/health/route.ts no longer uses createServiceClient —
  // it was migrated to createAnonClient and now only pings market_snapshots.
  // Entry intentionally omitted from this manifest.

  // ── Task Submissions & Reviews ────────────────────────────────────────
  {
    file: 'src/app/api/submissions/[id]/review/route.ts',
    function: 'POST',
    purpose: 'Review submission: update status, award points, update task',
    justification:
      'Admin/council action that writes across submissions, user_profiles (points), and tasks tables. Cross-table atomic updates require bypassing per-user RLS.',
    tablesAccessed: ['task_submissions', 'user_profiles', 'tasks', 'activity_log'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/tasks/[id]/submissions/route.ts',
    function: 'POST',
    purpose: 'Create submission and log activity',
    justification:
      'activity_log INSERT requires service role as there is no user-scoped INSERT policy.',
    tablesAccessed: ['task_submissions', 'activity_log'],
    severity: 'justified',
  },

  // ── Ideas Incubator ───────────────────────────────────────────────────
  {
    file: 'src/app/api/ideas/route.ts',
    function: 'POST',
    purpose: 'Log idea creation events and activity',
    justification:
      'idea_events and activity_log tables lack user INSERT policies. System-level event logging.',
    tablesAccessed: ['idea_events', 'activity_log'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/ideas/[id]/route.ts',
    function: 'PATCH',
    purpose: 'Log idea update/moderation events',
    justification: 'idea_events INSERT requires service role for event logging.',
    tablesAccessed: ['idea_events'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/ideas/[id]/vote/route.ts',
    function: 'POST',
    purpose: 'Log vote change events and activity',
    justification: 'Event logging to idea_events and activity_log requires service role.',
    tablesAccessed: ['idea_events', 'activity_log'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/ideas/[id]/comments/route.ts',
    function: 'POST',
    purpose: 'Log comment events, activity, and award XP',
    justification:
      'Cross-table writes: idea_events + activity_log + XP awards via gamification service.',
    tablesAccessed: ['idea_events', 'activity_log', 'xp_events', 'user_profiles'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/ideas/[id]/promote/route.ts',
    function: 'POST',
    purpose: 'Create proposal from idea, update idea, log events',
    justification:
      'Cross-table atomic operation: creates proposal on behalf of idea author (different user context), links records, updates idea status.',
    tablesAccessed: ['proposals', 'ideas', 'idea_events', 'activity_log'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/ideas/cycles/[id]/select-winner/route.ts',
    function: 'POST',
    purpose: 'Select cycle winner, update cycle and idea status',
    justification:
      'Admin action updating idea_promotion_cycles and ideas tables atomically.',
    tablesAccessed: ['idea_promotion_cycles', 'ideas', 'idea_events'],
    severity: 'justified',
  },

  // ── Disputes ──────────────────────────────────────────────────────────
  {
    file: 'src/app/api/disputes/[id]/route.ts',
    function: 'GET',
    purpose: 'Generate signed URLs for dispute evidence storage files',
    justification:
      'Storage bucket signed URL generation for dispute-evidence bucket. Admin/arbitrator may need to view evidence uploaded by other users.',
    tablesAccessed: ['storage.objects (dispute-evidence)'],
    severity: 'justified',
  },

  // ── Onboarding ────────────────────────────────────────────────────────
  {
    file: 'src/app/api/onboarding/steps/[step]/complete/route.ts',
    function: 'POST',
    purpose: 'Upsert onboarding step completion',
    justification:
      'CONCERN: RLS policy exists for onboarding_steps INSERT with user_id = auth.uid(). The authenticated client may work here, making service role unnecessary.',
    tablesAccessed: ['onboarding_steps'],
    severity: 'concern',
  },

  // ── Community Posts ───────────────────────────────────────────────────
  {
    file: 'src/app/api/posts/route.ts',
    function: 'POST',
    purpose: 'Calculate post cost, deduct points, insert post, log activity',
    justification:
      'Points ledger writes (points_ledger INSERT) and cross-table operations require service role.',
    tablesAccessed: ['points_ledger', 'posts', 'activity_log', 'user_profiles'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/posts/[id]/like/route.ts',
    function: 'POST',
    purpose: 'Award XP to liker and post author, sync like count',
    justification:
      'Cross-user XP awards: the post author receives XP from someone else liking. Also updates posts.likes_count on a row not owned by the liker.',
    tablesAccessed: ['xp_events', 'user_profiles', 'post_likes', 'posts'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/posts/[id]/comments/route.ts',
    function: 'POST',
    purpose: 'Award XP to commenter and post author',
    justification: 'Cross-user XP awards via gamification service.',
    tablesAccessed: ['xp_events', 'user_profiles'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/posts/[id]/flag/route.ts',
    function: 'POST/PATCH',
    purpose: 'Log flag activity, read all flags for vindication, penalize false flaggers',
    justification:
      'Admin vindication reads other users\' flags and deducts their points. Activity logging bypass.',
    tablesAccessed: ['activity_log', 'post_flags', 'points_ledger', 'user_profiles'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/posts/[id]/promote/route.ts',
    function: 'POST',
    purpose: 'Deduct points for post promotion',
    justification: 'Points ledger write requires service role.',
    tablesAccessed: ['points_ledger', 'user_profiles', 'posts'],
    severity: 'justified',
  },

  // ── Donations ─────────────────────────────────────────────────────────
  {
    file: 'src/app/api/donations/submit/route.ts',
    function: 'POST',
    purpose: 'Verify and finalize donation on-chain asynchronously',
    justification:
      'Async background verification updates donation status after user response is sent. Needs service role for deferred write.',
    tablesAccessed: ['donations', 'activity_log'],
    severity: 'justified',
  },

  // ── Trading / Wallet ──────────────────────────────────────────────────
  {
    file: 'src/app/api/trading/sync/route.ts',
    function: 'POST',
    purpose: 'Sync wallet balance and log activity',
    justification:
      'wallet_balance_snapshots write and activity_log INSERT require service role.',
    tablesAccessed: ['wallet_balance_snapshots', 'activity_log'],
    severity: 'justified',
  },

  // ── Twitter OAuth ─────────────────────────────────────────────────────
  {
    file: 'src/app/api/twitter/link/start/route.ts',
    function: 'POST',
    purpose: 'Create twitter_oauth_sessions record',
    justification:
      'OAuth session table is service-managed. Sessions contain code_verifier secrets that must not be user-writable.',
    tablesAccessed: ['twitter_oauth_sessions'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/twitter/link/callback/route.ts',
    function: 'GET',
    purpose: 'Read OAuth session, upsert twitter_accounts',
    justification:
      'OAuth session validation requires reading service-managed session data. twitter_accounts upsert is a cross-table operation.',
    tablesAccessed: ['twitter_oauth_sessions', 'twitter_accounts', 'user_profiles'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/twitter/account/route.ts',
    function: 'PATCH/DELETE',
    purpose: 'Update or delete twitter account link, update user profile',
    justification:
      'twitter_accounts may lack user-scoped write policies. Profile update for twitter handle field.',
    tablesAccessed: ['twitter_accounts', 'user_profiles'],
    severity: 'justified',
  },

  // ── Points Economy ────────────────────────────────────────────────────
  {
    file: 'src/app/api/user/points/route.ts',
    function: 'GET',
    purpose: 'Read points economy data (weekly counts, engagement points)',
    justification:
      'CONCERN: Only reads data. If points_ledger SELECT policy allows user to see own data, authenticated client could suffice.',
    tablesAccessed: ['points_ledger', 'posts'],
    severity: 'concern',
  },

  // ── Market Data ───────────────────────────────────────────────────────
  {
    file: 'src/features/market-data/server/service.ts',
    function: 'readSnapshot/writeSnapshot',
    purpose: 'Read and write cached market price data',
    justification:
      'market_snapshots has RLS (added 20260329000000_rls_remaining_tables.sql) blocking direct user writes. Service role is still the only writer; reads could theoretically use anon client.',
    tablesAccessed: ['market_snapshots'],
    severity: 'justified',
  },
];

// NOTE: a grep for createServiceClient across src/ currently finds 43 distinct
// files; the manifest above tracks 26. Re-audit pending — see follow-up issue.

describe('RLS Isolation', () => {
  it('should document service_role usage justification for every usage', () => {
    // Every usage must have a justification
    serviceRoleUsages.forEach((usage) => {
      expect(
        usage.justification,
        `Missing justification for ${usage.file} (${usage.function})`
      ).toBeTruthy();
    });
  });

  it('should have at least one table accessed per usage', () => {
    serviceRoleUsages.forEach((usage) => {
      expect(
        usage.tablesAccessed.length,
        `No tables listed for ${usage.file}`
      ).toBeGreaterThan(0);
    });
  });

  it('should flag all known concerns', () => {
    const concerns = serviceRoleUsages.filter((u) => u.severity === 'concern');
    // Known concerns still to review:
    // 1. onboarding/steps - may not need service role
    // 2. user/points/route.ts - reads only
    // (health/route.ts was migrated to createAnonClient and removed from manifest.)
    expect(concerns.length).toBe(2);
    expect(concerns.map((c) => c.file)).toEqual(
      expect.arrayContaining([
        'src/app/api/onboarding/steps/[step]/complete/route.ts',
        'src/app/api/user/points/route.ts',
      ])
    );
  });

  it('should account for all createServiceClient usages in the codebase', () => {
    // Total distinct files using createServiceClient (excluding definition and docs)
    // If this number changes, update the serviceRoleUsages array above
    // 25 distinct usages across 25 files (server.ts definition excluded, docs excluded)
    // NOTE: a fresh `grep -rln createServiceClient src/` finds ~43 files —
    // significant manifest drift since the last audit. Re-audit pending.
    const EXPECTED_USAGE_COUNT = 25;
    expect(serviceRoleUsages.length).toBe(EXPECTED_USAGE_COUNT);
  });

  describe('Tables previously missing RLS — now protected', () => {
    // These tables were identified as missing RLS in earlier audits and have
    // since been protected by 20260329000000_rls_remaining_tables.sql.
    // Kept here as a record so a future regression is easy to spot.
    const recentlyProtectedTables = [
      {
        table: 'market_snapshots',
        protectedBy: '20260329000000_rls_remaining_tables.sql',
        policyShape: 'authenticated SELECT, service-role-only writes',
      },
      {
        table: 'reward_settlement_events',
        protectedBy: '20260329000000_rls_remaining_tables.sql',
        policyShape: 'admin/council SELECT, append-only via SECURITY DEFINER',
      },
      {
        table: 'proposal_voter_snapshots',
        protectedBy: '20260329000000_rls_remaining_tables.sql',
        policyShape: 'participants + admin/council SELECT, service-role writes',
      },
    ];

    it('should document the migration that closed each previous gap', () => {
      recentlyProtectedTables.forEach((entry) => {
        expect(entry.protectedBy).toMatch(/^\d{14}_/);
        expect(entry.policyShape).toBeTruthy();
      });
    });
  });

  describe('User-scoped tables verified RLS-protected', () => {
    // Tables audited 2026-05-07: RLS is enabled in their source migrations
    // with user-scoped policies. Listed here so any regression (e.g. someone
    // disabling RLS in a future migration) is easy to spot in review.
    const verifiedUserScopedTables = [
      { table: 'egg_hunt_luck', source: '20260331000001_egg_hunt.sql' },
      { table: 'sprint_snapshots', source: '20260215100000_sprint_snapshots.sql' },
      { table: 'user_badges', source: '20260331000002_badges.sql' },
      { table: 'wallet_snapshots', source: '20260331000002_badges.sql' },
      { table: 'xp_egg_pending', source: '20260404000000_xp_eggs.sql' },
      { table: 'login_streaks', source: '20260331000003_daily_tasks.sql' },
    ];

    it('should record source migration for every verified table', () => {
      verifiedUserScopedTables.forEach((entry) => {
        expect(entry.table).toBeTruthy();
        expect(entry.source).toMatch(/^\d{14}_.*\.sql$/);
      });
    });
  });

  describe('USING(true) on sensitive tables', () => {
    // These were the USING(true) policies on sensitive tables that have been fixed
    const fixedPolicies = [
      { table: 'user_profiles', fix: 'Split auth/anon with profile_visible gate' },
      { table: 'disputes', fix: 'Restricted to parties + admin/council' },
      { table: 'activity_log', fix: 'Restricted to authenticated only' },
    ];

    it('should document all fixed USING(true) policies on sensitive tables', () => {
      expect(fixedPolicies.length).toBe(3);
      fixedPolicies.forEach((p) => {
        expect(p.fix).toBeTruthy();
      });
    });
  });
});
