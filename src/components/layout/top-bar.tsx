'use client';

import { Link } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar-context';
import { ConnectWalletButton } from '@/components/wallet';
import LocaleSwitcher from '@/components/locale-switcher';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, User, LogOut, Sparkles, Rocket } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useOnboarding } from '@/components/onboarding/onboarding-trigger';

export function TopBar() {
  const { user, profile, loading, signOut } = useAuth();
  const t = useTranslations('Navigation');
  const { toggle, setMobileOpen } = useSidebar();
  const { onboardingState, openWizard, isIncomplete } = useOnboarding();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-card/80 backdrop-blur-sm px-4">
      {/* Left: sidebar toggles */}
      <div className="flex items-center gap-2">
        {/* Desktop toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex h-8 w-8"
          onClick={toggle}
        >
          <Menu className="h-4 w-4" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-10 w-10"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {loading ? (
          <div className="h-8 w-24 rounded bg-muted animate-pulse" />
        ) : user ? (
          <>
            {/* Organic ID Badge */}
            {profile?.organic_id && (
              <Badge
                variant="outline"
                className="hidden sm:flex gap-1.5 border-primary/30 bg-primary/5 text-primary"
              >
                <span className="text-xs font-medium">ID #{profile.organic_id}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize',
                    profile.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : profile.role === 'council'
                        ? 'bg-blue-100 text-blue-700'
                        : profile.role === 'member'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-muted text-muted-foreground'
                  )}
                >
                  {profile.role}
                </span>
              </Badge>
            )}

            {/* Wallet */}
            <div className="shrink-0">
              <ConnectWalletButton mobileIconOnly />
            </div>

            {/* Notifications */}
            <NotificationBell />

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    {profile?.avatar_url && (
                      <AvatarImage src={profile.avatar_url} alt="User avatar" />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {(profile?.name || user?.email || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/quests" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t('refAndQuests')}
                  </Link>
                </DropdownMenuItem>
                {isIncomplete && onboardingState && (
                  <DropdownMenuItem onClick={openWizard} className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-organic-orange" />
                    <span className="flex-1">{t('onboarding')}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-organic-orange/20 text-organic-orange">
                      {onboardingState.completed_count}/{onboardingState.total_steps}
                    </span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  {t('signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <LocaleSwitcher />
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {t('signIn')}
            </Link>
            <LocaleSwitcher />
          </>
        )}
      </div>
    </header>
  );
}
