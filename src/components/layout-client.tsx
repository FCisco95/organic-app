'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from './layout';
import { Toaster } from 'react-hot-toast';
import { OnboardingProvider } from '@/components/onboarding/onboarding-trigger';

/**
 * Strips the locale prefix (e.g. "/en", "/pt-PT", "/zh-CN") from the pathname,
 * then checks whether it matches an auth route that should bypass the AppShell.
 */
function isAuthRoute(pathname: string): boolean {
  // Remove locale prefix: "/en/login" -> "/login", "/pt-PT/signup" -> "/signup"
  const stripped = pathname.replace(/^\/[a-z]{2}(-[a-zA-Z]{2,})?/, '') || '/';
  return (
    stripped === '/login' ||
    stripped === '/signup' ||
    stripped === '/join' ||
    stripped.startsWith('/auth/')
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
