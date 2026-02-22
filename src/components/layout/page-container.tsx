'use client';

import { cn } from '@/lib/utils';

/**
 * Hybrid container strategy
 *
 * fluid      – operator surfaces (lists, dashboards, data-dense pages)
 *              max-w-[1600px], generous horizontal padding at xl+
 *
 * structured – detail / form pages (single-item focus, reading-heavy)
 *              max-w-[1400px], tighter horizontal padding
 *
 * Legacy width aliases kept for backwards-compat during migration.
 */

const layouts = {
  /** Operator surfaces: tasks list, disputes list, members, treasury, analytics */
  fluid: 'max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-12',
  /** Detail pages: task detail, dispute detail, proposal detail, forms */
  structured: 'max-w-[1400px] px-4 sm:px-6 lg:px-8',
} as const;

/* ── Legacy width aliases → mapped to layout variants ────────────── */
const legacyWidths: Record<string, keyof typeof layouts> = {
  wide: 'fluid',
  default: 'structured',
  narrow: 'structured',
};

/* Narrow still needs its own cap so detail pages stay readable */
const narrowOverride = 'max-w-4xl px-4 sm:px-6 lg:px-8';

type LayoutVariant = keyof typeof layouts;
type LegacyWidth = 'wide' | 'default' | 'narrow';

interface PageContainerProps {
  children: React.ReactNode;
  /** New layout variant (preferred) */
  layout?: LayoutVariant;
  /** @deprecated Use `layout` instead. Kept for migration compatibility. */
  width?: LegacyWidth;
  className?: string;
}

export function PageContainer({
  children,
  layout,
  width,
  className,
}: PageContainerProps) {
  let containerClasses: string;

  if (layout) {
    // New API takes priority
    containerClasses = layouts[layout];
  } else if (width === 'narrow') {
    // Narrow keeps its own max-width cap
    containerClasses = narrowOverride;
  } else if (width) {
    // Map legacy width to new layout variant
    containerClasses = layouts[legacyWidths[width]];
  } else {
    // Default → structured
    containerClasses = layouts.structured;
  }

  return (
    <div className={cn('mx-auto w-full py-6', containerClasses, className)}>
      {children}
    </div>
  );
}
