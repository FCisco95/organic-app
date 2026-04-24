import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

/**
 * Static-analysis security tests for the X Engagement Rewards feature.
 *
 * These guardrails protect the surface from four classes of regression:
 *   1. Organic-ID gate bypass (non-verified users earning XP)
 *   2. XP double-award on cron replay
 *   3. Admin routes losing role checks
 *   4. Appeals voting abuse (self-vote, double-vote)
 */

describe('Engagement: Organic ID gate', () => {
  it('processor only loads twitter_accounts whose user_profile has an organic_id', () => {
    const processor = readFileSync('src/features/engagement/processor.ts', 'utf-8');
    expect(processor).toMatch(/user_profiles!inner\(organic_id\)/);
    expect(processor).toMatch(/\.not\('user_profiles\.organic_id', 'is', null\)/);
  });

  it('dao-vote rejects voters without organic_id', () => {
    const daoVote = readFileSync('src/features/engagement/dao-vote.ts', 'utf-8');
    expect(daoVote).toMatch(/organic_id == null/);
    expect(daoVote).toMatch(/organic_id_required/);
  });

  it('requireVerifiedMember helper checks organic_id', () => {
    const helper = readFileSync('src/lib/auth/require-role.ts', 'utf-8');
    expect(helper).toMatch(/requireVerifiedMember/);
    expect(helper).toMatch(/organic_id == null/);
  });
});

describe('Engagement: idempotency', () => {
  it('processor passes a stable sourceId to awardXp', () => {
    const processor = readFileSync('src/features/engagement/processor.ts', 'utf-8');
    expect(processor).toMatch(/const sourceId = `engagement:\$\{post\.id\}:\$\{acc\.user_id\}:\$\{engagementType\}`/);
    expect(processor).toMatch(/sourceId,/); // passed through to awardXp options
  });

  it('engagement_submissions has a unique constraint preventing duplicates', () => {
    const migration = readFileSync(
      'supabase/migrations/20260424000000_engagement_xp.sql',
      'utf-8'
    );
    expect(migration).toMatch(
      /UNIQUE \(post_id, user_id, engagement_type\)/
    );
  });

  it('settlement uses a distinct sourceId namespace to avoid collision with base engagement', () => {
    const settlement = readFileSync('src/features/engagement/settlement.ts', 'utf-8');
    expect(settlement).toMatch(/`engagement_bonus:\$\{sprintId\}:\$\{postId\}:\$\{userId\}`/);
  });

  it('resolveAppeal uses a distinct sourceId namespace so re-runs cannot double-award', () => {
    const daoVote = readFileSync('src/features/engagement/dao-vote.ts', 'utf-8');
    expect(daoVote).toMatch(/`appeal_overturn:\$\{appealId\}`/);
  });
});

describe('Engagement: admin route gating', () => {
  it('admin handles route uses requireAdminOrCouncil', () => {
    const route = readFileSync('src/app/api/admin/engagement/handles/route.ts', 'utf-8');
    expect(route).toMatch(/requireAdminOrCouncil/);
  });

  it('admin handle detail route uses requireAdminOrCouncil', () => {
    const route = readFileSync('src/app/api/admin/engagement/handles/[id]/route.ts', 'utf-8');
    expect(route).toMatch(/requireAdminOrCouncil/);
  });

  it('admin calibration queue route uses requireAdminOrCouncil', () => {
    const route = readFileSync('src/app/api/admin/engagement/calibration/route.ts', 'utf-8');
    expect(route).toMatch(/requireAdminOrCouncil/);
  });

  it('admin calibration review route uses requireAdminOrCouncil', () => {
    const route = readFileSync('src/app/api/admin/engagement/calibration/[id]/route.ts', 'utf-8');
    expect(route).toMatch(/requireAdminOrCouncil/);
  });

  it('admin post override route uses requireAdminOrCouncil', () => {
    const route = readFileSync('src/app/api/admin/engagement/posts/[id]/route.ts', 'utf-8');
    expect(route).toMatch(/requireAdminOrCouncil/);
  });
});

describe('Engagement: cron route secret enforcement', () => {
  it('poll route requires CRON_SECRET bearer', () => {
    const route = readFileSync('src/app/api/internal/engagement/poll/route.ts', 'utf-8');
    expect(route).toMatch(/CRON_SECRET/);
    expect(route).toMatch(/`Bearer \$\{secret\}`/);
  });

  it('appeals-sweep route requires CRON_SECRET bearer', () => {
    const route = readFileSync('src/app/api/internal/engagement/appeals-sweep/route.ts', 'utf-8');
    expect(route).toMatch(/CRON_SECRET/);
    expect(route).toMatch(/`Bearer \$\{secret\}`/);
  });
});

describe('Engagement: appeals voting safeguards', () => {
  it('appellant cannot vote on own appeal', () => {
    const daoVote = readFileSync('src/features/engagement/dao-vote.ts', 'utf-8');
    expect(daoVote).toMatch(/cannot_vote_own_appeal/);
  });

  it('double-voting is prevented by a DB unique constraint', () => {
    const migration = readFileSync(
      'supabase/migrations/20260424000000_engagement_xp.sql',
      'utf-8'
    );
    expect(migration).toMatch(
      /engagement_appeal_votes_unique_per_voter UNIQUE \(appeal_id, voter_id\)/
    );
  });

  it('only comment-type submissions can be appealed', () => {
    const daoVote = readFileSync('src/features/engagement/dao-vote.ts', 'utf-8');
    expect(daoVote).toMatch(/only_comments_appealable/);
  });

  it('only the submission author can file an appeal', () => {
    const daoVote = readFileSync('src/features/engagement/dao-vote.ts', 'utf-8');
    expect(daoVote).toMatch(/forbidden_not_author/);
  });

  it('appeals to closed voting windows are rejected', () => {
    const daoVote = readFileSync('src/features/engagement/dao-vote.ts', 'utf-8');
    expect(daoVote).toMatch(/appeal_window_closed/);
  });
});

describe('Engagement: RLS policies on new tables', () => {
  const migration = readFileSync(
    'supabase/migrations/20260424000000_engagement_xp.sql',
    'utf-8'
  );

  it('all seven engagement tables have RLS enabled', () => {
    const tables = [
      'engagement_handles',
      'engagement_posts',
      'engagement_submissions',
      'engagement_appeals',
      'engagement_appeal_votes',
      'engagement_calibration_samples',
      'engagement_rubric_examples',
    ];
    for (const t of tables) {
      expect(migration).toMatch(new RegExp(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`));
    }
  });

  it('anon role cannot read any engagement table', () => {
    const tables = [
      'engagement_handles',
      'engagement_posts',
      'engagement_submissions',
      'engagement_appeals',
      'engagement_appeal_votes',
      'engagement_calibration_samples',
      'engagement_rubric_examples',
    ];
    for (const t of tables) {
      expect(migration).toMatch(new RegExp(`REVOKE ALL ON TABLE ${t} FROM anon`));
    }
  });

  it('users can only read their own engagement submissions', () => {
    expect(migration).toMatch(
      /"Users read own engagement submissions"[\s\S]*auth\.uid\(\) = user_id/
    );
  });

  it('calibration samples are admin/council-only', () => {
    expect(migration).toMatch(
      /"Admin\/council manage calibration samples"[\s\S]*role IN \('admin', 'council'\)/
    );
  });
});
