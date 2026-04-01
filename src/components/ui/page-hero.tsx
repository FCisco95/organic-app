import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type HeroVariant = 'dark' | 'frosted' | 'strata';

interface PageHeroProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
  stats?: React.ReactNode;
  badge?: React.ReactNode;
  variant?: HeroVariant;
  className?: string;
}

const variantStyles: Record<HeroVariant, { wrapper: string; icon: string; title: string; desc: string }> = {
  dark: {
    wrapper: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white',
    icon: 'bg-white/10 text-[#E8845C]',
    title: 'text-white',
    desc: 'text-gray-300',
  },
  frosted: {
    wrapper: 'bg-white/80 backdrop-blur-sm border border-border shadow-lg text-foreground',
    icon: 'bg-cta/10 text-cta',
    title: 'text-foreground',
    desc: 'text-muted-foreground',
  },
  strata: {
    wrapper: 'bg-gradient-to-br from-[hsl(30,25%,12%)] via-[hsl(30,20%,15%)] to-[hsl(30,25%,12%)] text-white',
    icon: 'bg-white/10 text-[#E8845C]',
    title: 'text-white',
    desc: 'text-gray-300',
  },
};

export function PageHero({
  icon: Icon,
  title,
  description,
  children,
  stats,
  badge,
  variant = 'dark',
  className,
}: PageHeroProps) {
  const styles = variantStyles[variant];

  return (
    <section
      className={cn(
        'rounded-2xl p-6 sm:p-8 opacity-0 animate-fade-up stagger-1',
        styles.wrapper,
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          {badge && <div className="mb-3">{badge}</div>}
          <div className={cn('inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3', styles.icon)}>
            <Icon className="w-5 h-5" />
          </div>
          <h1 className={cn('text-2xl sm:text-3xl font-bold tracking-tight', styles.title)}>{title}</h1>
          <p className={cn('mt-2 text-sm sm:text-base leading-relaxed', styles.desc)}>
            {description}
          </p>
        </div>
        {children && (
          <div className="flex shrink-0 items-center gap-2">{children}</div>
        )}
      </div>
      {stats && (
        <div className="mt-4 pt-4 border-t border-white/10">
          {stats}
        </div>
      )}
    </section>
  );
}
