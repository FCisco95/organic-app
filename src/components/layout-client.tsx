'use client';

import { AppShell } from './layout';
import { Toaster } from 'react-hot-toast';

export function LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <Toaster position="bottom-right" />
    </AppShell>
  );
}
