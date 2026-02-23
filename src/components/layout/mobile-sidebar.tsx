'use client';

import Image from 'next/image';
import { Link, usePathname } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { usePendingDisputeCount } from '@/features/disputes/hooks';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar-context';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ConnectWalletButton } from '@/components/wallet';
import { LogOut } from 'lucide-react';
import { getSidebarNavSections } from './nav-config';

export function MobileSidebar() {
  const { user, profile, signOut } = useAuth();
  const pathname = usePathname();
  const t = useTranslations('Navigation');
  const { mobileOpen, setMobileOpen } = useSidebar();

  const isAdminOrCouncil = profile?.role === 'admin' || profile?.role === 'council';
  const { data: pendingData } = usePendingDisputeCount(!!user && isAdminOrCouncil);
  const pendingCount = pendingData?.count ?? 0;
  const progressionSource = pathname.startsWith('/tasks')
    ? 'tasks'
    : pathname.startsWith('/proposals')
      ? 'proposals'
      : pathname.startsWith('/profile')
        ? 'profile'
        : null;
  const progressionHref = progressionSource
    ? `/profile/progression?from=${progressionSource}`
    : '/profile/progression';

  const sections = getSidebarNavSections({
    isAuthenticated: !!user,
    hasOrganicId: !!profile?.organic_id,
    isAdminOrCouncil,
    progressionHref,
  });
  const navItems = [...sections.main, ...sections.admin, ...sections.utility];

  const isActive = (href: string) => {
    const normalizedHref = href.split('?')[0];
    if (normalizedHref === '/') return pathname === '/';
    return pathname === normalizedHref || pathname.startsWith(`${normalizedHref}/`);
  };

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="w-72 h-dvh p-0 bg-sidebar flex flex-col overflow-hidden">
        {/* Logo */}
        <div className="flex items-center h-20 gap-3 px-4">
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
            <Image
              src="/organic-logo.png"
              alt={t('logoAlt')}
              width={360}
              height={360}
              className="h-16 w-16 shrink-0 object-contain"
              priority
            />
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
              Organic
            </span>
          </Link>
        </div>

        <Separator className="bg-sidebar-border" />

        <ScrollArea className="flex-1 min-h-0 py-2">
          <nav className="flex flex-col gap-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{t(item.labelKey)}</span>
                {item.id === 'disputes' && isAdminOrCouncil && pendingCount > 0 ? (
                  <Badge className="ml-auto min-w-5 h-5 px-1.5 bg-orange-600 text-white text-[10px] leading-none flex items-center justify-center">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </Badge>
                ) : null}
              </Link>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom */}
        <div className="mt-auto border-t border-sidebar-border p-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] space-y-2">
          <div className="px-2">
            <ConnectWalletButton />
          </div>
          {user && (
            <button
              onClick={() => {
                signOut();
                setMobileOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>{t('signOut')}</span>
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
