'use client';

import { Search, ChevronRight } from 'lucide-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { WalletListItem } from '../wallet-list-item';
import { useTranslations } from 'next-intl';
import type { WalletAllViewProps } from './types';

export function WalletAllView({
  filteredWallets,
  recentWalletName,
  searchQuery,
  onSearchChange,
  onBack,
  onSelectWallet,
  isDisabled,
  focusedIndex,
  searchInputRef,
}: WalletAllViewProps) {
  const t = useTranslations('Wallet');

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('searchWalletsPlaceholder')}
          className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/50 focus:border-organic-terracotta/50"
        />
      </div>

      {/* Back to Popular */}
      <button
        type="button"
        onClick={onBack}
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
              onClick={() => onSelectWallet(wallet.adapter.name)}
              disabled={isDisabled}
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
  );
}
