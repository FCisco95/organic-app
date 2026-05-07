'use client';

import { Egg } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface EasterEggBadgeProps {
  count: number | null | undefined;
  className?: string;
}

export function EasterEggBadge({ count, className }: EasterEggBadgeProps) {
  if (!count || count < 1) return null;
  return <EasterEggBadgeIcon className={className} />;
}

function EasterEggBadgeIcon({ className }: { className?: string }) {
  const t = useTranslations('Gamification');
  const label = t('easter2026BadgeTooltip');
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label={label}
            className={cn(
              'inline-flex h-4 w-4 items-center justify-center align-middle text-orange-500/90',
              className
            )}
          >
            <Egg className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
