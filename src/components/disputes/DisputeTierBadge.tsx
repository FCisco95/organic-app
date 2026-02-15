'use client';

import { Handshake, Users, Shield, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { DisputeTier } from '@/features/disputes/types';
import { DISPUTE_TIER_COLORS } from '@/features/disputes/types';

const TIER_ICON_MAP: Record<DisputeTier, LucideIcon> = {
  mediation: Handshake,
  council: Users,
  admin: Shield,
};

interface DisputeTierBadgeProps {
  tier: string;
  showIcon?: boolean;
  className?: string;
}

export function DisputeTierBadge({
  tier,
  showIcon = true,
  className,
}: DisputeTierBadgeProps) {
  const t = useTranslations('Disputes');
  const fallbackTier: DisputeTier = 'council';
  const safeTier = (tier in TIER_ICON_MAP ? tier : fallbackTier) as DisputeTier;
  const Icon = TIER_ICON_MAP[safeTier];
  const colorClasses = DISPUTE_TIER_COLORS[safeTier] ?? DISPUTE_TIER_COLORS[fallbackTier];
  const tierLabel =
    safeTier === tier
      ? t(`tier.${safeTier}`)
      : tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        colorClasses,
        className
      )}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {tierLabel}
    </span>
  );
}
