'use client';

import Image from 'next/image';
import { Link, usePathname } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  show: boolean;
}

export function Sidebar() {
  const { user, profile, signOut } = useAuth();
  const pathname = usePathname();
  const t = useTranslations('Navigation');
  const { collapsed } = useSidebar();

  const isAdminOrCouncil = profile?.role === 'admin' || profile?.role === 'council';

  const navItems: NavItem[] = [
    { href: '/', labelKey: 'home', icon: Home, show: true },
    { href: '/analytics', labelKey: 'analytics', icon: BarChart3, show: true },
    { href: '/treasury', labelKey: 'treasury', icon: Wallet, show: true },
    { href: '/members', labelKey: 'members', icon: Users, show: !!user },
    { href: '/tasks', labelKey: 'tasks', icon: CheckSquare, show: !!profile?.organic_id },
    { href: '/sprints', labelKey: 'sprints', icon: Zap, show: !!profile?.organic_id },
    { href: '/proposals', labelKey: 'proposals', icon: Vote, show: !!user },
    { href: '/leaderboard', labelKey: 'leaderboard', icon: Trophy, show: !!user },
    { href: '/notifications', labelKey: 'notifications', icon: Bell, show: !!user },
  ];

  const bottomItems: NavItem[] = [
    { href: '/admin/settings', labelKey: 'settings', icon: Settings, show: !!isAdminOrCouncil },
    { href: '/profile', labelKey: 'profile', icon: User, show: !!user },
  ];

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div
        className={cn('flex items-center h-20 px-3', collapsed ? 'justify-center' : 'gap-3 px-4')}
      >
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/organic-logo.png"
            alt={t('logoAlt')}
            width={360}
            height={360}
            className={cn('shrink-0 object-contain', collapsed ? 'h-10 w-10' : 'h-16 w-16')}
            priority
          />
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
              Organic
            </span>
          )}
        </Link>
      </div>

      <div className="mx-3 h-px bg-sidebar-border" />

      {/* Main nav */}
      <ScrollArea className="flex-1 pt-4 pb-2">
        <TooltipProvider delayDuration={0}>
          <nav className={cn('flex flex-col gap-0.5', collapsed ? 'px-2' : 'px-3')}>
            {navItems.map(
              (item) =>
                item.show && (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={t(item.labelKey)}
                    icon={item.icon}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                  />
                )
            )}
          </nav>
        </TooltipProvider>
      </ScrollArea>

      {/* Bottom section */}
      <div className="mt-auto">
        <div className="mx-3 h-px bg-sidebar-border" />
        <TooltipProvider delayDuration={0}>
          <nav className={cn('flex flex-col gap-0.5 py-3', collapsed ? 'px-2' : 'px-3')}>
            {bottomItems.map(
              (item) =>
                item.show && (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={t(item.labelKey)}
                    icon={item.icon}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                  />
                )
            )}
            {user && (
              <SignOutButton label={t('signOut')} collapsed={collapsed} onSignOut={signOut} />
            )}
          </nav>
        </TooltipProvider>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150',
        active
          ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
          : 'font-medium text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-sidebar-foreground',
        collapsed && 'justify-center px-0'
      )}
    >
      {/* Active indicator bar */}
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-organic-orange" />
      )}
      <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-organic-orange')} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function SignOutButton({
  label,
  collapsed,
  onSignOut,
}: {
  label: string;
  collapsed: boolean;
  onSignOut: () => void;
}) {
  const btn = (
    <button
      onClick={onSignOut}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
        'text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-red-400',
        collapsed && 'justify-center px-0'
      )}
    >
      <LogOut className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span>{label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return btn;
}
