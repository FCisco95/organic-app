import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { startVotingSchema } from '../../src/features/voting/schemas';

/**
 * Voting Snapshot On-Chain Integrity Tests
 *
 * Verifies that the start-voting API route enforces on-chain data sourcing
 * and never trusts client-provided token holder balances.
 *
 * Trust boundary: The `start_proposal_voting_integrity` SQL function accepts
 * a `p_snapshot_holders` JSONB array. Before this fix, the API route would
 * accept snapshot_holders from the request body and pass them directly to
 * the DB — allowing an admin to submit manipulated balances.
 *
 * After fix: The route ALWAYS calls `getAllTokenHolders()` (Solana RPC)
 * and ignores any client-provided snapshot_holders.
 */

describe('Voting Snapshot On-Chain Integrity', () => {
  it('startVotingSchema still accepts snapshot_holders field (schema unchanged)', () => {
    const parsed = startVotingSchema.safeParse({
      voting_duration_days: 5,
      snapshot_holders: [
        { address: 'AttackerWallet111', balance: 999_999_999 },
      ],
    });
    // The schema parses it — but the route must IGNORE it.
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.snapshot_holders?.length).toBe(1);
    }
  });

  it('startVotingSchema works without snapshot_holders', () => {
    const parsed = startVotingSchema.safeParse({
      voting_duration_days: 3,
    });
    expect(parsed.success).toBe(true);
  });

  it('start-voting route must not use client-provided snapshot_holders', () => {
    const source = readFileSync('src/app/api/proposals/[id]/start-voting/route.ts', 'utf-8');

    // Must call getAllTokenHolders() unconditionally
    expect(source).toContain('await getAllTokenHolders()');

    // Must NOT fall back from client-provided snapshot_holders
    expect(source).not.toContain('input.snapshot_holders ?? (await getAllTokenHolders())');
    expect(source).not.toContain('input.snapshot_holders ??');
  });

  it('start-voting route must include supply sanity check', () => {
    const source = readFileSync('src/app/api/proposals/[id]/start-voting/route.ts', 'utf-8');
    expect(source).toContain('SUPPLY_EXCEEDS_EXPECTED');
    expect(source).toContain('NEXT_PUBLIC_TOKEN_TOTAL_SUPPLY');
  });

  it('start-voting route reports snapshot_source as chain only', () => {
    const source = readFileSync('src/app/api/proposals/[id]/start-voting/route.ts', 'utf-8');
    expect(source).not.toContain("snapshot_source: input.snapshot_holders");
    expect(source).toMatch(/snapshot_source:\s*'chain'/);
  });
});
