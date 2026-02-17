'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  DisputeWithRelations,
  DisputeListItem,
  DisputeComment,
  DisputeConfig,
  ArbitratorStats,
  ReviewerAccuracyStats,
} from './types';
import type {
  DisputeFilters,
  CreateDisputeInput,
  RespondToDisputeInput,
  ResolveDisputeInput,
  AppealDisputeInput,
  MediateDisputeInput,
  DisputeCommentInput,
} from './schemas';

// ─── Query keys ───────────────────────────────────────────────────────────

export const disputeKeys = {
  all: ['disputes'] as const,
  lists: () => [...disputeKeys.all, 'list'] as const,
  list: (filters: DisputeFilters) => [...disputeKeys.lists(), filters] as const,
  details: () => [...disputeKeys.all, 'detail'] as const,
  detail: (id: string) => [...disputeKeys.details(), id] as const,
  comments: (disputeId: string) => [...disputeKeys.all, 'comments', disputeId] as const,
  config: () => [...disputeKeys.all, 'config'] as const,
  eligibility: (submissionId: string) => [...disputeKeys.all, 'eligibility', submissionId] as const,
  pendingCount: () => [...disputeKeys.all, 'pending-count'] as const,
  stats: () => [...disputeKeys.all, 'stats'] as const,
  reviewerAccuracy: (reviewerId?: string) =>
    [...disputeKeys.all, 'reviewer-accuracy', reviewerId ?? 'global'] as const,
};

// ─── Helpers ──────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

// ─── Query hooks ──────────────────────────────────────────────────────────

/** Fetch disputes with optional filters */
export function useDisputes(filters: DisputeFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.tier) params.set('tier', filters.tier);
  if (filters.sprint_id) params.set('sprint_id', filters.sprint_id);
  if (filters.my_disputes) params.set('my_disputes', 'true');

  const qs = params.toString();

  return useQuery({
    queryKey: disputeKeys.list(filters),
    queryFn: () =>
      fetchJson<{ data: DisputeListItem[]; total: number }>(
        `/api/disputes${qs ? `?${qs}` : ''}`
      ),
  });
}

/** Fetch a single dispute by ID */
export function useDispute(disputeId: string) {
  return useQuery({
    queryKey: disputeKeys.detail(disputeId),
    queryFn: () =>
      fetchJson<{ data: DisputeWithRelations }>(`/api/disputes/${disputeId}`),
    enabled: !!disputeId,
  });
}

/** Fetch comments for a dispute */
export function useDisputeComments(disputeId: string) {
  return useQuery({
    queryKey: disputeKeys.comments(disputeId),
    queryFn: () =>
      fetchJson<{ data: DisputeComment[] }>(`/api/disputes/${disputeId}/comments`),
    enabled: !!disputeId,
  });
}

/** Fetch dispute config from org settings */
export function useDisputeConfig() {
  return useQuery({
    queryKey: disputeKeys.config(),
    queryFn: () => fetchJson<{ data: DisputeConfig }>('/api/disputes?config=true'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/** Check if user can file a dispute on a submission */
export function useDisputeEligibility(submissionId: string) {
  return useQuery({
    queryKey: disputeKeys.eligibility(submissionId),
    queryFn: () =>
      fetchJson<{
        eligible: boolean;
        reason?: string;
        xp_stake: number;
        user_xp: number;
      }>(`/api/disputes?check_eligibility=${submissionId}`),
    enabled: !!submissionId,
  });
}

/** Fetch pending dispute count for sidebar badges */
export function usePendingDisputeCount(enabled = true) {
  return useQuery({
    queryKey: disputeKeys.pendingCount(),
    queryFn: () => fetchJson<{ count: number }>('/api/disputes?pending_count=true'),
    enabled,
    staleTime: 120 * 1000, // 2 minutes
    refetchInterval: 120 * 1000,
    refetchOnWindowFocus: true,
  });
}

/** Fetch arbitrator performance stats for council/admin dashboard */
export function useArbitratorStats(enabled = true) {
  return useQuery({
    queryKey: disputeKeys.stats(),
    queryFn: () => fetchJson<{ data: ArbitratorStats }>('/api/disputes?stats=true'),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

/** Fetch reviewer accuracy metrics for accountability tracking */
export function useReviewerAccuracy(enabled = true, reviewerId?: string) {
  const params = new URLSearchParams();
  params.set('reviewer_accuracy', 'true');
  if (reviewerId) params.set('reviewer_id', reviewerId);

  return useQuery({
    queryKey: disputeKeys.reviewerAccuracy(reviewerId),
    queryFn: () =>
      fetchJson<{ data: ReviewerAccuracyStats }>(`/api/disputes?${params.toString()}`),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ─── Mutation hooks ───────────────────────────────────────────────────────

/** Create a new dispute */
export function useCreateDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDisputeInput) =>
      fetchJson<{ data: DisputeWithRelations }>('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: disputeKeys.lists() });
    },
  });
}

/** Reviewer submits counter-argument */
export function useRespondToDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      disputeId,
      input,
    }: {
      disputeId: string;
      input: RespondToDisputeInput;
    }) =>
      fetchJson<{ data: DisputeWithRelations }>(`/api/disputes/${disputeId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: disputeKeys.detail(variables.disputeId) });
      queryClient.invalidateQueries({ queryKey: disputeKeys.lists() });
    },
  });
}

/** Arbitrator resolves a dispute */
export function useResolveDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      disputeId,
      input,
    }: {
      disputeId: string;
      input: ResolveDisputeInput;
    }) =>
      fetchJson<{ data: DisputeWithRelations }>(`/api/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: disputeKeys.detail(variables.disputeId) });
      queryClient.invalidateQueries({ queryKey: disputeKeys.lists() });
    },
  });
}

/** Disputant appeals a council ruling */
export function useAppealDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      disputeId,
      input,
    }: {
      disputeId: string;
      input: AppealDisputeInput;
    }) =>
      fetchJson<{ data: DisputeWithRelations }>(`/api/disputes/${disputeId}/appeal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: disputeKeys.detail(variables.disputeId) });
      queryClient.invalidateQueries({ queryKey: disputeKeys.lists() });
    },
  });
}

/** Withdraw a dispute */
export function useWithdrawDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (disputeId: string) =>
      fetchJson<{ data: DisputeWithRelations }>(`/api/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw' }),
      }),
    onSuccess: (_, disputeId) => {
      queryClient.invalidateQueries({ queryKey: disputeKeys.detail(disputeId) });
      queryClient.invalidateQueries({ queryKey: disputeKeys.lists() });
    },
  });
}

/** Assign self as arbitrator */
export function useAssignArbitrator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (disputeId: string) =>
      fetchJson<{ data: DisputeWithRelations }>(`/api/disputes/${disputeId}/assign`, {
        method: 'POST',
      }),
    onSuccess: (_, disputeId) => {
      queryClient.invalidateQueries({ queryKey: disputeKeys.detail(disputeId) });
      queryClient.invalidateQueries({ queryKey: disputeKeys.lists() });
    },
  });
}

/** Recuse self as arbitrator */
export function useRecuseArbitrator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (disputeId: string) =>
      fetchJson<{ data: DisputeWithRelations }>(`/api/disputes/${disputeId}/assign`, {
        method: 'DELETE',
      }),
    onSuccess: (_, disputeId) => {
      queryClient.invalidateQueries({ queryKey: disputeKeys.detail(disputeId) });
      queryClient.invalidateQueries({ queryKey: disputeKeys.lists() });
    },
  });
}

/** Both parties agree to mediation */
export function useMediateDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      disputeId,
      input,
    }: {
      disputeId: string;
      input: MediateDisputeInput;
    }) =>
      fetchJson<{ data: DisputeWithRelations }>(`/api/disputes/${disputeId}/mediate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: disputeKeys.detail(variables.disputeId) });
      queryClient.invalidateQueries({ queryKey: disputeKeys.lists() });
    },
  });
}

/** Add a comment to a dispute */
export function useAddDisputeComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      disputeId,
      input,
    }: {
      disputeId: string;
      input: DisputeCommentInput;
    }) =>
      fetchJson<{ data: DisputeComment }>(`/api/disputes/${disputeId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: disputeKeys.comments(variables.disputeId) });
    },
  });
}
