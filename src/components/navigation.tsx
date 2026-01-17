'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { cn } from '@/lib/utils';
import LocaleSwitcher from './locale-switcher';

export function Navigation() {
  const { user, profile, loading, signOut } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Home', show: true },
    { href: '/profile', label: 'Profile', show: !!user },
    { href: '/proposals', label: 'Proposals', show: !!user },
    { href: '/tasks', label: 'Tasks', show: !!profile?.organic_id },
    { href: '/sprints', label: 'Sprints', show: !!profile?.organic_id },
    { href: '/leaderboard', label: 'Leaderboard', show: !!user },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center group">
              <Image
                src="/organic-logo.png"
                alt="Organic Logo"
                width={200}
                height={67}
                className="h-16 w-auto transition-transform group-hover:scale-105"
                priority
              />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map(
              (link) =>
                link.show && (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                      pathname === link.href
                        ? 'bg-organic-orange/10 text-organic-orange'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )}
                  >
                    {link.label}
                  </Link>
                )
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {loading ? (
              <div className="h-8 w-24 bg-gray-100 rounded animate-pulse"></div>
            ) : user ? (
              <>
                {/* Organic ID Badge */}
                {profile?.organic_id && (
                  <div className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-organic-orange/10 to-organic-yellow/10 px-3 py-1.5 rounded-full border border-organic-orange/20">
                    <span className="text-xs font-medium text-organic-orange">
                      ID #{profile.organic_id}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                      profile.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      profile.role === 'council' ? 'bg-blue-100 text-blue-700' :
                      profile.role === 'member' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      {profile.role}
                    </span>
                  </div>
                )}

                {/* User Avatar */}
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                  title="View Profile"
                >
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={(profile as any).name || 'User avatar'}
                      width={32}
                      height={32}
                      className="rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow flex items-center justify-center border-2 border-gray-200">
                      <span className="text-white text-sm font-bold">
                        {((profile as any)?.name || user?.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </Link>

                {/* Wallet Button */}
                <div className="hidden lg:block">
                  <WalletMultiButton />
                </div>

                {/* Sign Out */}
                <button
                  onClick={signOut}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Sign Out
                </button>
                <LocaleSwitcher />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <LocaleSwitcher />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {user && (
        <div className="md:hidden border-t border-gray-200 bg-gray-50">
          <div className="px-4 py-2 space-y-1">
            {navLinks.map(
              (link) =>
                link.show && (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      pathname === link.href
                        ? 'bg-organic-orange/10 text-organic-orange'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    )}
                  >
                    {link.label}
                  </Link>
                )
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
