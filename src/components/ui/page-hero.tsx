import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeroProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHero({ icon: Icon, title, description, children, className }: PageHeroProps) {
  return (
    <section
      className={cn(
        'rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 text-white opacity-0 animate-fade-up stagger-1',
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-white/10 rounded-xl mb-3">
            <Icon className="w-5 h-5 text-orange-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-300 leading-relaxed">
            {description}
          </p>
        </div>
        {children && (
          <div className="flex shrink-0 items-center gap-2">{children}</div>
        )}
      </div>
    </section>
  );
}
