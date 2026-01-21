'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { X, Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WalletListItem } from './wallet-list-item';
import { WalletGetStarted } from './wallet-get-started';
import { useAuth } from '@/features/auth/context';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

const RECENT_WALLET_KEY = 'wallet_recent';

// Popular wallets in priority order
const POPULAR_WALLET_NAMES = [
  'Phantom',
  'Solflare',
  'Backpack',
  'OKX Wallet',
  'Coinbase Wallet',
  'Ledger',
  'Torus',
];

interface WalletConnectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewState = 'main' | 'all' | 'get-started';

export function WalletConnectDrawer({ isOpen, onClose }: WalletConnectDrawerProps) {
  const { wallets, select, connecting, connected, disconnect, wallet, publicKey } = useWallet();
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('Wallet');
  const [view, setView] = useState<ViewState>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [recentWalletName, setRecentWalletName] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const wasConnectedOnOpenRef = useRef(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Track if user was already connected when drawer opened
  useEffect(() => {
    if (isOpen) {
      wasConnectedOnOpenRef.current = connected;
    }
  }, [isOpen, connected]);

  // Load recent wallet from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(RECENT_WALLET_KEY);
      if (stored) {
        setRecentWalletName(stored);
      }
    }
  }, [isOpen]);

  // Close on successful NEW connection (not if was already connected)
  useEffect(() => {
    if (!isOpen) return;
    if (connected && !wasConnectedOnOpenRef.current && !isConnecting) {
      onClose();
    }
  }, [connected, isConnecting, isOpen, onClose]);

  // Get all available wallets sorted by ready state
  const availableWallets = useMemo(() => {
    return wallets
      .filter((wallet) => wallet.readyState !== WalletReadyState.Unsupported)
      .sort((a, b) => {
        // Installed wallets first
        const aInstalled = a.readyState === WalletReadyState.Installed;
        const bInstalled = b.readyState === WalletReadyState.Installed;
        if (aInstalled && !bInstalled) return -1;
        if (!aInstalled && bInstalled) return 1;
        return 0;
      });
  }, [wallets]);

  // Get recent wallet if it exists in adapters
  const recentWallet = useMemo(() => {
    if (!recentWalletName) return null;
    return availableWallets.find((w) => w.adapter.name === recentWalletName) || null;
  }, [recentWalletName, availableWallets]);

  // Get popular wallets
  const popularWallets = useMemo(() => {
    const popular: typeof availableWallets = [];
    for (const name of POPULAR_WALLET_NAMES) {
      const wallet = availableWallets.find((w) => w.adapter.name === name);
      if (wallet) {
        popular.push(wallet);
      }
    }
    // Add any installed wallets not in the popular list
    for (const wallet of availableWallets) {
      if (
        wallet.readyState === WalletReadyState.Installed &&
        !popular.some((p) => p.adapter.name === wallet.adapter.name)
      ) {
        popular.push(wallet);
      }
    }
    return popular.slice(0, 6); // Show max 6 in popular
  }, [availableWallets]);

  // Filter wallets for "All" view
  const filteredWallets = useMemo(() => {
    if (!searchQuery.trim()) return availableWallets;
    const query = searchQuery.toLowerCase();
    return availableWallets.filter((w) => w.adapter.name.toLowerCase().includes(query));
  }, [availableWallets, searchQuery]);

  // Handle wallet selection - directly connect using the adapter
  const handleSelectWallet = useCallback(
    async (walletName: string) => {
      const selectedWallet = wallets.find((w) => w.adapter.name === walletName);
      if (!selectedWallet) {
        console.error('Wallet not found:', walletName);
        return;
      }

      try {
        const isSameWallet = wallet?.adapter.name === walletName;

        if (connected && isSameWallet) {
          onClose();
          return;
        }

        setIsConnecting(true);

        // If already connected, disconnect in the background to preserve user gesture.
        if (connected && !isSameWallet) {
          disconnect().catch(() => undefined);
        }

        // Select the wallet first so the adapter is current for the app.
        select(walletName as any);

        // Connect directly on the adapter to avoid state timing issues.
        await selectedWallet.adapter.connect();

        // Save to localStorage as recent after successful connection
        if (typeof window !== 'undefined') {
          localStorage.setItem(RECENT_WALLET_KEY, walletName);
          setRecentWalletName(walletName);
        }

        // Close drawer after successful connection
        onClose();
      } catch (error: any) {
        console.error('Failed to connect wallet:', error);
        // User rejected or wallet not available
      } finally {
        setIsConnecting(false);
      }
    },
    [wallets, select, connected, disconnect, wallet, onClose]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (view !== 'main') {
          setView('main');
          setSearchQuery('');
        } else {
          onClose();
        }
        return;
      }

      // Only handle arrow keys in list views
      if (view === 'get-started') return;

      const currentList = view === 'all' ? filteredWallets : popularWallets;
      const listLength = currentList.length + (recentWallet && view === 'main' ? 1 : 0);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % listLength);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + listLength) % listLength);
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        let wallet;
        if (view === 'main' && recentWallet && focusedIndex === 0) {
          wallet = recentWallet;
        } else {
          const adjustedIndex = view === 'main' && recentWallet ? focusedIndex - 1 : focusedIndex;
          wallet = currentList[adjustedIndex];
        }
        if (wallet) {
          handleSelectWallet(wallet.adapter.name);
        }
      }
    },
    [
      isOpen,
      view,
      filteredWallets,
      popularWallets,
      recentWallet,
      focusedIndex,
      handleSelectWallet,
      onClose,
    ]
  );

  // Add keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus trap
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      setTimeout(() => firstFocusableRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setView('main');
      setSearchQuery('');
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Focus search input when switching to "all" view
  useEffect(() => {
    if (view === 'all' && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [view]);

  // Handle click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const connectedAddress = publicKey?.toBase58() || null;
  const isLinked =
    !!connectedAddress && !!profile?.wallet_pubkey && profile.wallet_pubkey === connectedAddress;
  const showLinkCta = !!user && !authLoading && connected && connectedAddress && !isLinked;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-drawer-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          'relative w-full sm:w-[400px] h-full bg-gray-900 border-l border-gray-800 shadow-2xl',
          'flex flex-col overflow-hidden',
          'animate-in slide-in-from-right duration-300'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 id="wallet-drawer-title" className="text-xl font-semibold text-white">
            {t('drawerTitle')}
          </h2>
          <button
            ref={firstFocusableRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtext */}
        <div className="px-5 py-3 border-b border-gray-800/50">
          <p className="text-gray-500 text-xs leading-relaxed">
            {t('drawerSubtext')}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {showLinkCta && (
            <div className="mb-6 rounded-xl border border-organic-orange/30 bg-organic-orange/10 p-4">
              <p className="text-sm font-medium text-white mb-1">{t('linkWalletTitle')}</p>
              <p className="text-xs text-gray-300 mb-3">{t('linkWalletDescription')}</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push('/profile');
                }}
                className="text-sm font-semibold text-organic-orange hover:text-orange-400 transition-colors"
              >
                {t('linkWalletAction')}
              </button>
            </div>
          )}
          {view === 'get-started' ? (
            <WalletGetStarted onBack={() => setView('main')} />
          ) : view === 'all' ? (
            /* All Wallets View */
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchWalletsPlaceholder')}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-organic-orange/50 focus:border-organic-orange/50"
                />
              </div>

              {/* Back to Popular */}
              <button
                type="button"
                onClick={() => {
                  setView('main');
                  setSearchQuery('');
                  setFocusedIndex(-1);
                }}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                {t('backToPopular')}
              </button>

              {/* Wallet List */}
              <div className="space-y-2">
                {filteredWallets.length > 0 ? (
                  filteredWallets.map((wallet, index) => (
                    <WalletListItem
                      key={wallet.adapter.name}
                      name={wallet.adapter.name}
                      icon={wallet.adapter.icon}
                      isRecent={wallet.adapter.name === recentWalletName}
                      isDetected={wallet.readyState === WalletReadyState.Installed}
                      onClick={() => handleSelectWallet(wallet.adapter.name)}
                      disabled={isConnecting || connecting}
                      isFocused={focusedIndex === index}
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-8">
                    {t('noWalletsFound', { query: searchQuery })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Main View (Popular + Recent) */
            <div className="space-y-6">
              {/* Recent Wallet Section */}
              {recentWallet && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('recentLabel')}
                  </h3>
                  <WalletListItem
                    name={recentWallet.adapter.name}
                    icon={recentWallet.adapter.icon}
                    isRecent
                    isDetected={recentWallet.readyState === WalletReadyState.Installed}
                    onClick={() => handleSelectWallet(recentWallet.adapter.name)}
                    disabled={isConnecting || connecting}
                    isFocused={focusedIndex === 0}
                  />
                </div>
              )}

              {/* Popular Wallets Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('popularLabel')}
                </h3>
                <div className="space-y-2">
                  {popularWallets.map((wallet, index) => (
                    <WalletListItem
                      key={wallet.adapter.name}
                      name={wallet.adapter.name}
                      icon={wallet.adapter.icon}
                      isDetected={wallet.readyState === WalletReadyState.Installed}
                      onClick={() => handleSelectWallet(wallet.adapter.name)}
                      disabled={isConnecting || connecting}
                      isFocused={focusedIndex === (recentWallet ? index + 1 : index)}
                    />
                  ))}
                </div>
              </div>

              {/* All Wallets Button */}
              <button
                type="button"
                onClick={() => {
                  setView('all');
                  setFocusedIndex(-1);
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30 transition-colors text-gray-400 hover:text-white"
              >
                <span className="text-sm font-medium">{t('allWalletsLabel')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {t('availableCount', { count: availableWallets.length })}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {view !== 'get-started' && (
          <div className="p-5 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setView('get-started')}
              className="w-full text-center text-sm text-gray-400 hover:text-organic-orange transition-colors py-2"
            >
              {t('noWalletCta')}
            </button>
          </div>
        )}

        {/* Connecting overlay */}
        {(isConnecting || connecting) && (
          <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-organic-orange border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-white text-sm mt-4">{t('connectingLabel')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
