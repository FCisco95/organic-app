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
  {
    file: 'src/app/api/health/route.ts',
    function: 'GET',
    purpose: 'Ping wallet_nonces and market_snapshots tables',
    justification:
      'CONCERN: Only performs SELECT head:true. Could use createAnonClient() instead. Service role is overkill for a health ping.',
    tablesAccessed: ['wallet_nonces', 'market_snapshots'],
    severity: 'concern',
  },

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
      'market_snapshots table has no RLS (identified gap). Service role is the only writer. Server-side only code.',
    tablesAccessed: ['market_snapshots'],
    severity: 'justified',
  },

  // ── Admin Moderation ─────────────────────────────────────────────────
  {
    file: 'src/app/api/admin/users/flag-check/route.ts',
    function: 'POST',
    purpose: 'Scan all comments for spam/abuse, flag user_profiles, write audit',
    justification:
      'Admin-gated. Cross-user reads of comments and updates to user_profiles.flagged on rows the actor does not own. Audit log inserts require service role.',
    tablesAccessed: ['comments', 'user_profiles', 'admin_config_audit_events', 'orgs'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/admin/users/restrict/route.ts',
    function: 'POST',
    purpose: 'Bulk apply restriction status (warn/restrict/ban/unrestrict) and write audit',
    justification:
      'Admin-gated. Updates user_profiles for other users; admin_config_audit_events INSERT has no user-write policy.',
    tablesAccessed: ['user_profiles', 'admin_config_audit_events', 'orgs'],
    severity: 'justified',
  },

  // ── Easter Campaign ──────────────────────────────────────────────────
  {
    file: 'src/app/api/easter/egg-check/route.ts',
    function: 'GET',
    purpose: 'Spawn-check + server-managed luck cache; create xp_egg_pending tokens',
    justification:
      'xp_egg_pending lacks a user INSERT policy (server-only writes); egg_hunt_luck UPSERT bypasses per-user RLS to maintain the cross-user spawn-rate cache.',
    tablesAccessed: ['egg_hunt_config', 'egg_hunt_luck', 'xp_egg_pending', 'golden_eggs'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/easter/egg-claim/route.ts',
    function: 'POST',
    purpose: 'Claim a golden egg and award XP atomically',
    justification:
      'Cross-user concurrency (only one claimer per egg_number) needs the bypass; xp_events INSERT requires service role.',
    tablesAccessed: ['golden_eggs', 'xp_events', 'user_profiles'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/easter/leaderboard/route.ts',
    function: 'GET',
    purpose: "Public Easter leaderboard reading every user's golden_eggs",
    justification:
      "golden_eggs RLS scopes SELECT to own + admin only. A public leaderboard listing ALL users' eggs requires bypass. Read-only.",
    tablesAccessed: ['golden_eggs', 'user_profiles'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/easter/xp-egg-claim/route.ts',
    function: 'POST',
    purpose: 'Atomic claim of pending xp_egg + XP award',
    justification:
      'xp_egg_pending DELETE+SELECT pattern needs server context; xp_events INSERT requires service role.',
    tablesAccessed: ['xp_egg_pending', 'xp_events', 'user_profiles'],
    severity: 'justified',
  },

  // ── Engagement (Appeals + Cron) ──────────────────────────────────────
  {
    file: 'src/app/api/engagement/submissions/[id]/appeal/route.ts',
    function: 'POST',
    purpose: 'File an appeal against an engagement submission score',
    justification:
      'engagement_appeals lacks user INSERT policy. fileAppeal() enforces ownership server-side before insert.',
    tablesAccessed: ['engagement_appeals', 'engagement_submissions'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/engagement/appeals/[id]/vote/route.ts',
    function: 'POST',
    purpose: 'Cast a community vote on an engagement appeal',
    justification:
      'engagement_appeal_votes lacks user INSERT policy. castAppealVote() validates voter eligibility server-side.',
    tablesAccessed: ['engagement_appeal_votes', 'engagement_appeals'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/internal/cron/sprint-summary/route.ts',
    function: 'GET/POST',
    purpose: 'Generate AI sprint summaries for active sprints (cron)',
    justification:
      'Cron-secret bearer auth. Reads sprints across all owners and writes summaries via the sprint-summary-service.',
    tablesAccessed: ['sprints', 'tasks', 'task_submissions', 'sprint_snapshots'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/internal/engagement/appeals-sweep/route.ts',
    function: 'GET/POST',
    purpose: 'Resolve expired engagement appeals (cron)',
    justification:
      'Cron-secret bearer auth. Cross-user appeals state machine; needs full table access.',
    tablesAccessed: ['engagement_appeals', 'engagement_appeal_votes', 'engagement_submissions'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/internal/engagement/poll/route.ts',
    function: 'GET/POST',
    purpose: 'Poll Twitter for new engagements and process them (cron)',
    justification:
      'Cron-secret bearer auth. Cross-user processing of engagement_handles, engagement_posts, engagement_submissions.',
    tablesAccessed: [
      'engagement_handles',
      'engagement_posts',
      'engagement_submissions',
      'engagement_calibration_samples',
    ],
    severity: 'justified',
  },

  // ── Posts & Proposals (additional) ───────────────────────────────────
  {
    file: 'src/app/api/posts/[id]/route.ts',
    function: 'GET/PATCH/DELETE',
    purpose: "Read/edit a post; admin moderation on others' posts",
    justification:
      'Admin moderation actions modify posts owned by other users. Service role used for those branches.',
    tablesAccessed: ['posts', 'post_likes', 'user_profiles'],
    severity: 'justified',
  },
  {
    file: 'src/app/api/proposals/[id]/route.ts',
    function: 'GET/PATCH',
    purpose: 'Read/update a proposal (status transitions, admin overrides)',
    justification:
      'Admin/council updates proposals owned by other authors (state transitions, override promotions). Service role gates those write paths.',
    tablesAccessed: ['proposals', 'proposal_versions', 'user_profiles'],
    severity: 'justified',
  },

  // ── Testimonials Moderation ──────────────────────────────────────────
  {
    file: 'src/app/api/testimonials/admin/route.ts',
    function: 'GET/POST',
    purpose: 'List pending testimonials and approve/reject them',
    justification:
      'Admin/council action. Reads all pending testimonials regardless of submitter; approval awards XP via gamification service.',
    tablesAccessed: ['testimonials', 'user_profiles', 'xp_events'],
    severity: 'justified',
  },

  // ── Server-Only Services ─────────────────────────────────────────────
  {
    file: 'src/features/dashboard/sprint-summary-service.ts',
    function: 'generateSprintSummary',
    purpose: 'Aggregate sprint metrics + persist AI-generated summary',
    justification:
      'Cross-user aggregation of tasks, submissions, contributors. Writes sprint_snapshots which is admin-write only.',
    tablesAccessed: ['sprints', 'tasks', 'task_submissions', 'sprint_snapshots', 'user_profiles'],
    severity: 'justified',
  },
  {
    file: 'src/lib/translation/translate-content.ts',
    function: 'translateContent',
    purpose: 'Read/write content_translations cache for any user-generated content',
    justification:
      'Shared helper invoked from translate routes. content_translations is a server-managed cache; no user INSERT/UPDATE policy.',
    tablesAccessed: ['content_translations'],
    severity: 'justified',
  },

  // ── Read-Only Reviewable ─────────────────────────────────────────────
  {
    file: 'src/app/api/gamification/overview/route.ts',
    function: 'GET',
    purpose: 'Read user XP/level/quests/achievements overview',
    justification:
      'CONCERN: Read-only endpoint. user_profiles, xp_events, achievements all have user-scoped SELECT policies. Could likely be migrated to createClient (RLS-gated) instead of bypassing.',
    tablesAccessed: ['user_profiles', 'xp_events', 'achievements', 'user_achievements', 'quests'],
    severity: 'concern',
  },
];

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
    // Known concerns that should be reviewed:
    // 1. health/route.ts - could use anon client (still uses service-role per current code)
    // 2. onboarding/steps - may not need service role
    // 3. user/points/route.ts - reads only
    // 4. gamification/overview/route.ts - read-only with user-scoped policies; could downgrade
    expect(concerns.length).toBe(4);
    expect(concerns.map((c) => c.file)).toEqual(
      expect.arrayContaining([
        'src/app/api/health/route.ts',
        'src/app/api/onboarding/steps/[step]/complete/route.ts',
        'src/app/api/user/points/route.ts',
        'src/app/api/gamification/overview/route.ts',
      ])
    );
  });

  it('should account for all createServiceClient usages in the codebase', () => {
    // Total distinct files using createServiceClient in src/ (excluding the
    // server.ts definition and __tests__ files). Re-audited 2026-05-07.
    const EXPECTED_USAGE_COUNT = 43;
    expect(serviceRoleUsages.length).toBe(EXPECTED_USAGE_COUNT);
  });

  describe('Tables missing RLS', () => {
    // These tables were identified as missing RLS during the audit.
    // They should be addressed in a future migration.
    const tablesMissingRls = [
      {
        table: 'market_snapshots',
        severity: 'MEDIUM',
        note: 'Only accessed via service_role. Contains public market price data.',
      },
      {
        table: 'reward_settlement_events',
        severity: 'HIGH',
        note: 'Settlement audit trail. Should be admin-only write, authenticated read.',
      },
      {
        table: 'proposal_voter_snapshots',
        severity: 'HIGH',
        note: 'Voter eligibility snapshots with token balances. Should be read-only for authenticated.',
      },
    ];

    it('should document all tables missing RLS', () => {
      tablesMissingRls.forEach((entry) => {
        expect(entry.table).toBeTruthy();
        expect(entry.severity).toBeTruthy();
        expect(entry.note).toBeTruthy();
      });
    });

    it('should have 3 known tables missing RLS', () => {
      expect(tablesMissingRls.length).toBe(3);
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
