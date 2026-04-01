import { cn } from '@/lib/utils';

type SectionCardVariant = 'default' | 'sunken' | 'raised' | 'highlighted';
type SectionCardPadding = 'compact' | 'default' | 'spacious';

interface SectionCardProps {
  children: React.ReactNode;
  variant?: SectionCardVariant;
  padding?: SectionCardPadding;
  title?: string;
  className?: string;
}

const variantStyles: Record<SectionCardVariant, string> = {
  default: 'rounded-xl border border-border bg-card',
  sunken: 'rounded-xl bg-surface-sunken',
  raised: 'rounded-xl border border-border bg-card shadow-md hover:shadow-lg transition-shadow',
  highlighted: 'rounded-xl border border-border bg-card ring-1 ring-cta/20 border-l-2 border-l-cta',
};

const paddingStyles: Record<SectionCardPadding, string> = {
  compact: 'p-3 sm:p-4',
  default: 'p-4 sm:p-6',
  spacious: 'p-6 sm:p-8',
};

export function SectionCard({
  children,
  variant = 'default',
  padding = 'default',
  title,
  className,
}: SectionCardProps) {
  return (
    <div className={cn(variantStyles[variant], paddingStyles[padding], className)}>
      {title && (
        <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
}
