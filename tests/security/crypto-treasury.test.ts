import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

/**
 * Crypto & Treasury Security Audit
 *
 * Agent 8 audit findings — documents the security posture of reward claims,
 * pay endpoints, voting snapshots, settlement emissions, and donation verification.
 */

describe('Crypto & Treasury Security', () => {
  // ─── Task 1: Reward Claims Double-Spend Prevention ───────────────────
  describe('reward claims double-spend prevention', () => {
    const content = readFileSync('src/app/api/rewards/claims/route.ts', 'utf-8');

    it('uses optimistic locking via claimable_points WHERE clause', () => {
      // The update uses `.eq('claimable_points', expectedBefore)` so that if
      // another concurrent request already deducted points, the WHERE clause
      // returns zero rows and the claim is rejected with 409.
      expect(content).toContain('.eq(\'claimable_points\', expectedBefore)');
    });

    it('returns 409 conflict when optimistic lock fails', () => {
      // If `deducted` is null (no rows matched), the endpoint returns 409
      // telling the user their points balance changed concurrently.
      expect(content).toContain('status: 409');
      expect(content).toContain('Points balance changed');
    });

    it('has refund mechanism when claim insert fails after points deduction', () => {
      // After points are deducted but the claim row insert fails, the code
      // attempts to restore points using another optimistic lock:
      //   .eq('claimable_points', expectedAfter)
      // This ensures the refund only applies if nobody else touched the balance.
      expect(content).toContain('claimable_points: expectedBefore');
      expect(content).toContain('.eq(\'claimable_points\', expectedAfter)');
    });

    it('logs CRITICAL when refund itself fails', () => {
      // If the refund also fails (e.g., another claim snuck in between),
      // this is logged as CRITICAL for manual intervention.
      expect(content).toContain('CRITICAL: Points refund failed');
    });

    /**
     * AUDIT FINDING — Refund reliability (LOW risk):
     *
     * The refund uses an optimistic lock on expectedAfter, which is correct —
     * it won't accidentally over-restore if a second claim ran between deduction
     * and refund. However, if the refund fails, points are permanently lost for
     * the user. The CRITICAL log is the only recovery mechanism. This is acceptable
     * for the current scale but a dead-letter queue or admin reconciliation endpoint
     * would strengthen this for production at scale.
     *
     * AUDIT FINDING — Concurrent request safety (PASS):
     *
     * Two simultaneous POST /rewards/claims with the same user:
     * - Both read profile.claimable_points (say 100)
     * - Both attempt UPDATE ... WHERE claimable_points = 100
     * - Postgres row-level locking ensures only one succeeds
     * - The loser gets 409 and no points are deducted
     * This is a sound pattern. No double-spend is possible.
     */
  });

  // ─── Task 2: Pay Endpoint Double-Pay Prevention ──────────────────────
  describe('pay endpoint double-pay prevention', () => {
    const content = readFileSync('src/app/api/rewards/claims/[id]/pay/route.ts', 'utf-8');

    it('requires admin role', () => {
      expect(content).toContain("profile?.role !== 'admin'");
    });

    it('only allows paying approved claims', () => {
      // First gate: explicit status check before attempting update
      expect(content).toContain("claim.status !== 'approved'");
    });

    it('checks for existing distribution record before paying', () => {
      // Second gate: checks if a distribution already exists for this claim,
      // preventing duplicate payout records even if status check passes.
      expect(content).toContain("eq('claim_id', claim.id)");
      expect(content).toContain('already has a recorded payout distribution');
    });

    it('uses optimistic lock on status to prevent concurrent double-pay', () => {
      // Third gate: the UPDATE itself includes `.eq('status', 'approved')`
      // so concurrent pay requests are serialized at the DB level.
      expect(content).toContain(".eq('status', 'approved') // only pay if still approved");
    });

    it('stores TX signature for audit trail', () => {
      expect(content).toContain('paid_tx_signature: tx_signature');
    });

    it('records distribution with idempotency key', () => {
      // The distribution insert uses an idempotency_key and catches
      // unique constraint violations (23505) to handle duplicates.
      expect(content).toContain('idempotency_key: payoutIdempotencyKey');
      expect(content).toContain("distError.code === '23505'");
    });

    /**
     * AUDIT FINDING — Triple-layer protection (PASS):
     *
     * 1. Application-level: claim.status !== 'approved' check
     * 2. Existing distribution check: prevents duplicate distribution rows
     * 3. DB-level optimistic lock: .eq('status', 'approved') on UPDATE
     * 4. Unique constraint on idempotency_key catches any remaining edge case
     *
     * AUDIT FINDING — Minor concern (LOW risk):
     *
     * If the claim UPDATE succeeds (status → paid) but the distribution INSERT
     * fails for a non-duplicate reason, the claim is marked paid without a
     * distribution record. The code comments acknowledge this ("Keep backwards-
     * compatibility behavior: claim is already marked as paid"). The error is
     * logged. This is acceptable but could leave orphaned paid claims without
     * matching distribution records in edge cases.
     */
  });

  // ─── Task 3: Donation Verification ───────────────────────────────────
  describe('donation verification', () => {
    const content = readFileSync('src/features/donations/verification.ts', 'utf-8');

    it('uses finalized commitment level (Agent 2 fix verified)', () => {
      expect(content).toContain("commitment: 'finalized'");
      expect(content).not.toContain("commitment: 'confirmed'");
    });

    it('checks that transaction exists on-chain', () => {
      expect(content).toContain('Transaction not found on-chain');
    });

    it('checks transaction error status (meta.err)', () => {
      expect(content).toContain('tx.meta?.err');
      expect(content).toContain('Transaction failed on-chain');
    });

    it('verifies source and destination wallets for SOL transfers', () => {
      expect(content).toContain('from === expectedFrom && to === expectedTo');
    });

    it('applies amount tolerance for rounding (1%)', () => {
      expect(content).toContain('expectedAmount * 0.01');
      expect(content).toContain('Math.abs(solAmount - expectedAmount) <= tolerance');
    });

    it('handles SPL token transfers with authority check', () => {
      expect(content).toContain('transferChecked');
      expect(content).toContain('authority');
    });

    it('SPL transfer requires BOTH source AND destination match (Agent 8 fix)', () => {
      // FIXED: Was using OR (||) which allowed spoofed donations where only
      // one wallet matched. Now uses AND (&&) like the SOL transfer path.
      expect(content).toContain('authority === expectedFrom && destination === expectedTo');
      expect(content).not.toContain('authority === expectedFrom || destination === expectedTo');
    });

    /**
     * AUDIT FINDING — SPL wallet matching (FIXED by Agent 8):
     *
     * verifySPLTransfer previously used OR for wallet matching:
     *   `authority === expectedFrom || destination === expectedTo`
     *
     * This allowed a malicious user to pass verification by sending tokens
     * from the correct wallet to ANY destination, or from ANY wallet to the
     * correct treasury. Fixed to use AND, consistent with verifySOLTransfer.
     */
  });

  // ─── Task 4: Settlement Emission Controls ────────────────────────────
  describe('settlement emission controls', () => {
    const content = readFileSync('src/features/rewards/settlement.ts', 'utf-8');

    it('has configurable emission percentage with upper bound of 100%', () => {
      // normalizeRewardSettlementPolicy clamps emissionPercent to (0, 1]
      expect(content).toContain('rawPercent > 0 && rawPercent <= 1');
    });

    it('has default emission cap per sprint', () => {
      expect(content).toContain('DEFAULT_SETTLEMENT_FIXED_CAP = 10_000');
    });

    it('computes emission cap as min(percentage * treasury, fixedCap)', () => {
      // computeEmissionCap: Math.min(percentageCap, policy.fixedCapPerSprint)
      expect(content).toContain('Math.min(percentageCap, policy.fixedCapPerSprint)');
    });

    it('blocks reward pools that exceed emission cap', () => {
      // classifySettlementIntegrity returns blocked=true when requestedPool > emissionCap
      expect(content).toContain('reward pool exceeds emission cap');
    });

    it('blocks negative reward pools', () => {
      expect(content).toContain('negative reward pool is not allowed');
    });

    it('enforces carryover sprint cap to prevent infinite accumulation', () => {
      expect(content).toContain('MAX_SETTLEMENT_CARRYOVER_SPRINTS = 3');
      expect(content).toContain('streak >= params.carryoverSprintCap');
    });

    it('handles NaN and Infinity in treasury balance', () => {
      // computeEmissionCap checks Number.isFinite and defaults to 0
      expect(content).toContain('Number.isFinite(treasuryBalance)');
    });

    /**
     * AUDIT FINDING — Emission controls (PASS):
     *
     * The settlement module has robust emission controls:
     * - Percentage-based cap (max 100% of treasury, default 1%)
     * - Fixed cap per sprint (default 10,000 tokens)
     * - Emission is the MINIMUM of percentage and fixed caps (conservative)
     * - Carryover is limited to 3 sprints max, preventing indefinite accumulation
     * - Negative and NaN inputs are safely handled
     * - classifySettlementIntegrity acts as a final gate before distribution
     *
     * No bypass path was identified. The policy normalization defensively
     * falls back to defaults for any invalid input.
     */
  });

  // ─── Task 3 (continued): Voting Snapshot Integrity ───────────────────
  describe('voting snapshot integrity', () => {
    const content = readFileSync(
      'supabase/migrations/20260220093000_voting_snapshot_integrity.sql',
      'utf-8'
    );

    it('snapshots are immutable — duplicate snapshots are rejected', () => {
      // start_proposal_voting_integrity checks for existing snapshots
      // and returns SNAPSHOT_EXISTS if any rows exist
      expect(content).toContain('SNAPSHOT_EXISTS');
      expect(content).toContain('Snapshot already taken for this proposal');
    });

    it('has unique constraint on proposal_voter_snapshots', () => {
      expect(content).toContain('proposal_voter_snapshots_unique');
    });

    it('enforces non-negative weights via CHECK constraint', () => {
      expect(content).toContain('proposal_voter_snapshots_nonnegative');
      expect(content).toContain('own_weight >= 0');
      expect(content).toContain('delegated_weight >= 0');
      expect(content).toContain('total_weight >= 0');
    });

    it('delegation cycle detection caps at 32 steps', () => {
      expect(content).toContain("cardinality(v_seen) > 32");
    });

    it('breaks cycles by reverting to source user', () => {
      // When a cycle is detected (v_next already in v_seen), the function
      // returns the original source user as the voter with cycle_broken=TRUE
      expect(content).toContain('v_next = ANY(v_seen)');
      expect(content).toContain('cycle_broken := TRUE');
    });

    it('uses advisory locks to prevent concurrent voting start', () => {
      expect(content).toContain("pg_advisory_xact_lock(hashtext('proposal-start-voting:'");
    });

    it('uses advisory locks to prevent concurrent finalization', () => {
      expect(content).toContain("pg_advisory_xact_lock(hashtext('proposal-finalize:'");
    });

    it('uses SELECT ... FOR UPDATE on proposal row', () => {
      expect(content).toContain('FOR UPDATE');
    });

    it('validates proposal status before starting voting', () => {
      expect(content).toContain('Cannot start voting on a proposal with status');
    });

    it('validates proposal status before finalization', () => {
      expect(content).toContain('Cannot finalize a proposal with status');
    });

    it('checks voting period has ended before finalizing (unless forced)', () => {
      expect(content).toContain('VOTING_NOT_ENDED');
      expect(content).toContain('v_now < v_voting_ends_at');
    });

    it('handles already-finalized proposals idempotently', () => {
      expect(content).toContain('ALREADY_FINALIZED');
    });

    it('uses dedupe key to prevent conflicting finalization runs', () => {
      expect(content).toContain('DEDUPE_KEY_MISMATCH');
    });

    it('freezes proposal after 2 failed finalization attempts', () => {
      // The retry loop runs twice (v_try IN 1..2). On second failure,
      // finalization_frozen_at is set, blocking future attempts until manual resume.
      expect(content).toContain('finalization_frozen_at = v_now');
      expect(content).toContain('finalization_kill_switch');
    });

    it('computes quorum from total supply', () => {
      expect(content).toContain('v_quorum_required');
      expect(content).toContain('v_quorum_votes >= v_quorum_required');
    });

    it('computes approval from yes/(yes+no) percentage', () => {
      expect(content).toContain('v_yes_percentage >= v_approval_threshold');
      expect(content).toContain('v_yes_votes / v_yes_no_votes');
    });

    it('restricts function execution to authenticated and service_role', () => {
      expect(content).toContain(
        'REVOKE ALL ON FUNCTION public.start_proposal_voting_integrity'
      );
      expect(content).toContain(
        'REVOKE ALL ON FUNCTION public.finalize_proposal_voting_integrity'
      );
    });

    /**
     * AUDIT FINDING — Snapshot immutability (PASS):
     *
     * Once a snapshot is taken for a proposal, the function checks for existing
     * rows in both holder_snapshots and proposal_voter_snapshots before inserting.
     * The unique constraint on (proposal_id, voter_id) provides a DB-level backup.
     * Snapshots cannot be modified after creation — there is no UPDATE path.
     *
     * AUDIT FINDING — Delegation cycle detection (PASS):
     *
     * resolve_proposal_snapshot_delegate tracks visited nodes in v_seen[] and
     * breaks if a cycle is detected OR if chain length exceeds 32. When broken,
     * the original user votes for themselves. This prevents infinite loops and
     * delegation chain attacks.
     *
     * AUDIT FINDING — Advisory locks (PASS):
     *
     * Both start_proposal_voting_integrity and finalize_proposal_voting_integrity
     * use pg_advisory_xact_lock with proposal-specific hash keys. Combined with
     * SELECT ... FOR UPDATE on the proposal row, this prevents all concurrent
     * mutation scenarios.
     *
     * AUDIT FINDING — Trust boundary (NOTED):
     *
     * p_snapshot_holders JSONB comes from admin/council input (the caller passes
     * token holder data). The function validates the array structure and filters
     * out zero-balance and empty-wallet entries, but the actual token balances
     * are trusted from the caller. This is documented as a trust boundary —
     * the snapshot data accuracy depends on the integrity of the admin-provided
     * holder list (typically fetched from on-chain data by the frontend).
     *
     * AUDIT FINDING — Quorum and approval (PASS):
     *
     * - Quorum: configurable whether abstain counts toward quorum
     * - Approval: yes / (yes + no) * 100 >= threshold
     * - Division by zero handled: if yes_no_votes <= 0, result is quorum_not_met
     * - All calculations use NUMERIC type (no floating point errors)
     */
  });
});
