'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { fetchJson } from '@/lib/fetch-json';
import type { ProposalListItem, ProposalWithRelations, ProposalComment } from './types';
import type { ProposalFilters, CreateProposalInput, UpdateProposalInput } from './schemas';

// ── Eligibility types + hook ──────────────────────────────────────────

export type EligibilityCheck = {
  eligible: boolean;
  privileged?: boolean;
  reason?: string;
  checks: {
    threshold?: { ok: boolean; reason?: string; required?: number; current?: number };
    maxLive?: { ok: boolean; activeCount?: number; maxAllowed?: number };
    cooldown?: { ok: boolean; remainingDays?: number; cooldownDays?: number };
  };
};

export function useProposalEligibility(enabled = true) {
  return useQuery<EligibilityCheck>({
    queryKey: ['proposals', 'eligibility'],
    queryFn: () => fetchJson<EligibilityCheck>('/api/proposals/eligibility'),
    enabled,
    staleTime: 30_000,
  });
}

// Query keys
export const proposalKeys = {
  all: ['proposals'] as const,
  lists: () => [...proposalKeys.all, 'list'] as const,
  list: (filters: ProposalFilters) => [...proposalKeys.lists(), filters] as const,
  details: () => [...proposalKeys.all, 'detail'] as const,
  detail: (id: string) => [...proposalKeys.details(), id] as const,
  comments: (proposalId: string) => [...proposalKeys.all, 'comments', proposalId] as const,
};

/**
 * Fetch proposals with optional filters, with comment counts in one parallel round trip.
 *
 * get_comment_counts_for_type() needs no proposal IDs, so the two DB calls
 * run concurrently via Promise.all instead of sequentially.
 */
export function useProposals(filters: ProposalFilters = {}) {
  const supabase = createClient();

  return useQuery({
    queryKey: proposalKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('proposals')
        .select(
          `
          *,
          user_profiles!proposals_created_by_fkey(
            organic_id,
            email
          )
        `
        )
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.search) {
        query = query.textSearch('search_vector', filters.search, {
          type: 'websearch',
          config: 'english',
        });
      }
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }

      // Fetch proposals and all proposal comment counts in parallel.
      // get_comment_counts_for_type() needs no IDs, eliminating the sequential dependency.
      const [proposalsResult, countsResult] = await Promise.all([
        query,
        supabase.rpc('get_comment_counts_for_type', { p_subject_type: 'proposal' }),
      ]);

      if (proposalsResult.error) throw proposalsResult.error;
      if (countsResult.error) throw countsResult.error;

      if ((proposalsResult.data ?? []).length === 0) return [] as ProposalListItem[];

      const countMap = new Map(
        (countsResult.data ?? []).map((row: { subject_id: string; count: number }) => [
          row.subject_id,
          row.count,
        ])
      );

      return (proposalsResult.data ?? []).map((proposal) => ({
        ...proposal,
        comments_count: countMap.get(proposal.id) ?? 0,
      })) as unknown as ProposalListItem[];
    },
  });
}

/**
 * Fetch a single proposal by ID
 */
export function useProposal(proposalId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: proposalKeys.detail(proposalId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select(
          `
          *,
          proposal_versions!proposals_current_version_id_fkey(
            id,
            version_number,
            created_at
          ),
          user_profiles!proposals_created_by_fkey(
            organic_id,
            email,
            wallet_pubkey
          )
        `
        )
        .eq('id', proposalId)
        .single();

      if (error) throw error;
      return data as unknown as ProposalWithRelations;
    },
    enabled: !!proposalId,
  });
}

/**
 * Fetch comments for a proposal
 */
export function useProposalComments(proposalId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: proposalKeys.comments(proposalId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(
          `
          *,
          proposal_versions!comments_proposal_version_id_fkey(
            version_number
          ),
          user_profiles!comments_user_id_fkey(
            organic_id,
            email,
            display_name
          )
        `
        )
        .eq('subject_type', 'proposal')
        .eq('subject_id', proposalId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as ProposalComment[];
    },
    enabled: !!proposalId,
  });
}

/**
 * Create a new proposal
 */
export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProposalInput & { status?: 'draft' | 'public' | 'submitted' }) => {
      return fetchJson<{ id: string }>('/api/proposals', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() });
    },
  });
}

/**
 * Update a proposal
 */
export function useUpdateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      updates,
    }: {
      proposalId: string;
      updates: UpdateProposalInput;
    }) => {
      return fetchJson<{ id?: string }>(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: proposalKeys.detail(data.id) });
      }
    },
  });
}

/**
 * Delete a proposal
 */
export function useDeleteProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      await fetchJson(`/api/proposals/${proposalId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() });
    },
  });
}

/**
 * Update proposal status (admin/council only)
 */
export function useUpdateProposalStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proposalId, status }: { proposalId: string; status: string }) => {
      return fetchJson<{ id?: string }>(`/api/proposals/${proposalId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: proposalKeys.detail(data.id) });
      }
    },
  });
}

/**
 * Add a comment to a proposal
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proposalId, body }: { proposalId: string; body: string }) => {
      return fetchJson(`/api/proposals/${proposalId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: proposalKeys.comments(variables.proposalId),
      });
    },
  });
}
