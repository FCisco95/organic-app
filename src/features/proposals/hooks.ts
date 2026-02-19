'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ProposalListItem, ProposalWithRelations, ProposalComment } from './types';
import type { ProposalFilters, CreateProposalInput, UpdateProposalInput } from './schemas';

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
          user_profiles!comments_user_id_fkey(
            organic_id,
            email
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
    mutationFn: async (input: CreateProposalInput & { status?: 'draft' | 'submitted' }) => {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create proposal');
      }

      return response.json();
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
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update proposal');
      }

      return response.json();
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
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete proposal');
      }
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
      const response = await fetch(`/api/proposals/${proposalId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      return response.json();
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
      const response = await fetch(`/api/proposals/${proposalId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: proposalKeys.comments(variables.proposalId),
      });
    },
  });
}
