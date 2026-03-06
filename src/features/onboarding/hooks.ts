'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import type { OnboardingState, OnboardingStep, CompleteStepResponse } from './types';
import { onboardingStateSchema } from './schemas';
import { gamificationKeys } from '@/features/gamification/hooks';

export const onboardingKeys = {
  all: ['onboarding'] as const,
  progress: () => [...onboardingKeys.all, 'progress'] as const,
};

export function useOnboardingProgress(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: onboardingKeys.progress(),
    queryFn: async (): Promise<OnboardingState> => {
      const json = await fetchJson<Record<string, unknown>>('/api/onboarding/steps');
      return onboardingStateSchema.parse(json) as OnboardingState;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled,
  });
}

export function useCompleteOnboardingStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      step,
      task_id,
      sprint_id,
    }: {
      step: OnboardingStep;
      task_id?: string;
      sprint_id?: string;
    }): Promise<CompleteStepResponse> => {
      return fetchJson<CompleteStepResponse>(`/api/onboarding/steps/${step}/complete`, {
        method: 'POST',
        body: JSON.stringify({ task_id, sprint_id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
      queryClient.invalidateQueries({ queryKey: gamificationKeys.all });
    },
  });
}
