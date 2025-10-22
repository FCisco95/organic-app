'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { cn } from '@/lib/utils';

export function Navigation() {
  const { user, profile, loading, signOut } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Home', show: true },
    { href: '/profile', label: 'Profile', show: !!user },
    { href: '/proposals', label: 'Proposals', show: !!user },
    { href: '/tasks', label: 'Tasks', show: !!profile?.organic_id },
    { href: '/sprints', label: 'Sprints', show: !!profile?.organic_id },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-organic-500 to-organic-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">O</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-organic-600 to-organic-800 bg-clip-text text-transparent">
                Organic
              </span>
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
                      'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      pathname === link.href
                        ? 'bg-organic-50 text-organic-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    {link.label}
                  </Link>
                )
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
            ) : user ? (
              <>
                {/* Organic ID Badge */}
                {profile?.organic_id && (
                  <div className="hidden sm:flex items-center space-x-2 bg-organic-50 px-3 py-1 rounded-full border border-organic-200">
                    <span className="text-xs font-medium text-organic-700">
                      ID #{profile.organic_id}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      profile.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      profile.role === 'council' ? 'bg-blue-100 text-blue-700' :
                      profile.role === 'member' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      {profile.role}
                    </span>
                  </div>
                )}

                {/* Wallet Button */}
                <div className="hidden lg:block">
                  <WalletMultiButton />
                </div>

                {/* Sign Out */}
                <button
                  onClick={signOut}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="bg-gradient-to-r from-organic-600 to-organic-700 hover:from-organic-700 hover:to-organic-800 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow"
              >
                Sign In
              </Link>
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
                      'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      pathname === link.href
                        ? 'bg-organic-100 text-organic-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
