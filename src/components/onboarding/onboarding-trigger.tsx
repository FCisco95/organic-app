'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { useAuth } from '@/features/auth/context';
import { useOnboardingProgress } from '@/features/onboarding/hooks';
import { OnboardingWizard } from './onboarding-wizard';
import type { OnboardingState } from '@/features/onboarding/types';

interface OnboardingContextType {
  onboardingState: OnboardingState | null;
  openWizard: () => void;
  isIncomplete: boolean;
}

const OnboardingContext = createContext<OnboardingContextType>({
  onboardingState: null,
  openWizard: () => {},
  isIncomplete: false,
});

export const useOnboarding = () => useContext(OnboardingContext);

const ONBOARDING_SKIP_KEY = 'organic-onboarding-skipped';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const [wizardOpen, setWizardOpen] = useState(false);
  // Use ref to survive re-renders without retriggering effects
  const hasAutoOpenedRef = useRef(false);

  // Don't fetch onboarding state for admin/council — they don't need the wizard
  const isPrivileged = profile?.role === 'admin' || profile?.role === 'council';
  const shouldFetch = !!user && !loading && !isPrivileged && profile?.onboarding_completed_at === null;

  const { data: onboardingState, refetch } = useOnboardingProgress({
    enabled: shouldFetch,
  });

  const isIncomplete = !!onboardingState && !onboardingState.all_complete;

  // Check skip key upfront — don't rely on effect timing
  const isSkipped = typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_SKIP_KEY) === '1';

  // Auto-open wizard once per mount unless user has skipped
  useEffect(() => {
    if (isIncomplete && !hasAutoOpenedRef.current && !isSkipped) {
      setWizardOpen(true);
    }
    if (isIncomplete) {
      hasAutoOpenedRef.current = true;
    }
  }, [isIncomplete, isSkipped]);

  const openWizard = useCallback(() => {
    setWizardOpen(true);
  }, []);

  const handleWizardOpenChange = useCallback((open: boolean) => {
    setWizardOpen(open);
    if (!open) {
      localStorage.setItem(ONBOARDING_SKIP_KEY, '1');
    }
  }, []);

  const handleRefresh = useCallback(() => {
    refetch().then((result) => {
      if (result.data?.all_complete) {
        localStorage.removeItem(ONBOARDING_SKIP_KEY);
      }
    });
  }, [refetch]);

  return (
    <OnboardingContext.Provider
      value={{
        onboardingState: onboardingState ?? null,
        openWizard,
        isIncomplete,
      }}
    >
      {children}
      {isIncomplete && onboardingState && (
        <OnboardingWizard
          open={wizardOpen}
          onOpenChange={handleWizardOpenChange}
          onboardingState={onboardingState}
          onRefresh={handleRefresh}
        />
      )}
    </OnboardingContext.Provider>
  );
}
