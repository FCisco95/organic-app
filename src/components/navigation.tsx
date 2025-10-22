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
    <nav className="bg-white border-b-4 border-organic-orange sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-organic-orange to-organic-yellow rounded-xl flex items-center justify-center transform transition-transform group-hover:scale-110 shadow-lg">
                <span className="text-white font-luckiest text-2xl" style={{
                  textShadow: '2px 2px 0px rgba(0,0,0,0.3)',
                  WebkitTextStroke: '1px rgba(0,0,0,0.2)'
                }}>O</span>
              </div>
              <span className="text-2xl font-luckiest text-organic-black" style={{
                textShadow: '2px 2px 0px rgba(255,122,0,0.3)',
                WebkitTextStroke: '0.5px rgba(255,122,0,0.5)'
              }}>
                ORGANIC
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map(
              (link) =>
                link.show && (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'px-5 py-2.5 rounded-xl text-sm font-comic font-bold transition-all duration-200 transform hover:scale-105',
                      pathname === link.href
                        ? 'bg-organic-orange text-white shadow-lg'
                        : 'text-organic-black hover:bg-organic-yellow hover:shadow-md active:translate-y-0.5'
                    )}
                    style={{
                      boxShadow: pathname === link.href ? '0 4px 0 0 #CC6200, 0 8px 10px rgba(0,0,0,0.2)' : '0 2px 0 0 rgba(0,0,0,0.1)',
                    }}
                  >
                    {link.label}
                  </Link>
                )
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="h-10 w-28 bg-organic-yellow/30 rounded-xl animate-pulse"></div>
            ) : user ? (
              <>
                {/* Organic ID Badge */}
                {profile?.organic_id && (
                  <div className="hidden sm:flex items-center space-x-3 bg-gradient-to-r from-organic-yellow to-organic-orange px-4 py-2 rounded-full border-2 border-organic-black shadow-lg animate-breathe">
                    <span className="text-sm font-luckiest text-organic-black">
                      #{profile.organic_id}
                    </span>
                    <span className={cn(
                      'px-3 py-1 rounded-full text-xs font-comic font-bold border-2 border-organic-black',
                      profile.role === 'admin' ? 'bg-purple-400 text-white' :
                      profile.role === 'council' ? 'bg-blue-400 text-white' :
                      profile.role === 'member' ? 'bg-green-400 text-white' :
                      'bg-gray-300 text-organic-black'
                    )}>
                      {profile.role.toUpperCase()}
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
                  className="px-4 py-2.5 rounded-xl text-sm font-comic font-bold text-white bg-red-500 hover:bg-red-600 transition-all duration-200 transform hover:scale-105 active:translate-y-0.5 shadow-lg"
                  style={{
                    boxShadow: '0 4px 0 0 #B91C1C, 0 6px 10px rgba(0,0,0,0.2)'
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-6 py-3 rounded-xl font-luckiest text-white bg-gradient-to-r from-organic-orange to-organic-yellow hover:from-organic-yellow hover:to-organic-orange transition-all duration-200 transform hover:scale-105 active:translate-y-0.5 shadow-lg animate-breathe"
                style={{
                  boxShadow: '0 6px 0 0 #CC6200, 0 10px 15px rgba(0,0,0,0.3)',
                  textShadow: '2px 2px 0px rgba(0,0,0,0.3)'
                }}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {user && (
        <div className="md:hidden border-t-2 border-organic-black bg-organic-yellow/20">
          <div className="px-4 py-3 space-y-2">
            {navLinks.map(
              (link) =>
                link.show && (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'block px-4 py-2.5 rounded-xl text-sm font-comic font-bold transition-all duration-200',
                      pathname === link.href
                        ? 'bg-organic-orange text-white shadow-lg'
                        : 'text-organic-black hover:bg-organic-yellow'
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
