'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
      const res = await fetch('/api/onboarding/steps');
      if (!res.ok) {
        throw new Error('Failed to fetch onboarding progress');
      }
      const json = await res.json();
      return onboardingStateSchema.parse(json);
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
      const res = await fetch(`/api/onboarding/steps/${step}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id, sprint_id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to complete onboarding step');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
      queryClient.invalidateQueries({ queryKey: gamificationKeys.all });
    },
  });
}
