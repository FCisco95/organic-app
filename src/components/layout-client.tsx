'use client';

import { Navigation } from './navigation';
import { Toaster } from 'react-hot-toast';

export function LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      {children}
      <Toaster position="bottom-right" />
    </>
  );
}
