'use client';

import { cn } from '@/lib/utils';

const widths = {
  /** Tasks list, sprints list — full available width */
  wide: 'max-w-screen-2xl',
  /** Most pages — 1152px */
  default: 'max-w-6xl',
  /** Proposal detail, leaderboard, forms — 896px */
  narrow: 'max-w-4xl',
} as const;

interface PageContainerProps {
  children: React.ReactNode;
  width?: keyof typeof widths;
  className?: string;
}

export function PageContainer({ children, width = 'default', className }: PageContainerProps) {
  return (
    <div className={cn('mx-auto w-full px-6 lg:px-8 py-6', widths[width], className)}>
      {children}
    </div>
  );
}
