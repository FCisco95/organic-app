'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchJson } from '@/lib/fetch-json';
import { buildQueryString } from '@/lib/query-string';
import {
  VoteResults,
  UserVote,
  VotingConfig,
  ProposalWithVoting,
  OutgoingDelegation,
  IncomingDelegation,
  EffectiveVotingPower,
} from './types';
import {
  CastVoteInput,
  StartVotingInput,
  FinalizeVotingInput,
  DelegateVoteInput,
  RevokeDelegationInput,
} from './schemas';

const VOTING_CONFIG_COLUMNS =
  'id, org_id, quorum_percentage, approval_threshold, voting_duration_days, proposal_threshold_org, proposer_cooldown_days, max_live_proposals, abstain_counts_toward_quorum, created_at, updated_at';

// Query keys
export const votingKeys = {
  all: ['voting'] as const,
  config: () => [...votingKeys.all, 'config'] as const,
  proposals: () => [...votingKeys.all, 'proposals'] as const,
  proposal: (id: string) => [...votingKeys.proposals(), id] as const,
  results: (proposalId: string) => [...votingKeys.all, 'results', proposalId] as const,
  userVote: (proposalId: string, userId: string) =>
    [...votingKeys.all, 'user-vote', proposalId, userId] as const,
  snapshot: (proposalId: string) => [...votingKeys.all, 'snapshot', proposalId] as const,
  // Phase 12: Delegations
  delegations: () => [...votingKeys.all, 'delegations'] as const,
  effectivePower: (proposalId: string, userId?: string) =>
    [...votingKeys.all, 'effective-power', proposalId, userId] as const,
};

/**
 * Fetch voting configuration
 */
export function useVotingConfig() {
  const supabase = createClient();

  return useQuery({
    queryKey: votingKeys.config(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voting_config')
        .select(VOTING_CONFIG_COLUMNS)
        .limit(1)
        .single();

      if (error) throw error;
      return data as VotingConfig;
    },
  });
}

/**
 * Fetch proposal with voting info
 */
export function useProposalWithVoting(proposalId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: votingKeys.proposal(proposalId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select(
          `
          *,
          user_profiles!proposals_created_by_fkey (
            organic_id,
            email,
            wallet_pubkey
          )
        `
        )
        .eq('id', proposalId)
        .single();

      if (error) throw error;
      return data as unknown as ProposalWithVoting;
    },
    enabled: !!proposalId,
  });
}

/**
 * Fetch vote results for a proposal
 */
export function useVoteResults(proposalId: string) {
  return useQuery({
    queryKey: votingKeys.results(proposalId),
    queryFn: async () => {
      return fetchJson<VoteResults>(`/api/proposals/${proposalId}/results`);
    },
    enabled: !!proposalId,
    // Treat as fresh for a short window so VotingPanel and VoteResults,
    // which mount on the same detail page via separate dynamic imports,
    // share one fetch instead of each triggering their own on mount.
    staleTime: 5_000,
    refetchInterval: (query) => (query.state.data?.is_voting_open ? 30_000 : false),
  });
}

/**
 * Fetch current user's vote for a proposal
 */
export function useUserVote(proposalId: string, userId: string | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: votingKeys.userVote(proposalId, userId || ''),
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('votes')
        .select('id, value, weight, created_at')
        .eq('proposal_id', proposalId)
        .eq('voter_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as UserVote | null;
    },
    enabled: !!proposalId && !!userId,
  });
}

/**
 * Fetch user's voting weight from snapshot
 */
export function useUserVotingWeight(proposalId: string, userId: string | undefined) {
  return useQuery({
    queryKey: [...votingKeys.snapshot(proposalId), userId],
    queryFn: async () => {
      if (!userId) return 0;
      const data = await fetchJson<{ voting_weight?: number }>(
        `/api/proposals/${proposalId}/vote`
      );
      return Number(data.voting_weight ?? 0);
    },
    enabled: !!proposalId && !!userId,
  });
}

/**
 * Start voting on a proposal (admin only)
 */
export function useStartVoting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proposalId, input }: { proposalId: string; input?: StartVotingInput }) => {
      return fetchJson(`/api/proposals/${proposalId}/start-voting`, {
        method: 'POST',
        body: JSON.stringify(input || {}),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: votingKeys.proposal(variables.proposalId) });
      queryClient.invalidateQueries({ queryKey: votingKeys.results(variables.proposalId) });
    },
  });
}

/**
 * Cast a vote on a proposal
 */
export function useCastVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proposalId, input }: { proposalId: string; input: CastVoteInput }) => {
      return fetchJson(`/api/proposals/${proposalId}/vote`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: votingKeys.results(variables.proposalId) });
      // Invalidate user vote queries - the user ID will be refetched
      queryClient.invalidateQueries({
        queryKey: votingKeys.all,
        predicate: (query) =>
          query.queryKey[0] === 'voting' &&
          query.queryKey[1] === 'user-vote' &&
          query.queryKey[2] === variables.proposalId,
      });
    },
  });
}

/**
 * Finalize voting on a proposal (admin only)
 */
export function useFinalizeVoting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      input,
    }: {
      proposalId: string;
      input?: FinalizeVotingInput;
    }) => {
      return fetchJson(`/api/proposals/${proposalId}/finalize`, {
        method: 'POST',
        body: JSON.stringify(input || {}),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: votingKeys.proposal(variables.proposalId) });
      queryClient.invalidateQueries({ queryKey: votingKeys.results(variables.proposalId) });
    },
  });
}

/**
 * Calculate time remaining for voting
 */
export function useVotingTimeRemaining(votingEndsAt: string | null) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(() => {
    if (!votingEndsAt) return null;
    const diff = new Date(votingEndsAt).getTime() - Date.now();
    return diff > 0 ? diff : 0;
  });

  useEffect(() => {
    if (!votingEndsAt) {
      setTimeRemaining(null);
      return;
    }

    const endMs = new Date(votingEndsAt).getTime();
    const update = () => {
      const diff = endMs - Date.now();
      setTimeRemaining(diff > 0 ? diff : 0);
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [votingEndsAt]);

  return { data: timeRemaining };
}

/**
 * Format time remaining in human-readable format
 */
export function formatTimeRemaining(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || ms <= 0) return 'Voting ended';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h remaining`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m remaining`;
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s remaining`;
  }
  return `${seconds}s remaining`;
}

// ============================================
// Phase 12: Vote Delegation Hooks
// ============================================

/**
 * Fetch current user's delegations (outgoing + incoming)
 */
export function useDelegations() {
  return useQuery({
    queryKey: votingKeys.delegations(),
    queryFn: async () => {
      return fetchJson<{
        outgoing: OutgoingDelegation[];
        incoming: IncomingDelegation[];
      }>('/api/voting/delegations');
    },
  });
}

/**
 * Create or update a vote delegation
 */
export function useDelegate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DelegateVoteInput) => {
      return fetchJson('/api/voting/delegations', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: votingKeys.delegations() });
      queryClient.invalidateQueries({
        queryKey: [...votingKeys.all, 'effective-power'],
      });
    },
  });
}

/**
 * Revoke a vote delegation
 */
export function useRevokeDelegation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RevokeDelegationInput) => {
      return fetchJson('/api/voting/delegations', {
        method: 'DELETE',
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: votingKeys.delegations() });
      queryClient.invalidateQueries({
        queryKey: [...votingKeys.all, 'effective-power'],
      });
    },
  });
}

/**
 * Fetch effective voting power for a proposal (own + delegated)
 */
export function useEffectiveVotingPower(proposalId: string, userId: string | undefined) {
  return useQuery({
    queryKey: votingKeys.effectivePower(proposalId, userId),
    queryFn: async () => {
      const qs = buildQueryString({ user_id: userId });
      return fetchJson<EffectiveVotingPower>(
        `/api/proposals/${proposalId}/effective-power${qs}`
      );
    },
    enabled: !!proposalId && !!userId,
  });
}
