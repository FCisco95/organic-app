import { cn } from '@/lib/utils';

interface TwoColumnLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  sidebarPosition?: 'left' | 'right';
  stickyTop?: string;
  className?: string;
}

/**
 * Standardized two-column layout with sidebar.
 * Uses --sidebar-width (default 320px) for consistent sidebar sizing across all pages.
 * Collapses to single column on mobile with sidebar below main content.
 */
export function TwoColumnLayout({
  children,
  sidebar,
  sidebarPosition = 'right',
  stickyTop = 'top-6',
  className,
}: TwoColumnLayoutProps) {
  const mainContent = <div className="min-w-0">{children}</div>;
  const sidebarContent = (
    <aside className={cn('hidden lg:block')}>
      <div className={cn('lg:sticky', stickyTop)}>{sidebar}</div>
    </aside>
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_var(--sidebar-width)]',
        sidebarPosition === 'left' && 'lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]',
        className,
      )}
    >
      {sidebarPosition === 'left' ? (
        <>
          {sidebarContent}
          {mainContent}
        </>
      ) : (
        <>
          {mainContent}
          {sidebarContent}
        </>
      )}
    </div>
  );
}
