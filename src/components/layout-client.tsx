'use client';

import { usePathname } from '@/i18n/navigation';
import { AppShell } from './layout';
import { Toaster } from 'react-hot-toast';
import { OnboardingProvider } from '@/components/onboarding/onboarding-trigger';

/**
 * Checks whether the pathname is an auth route that should bypass the AppShell.
 * Note: usePathname from @/i18n/navigation already strips the locale prefix.
 */
function isAuthRoute(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/join' ||
    pathname.startsWith('/auth/')
  );
}

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isAuthRoute(pathname)) {
    return (
      <>
        {children}
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <OnboardingProvider>
      <AppShell>
        {children}
        <Toaster position="bottom-right" />
      </AppShell>
    </OnboardingProvider>
  );
}
