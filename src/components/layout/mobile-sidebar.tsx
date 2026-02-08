'use client';

import Image from 'next/image';
import { Link, usePathname } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar-context';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConnectWalletButton } from '@/components/wallet';
import {
  Home,
  BarChart3,
  Wallet,
  Users,
  CheckSquare,
  Zap,
  Vote,
  Trophy,
  Bell,
  Settings,
  User,
  LogOut,
  FileText,
} from 'lucide-react';

export function MobileSidebar() {
  const { user, profile, signOut } = useAuth();
  const pathname = usePathname();
  const t = useTranslations('Navigation');
  const { mobileOpen, setMobileOpen } = useSidebar();

  const isAdminOrCouncil = profile?.role === 'admin' || profile?.role === 'council';

  const navItems = [
    { href: '/', labelKey: 'home', icon: Home, show: true },
    { href: '/analytics', labelKey: 'analytics', icon: BarChart3, show: true },
    { href: '/treasury', labelKey: 'treasury', icon: Wallet, show: true },
    { href: '/members', labelKey: 'members', icon: Users, show: !!user },
    { href: '/tasks', labelKey: 'tasks', icon: CheckSquare, show: !!profile?.organic_id },
    { href: '/tasks/templates', labelKey: 'templates', icon: FileText, show: !!isAdminOrCouncil },
    { href: '/sprints', labelKey: 'sprints', icon: Zap, show: !!profile?.organic_id },
    { href: '/proposals', labelKey: 'proposals', icon: Vote, show: !!user },
    { href: '/leaderboard', labelKey: 'leaderboard', icon: Trophy, show: !!user },
    { href: '/notifications', labelKey: 'notifications', icon: Bell, show: !!user },
    { href: '/admin/settings', labelKey: 'settings', icon: Settings, show: !!isAdminOrCouncil },
    { href: '/profile', labelKey: 'profile', icon: User, show: !!user },
  ];

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar">
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

        <ScrollArea className="flex-1 py-2">
          <nav className="flex flex-col gap-1 px-2">
            {navItems.map(
              (item) =>
                item.show && (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                )
            )}
          </nav>
        </ScrollArea>

        {/* Bottom */}
        <div className="mt-auto border-t border-sidebar-border p-2 space-y-2">
          <div className="px-2">
            <ConnectWalletButton />
          </div>
          {user && (
            <button
              onClick={() => {
                signOut();
                setMobileOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
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
