'use client';

import { cn } from '@/lib/utils';
import { getDonorBadgeTier, type DonorBadgeTier } from '@/features/donations/types';

interface DonorBadgeProps {
  cumulativeUsd: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function DonorBadge({ cumulativeUsd, size = 'md', showLabel = true, className }: DonorBadgeProps) {
  const tier = getDonorBadgeTier(cumulativeUsd);

  if (!tier) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        SIZE_CLASSES[size],
        className
      )}
      style={{
        backgroundColor: `${tier.color}20`,
        color: tier.color,
        border: `1px solid ${tier.color}40`,
      }}
      title={`${tier.label} — $${Math.floor(cumulativeUsd)} donated`}
    >
      <span>{tier.icon}</span>
      {showLabel && <span>{tier.label}</span>}
    </span>
  );
}

export function DonorBadgeFromTier({ tier, size = 'md', showLabel = true, className }: {
  tier: DonorBadgeTier | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}) {
  if (!tier) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        SIZE_CLASSES[size],
        className
      )}
      style={{
        backgroundColor: `${tier.color}20`,
        color: tier.color,
        border: `1px solid ${tier.color}40`,
      }}
      title={tier.label}
    >
      <span>{tier.icon}</span>
      {showLabel && <span>{tier.label}</span>}
    </span>
  );
}
