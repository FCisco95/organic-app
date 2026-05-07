'use client';

import Image from 'next/image';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EGG_ELEMENTS } from '@/features/easter/elements';
import { cn } from '@/lib/utils';

const ELEMENT_BY_NAME = new Map(EGG_ELEMENTS.map((meta) => [meta.element, meta]));

interface EasterEggBadgeProps {
  elements: string[] | null | undefined;
  className?: string;
  size?: number;
}

export function EasterEggBadge({ elements, className, size = 14 }: EasterEggBadgeProps) {
  if (!elements || elements.length === 0) return null;
  return <EasterEggBadgeIcons elements={elements} className={className} size={size} />;
}

function EasterEggBadgeIcons({
  elements,
  className,
  size,
}: {
  elements: string[];
  className?: string;
  size: number;
}) {
  const sorted = [...elements].sort((a, b) => {
    const ai = ELEMENT_BY_NAME.get(a)?.number ?? 99;
    const bi = ELEMENT_BY_NAME.get(b)?.number ?? 99;
    return ai - bi;
  });

  return (
    <TooltipProvider delayDuration={150}>
      <span className={cn('inline-flex items-center gap-0.5 align-middle', className)}>
        {sorted.map((name) => {
          const meta = ELEMENT_BY_NAME.get(name);
          if (!meta) return null;
          const label = name.charAt(0).toUpperCase() + name.slice(1);
          return (
            <Tooltip key={name}>
              <TooltipTrigger asChild>
                <span
                  aria-label={label}
                  className="inline-flex items-center justify-center"
                  style={{ width: size, height: size }}
                >
                  <Image
                    src={meta.image}
                    alt={label}
                    width={size}
                    height={size}
                    className="object-contain"
                    unoptimized
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </span>
    </TooltipProvider>
  );
}
