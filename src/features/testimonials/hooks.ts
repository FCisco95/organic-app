'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import type {
  ApprovedTestimonial,
  PendingTestimonial,
  SubmitTestimonialInput,
} from './types';

const testimonialKeys = {
  all: ['testimonials'] as const,
  approved: () => [...testimonialKeys.all, 'approved'] as const,
  pending: () => [...testimonialKeys.all, 'pending'] as const,
};

export function useApprovedTestimonials() {
  return useQuery({
    queryKey: testimonialKeys.approved(),
    queryFn: async (): Promise<ApprovedTestimonial[]> => {
      const { data } = await fetchJson<{ data: ApprovedTestimonial[]; error: string | null }>(
        '/api/testimonials'
      );
      return data ?? [];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function usePendingTestimonials() {
  return useQuery({
    queryKey: testimonialKeys.pending(),
    queryFn: async (): Promise<PendingTestimonial[]> => {
      const { data } = await fetchJson<{ data: PendingTestimonial[]; error: string | null }>(
        '/api/testimonials/admin'
      );
      return data ?? [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useSubmitTestimonial() {
  return useMutation({
    mutationFn: async (input: SubmitTestimonialInput) => {
      return fetchJson<{ data: { ok: boolean }; error: string | null }>(
        '/api/testimonials',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }
      );
    },
  });
}

export function useReviewTestimonial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { testimonialId: string; action: 'approve' | 'reject' }) => {
      return fetchJson<{ data: { ok: boolean }; error: string | null }>(
        '/api/testimonials/admin',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vars),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testimonialKeys.pending() });
      queryClient.invalidateQueries({ queryKey: testimonialKeys.approved() });
    },
  });
}
