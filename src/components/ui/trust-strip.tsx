import { Check, AlertTriangle, type LucideIcon } from 'lucide-react';

export type TrustVariant = 'positive' | 'neutral' | 'warning';

export interface TrustItem {
  key: string;
  label: string;
  variant: TrustVariant;
  /** Optional Lucide icon override. Defaults to Check (positive) or AlertTriangle (warning). */
  icon?: LucideIcon;
}

interface TrustStripProps {
  items: TrustItem[];
  className?: string;
}

const VARIANT_STYLES: Record<TrustVariant, string> = {
  positive:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200',
  neutral:
    'border-border bg-muted/40 text-foreground/80',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200',
};

const DEFAULT_ICON: Record<TrustVariant, LucideIcon | null> = {
  positive: Check,
  neutral: null,
  warning: AlertTriangle,
};

export function TrustStrip({ items, className }: TrustStripProps) {
  if (items.length === 0) return null;

  return (
    <ul
      role="list"
      data-testid="trust-strip"
      className={`flex flex-wrap items-center gap-1.5 ${className ?? ''}`}
    >
      {items.map((item) => {
        const Icon = item.icon ?? DEFAULT_ICON[item.variant];
        return (
          <li
            key={item.key}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${VARIANT_STYLES[item.variant]}`}
          >
            {Icon && <Icon aria-hidden="true" className="h-3 w-3" />}
            <span>{item.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
