'use client';

import { AppShell } from './layout';
import { Toaster } from 'react-hot-toast';
import { OnboardingProvider } from '@/components/onboarding/onboarding-trigger';

export function LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <AppShell>
        {children}
        <Toaster position="bottom-right" />
      </AppShell>
    </OnboardingProvider>
  );
}
