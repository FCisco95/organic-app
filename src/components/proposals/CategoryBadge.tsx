'use client';

import { Lightbulb, Scale, Wallet, Users, Code, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProposalCategory } from '@/features/proposals/types';
import { PROPOSAL_CATEGORY_LABELS, PROPOSAL_CATEGORY_COLORS } from '@/features/proposals/types';

const CATEGORY_ICON_MAP: Record<ProposalCategory, LucideIcon> = {
  feature: Lightbulb,
  governance: Scale,
  treasury: Wallet,
  community: Users,
  development: Code,
};

interface CategoryBadgeProps {
  category: ProposalCategory;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function CategoryBadge({
  category,
  showIcon = true,
  size = 'sm',
  className,
}: CategoryBadgeProps) {
  const Icon = CATEGORY_ICON_MAP[category];
  const label = PROPOSAL_CATEGORY_LABELS[category];
  const colorClasses = PROPOSAL_CATEGORY_COLORS[category];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        colorClasses,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />}
      {label}
    </span>
  );
}
