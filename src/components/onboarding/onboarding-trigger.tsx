'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
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
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const shouldFetch = !!user && !loading && profile?.onboarding_completed_at === null;

  const { data: onboardingState, refetch } = useOnboardingProgress({
    enabled: shouldFetch,
  });

  const isIncomplete = !!onboardingState && !onboardingState.all_complete;

  // Auto-open wizard once per session unless user has skipped it
  useEffect(() => {
    if (isIncomplete && !hasAutoOpened) {
      const skipped = localStorage.getItem(ONBOARDING_SKIP_KEY);
      if (!skipped) {
        setWizardOpen(true);
      }
      setHasAutoOpened(true);
    }
  }, [isIncomplete, hasAutoOpened]);

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
