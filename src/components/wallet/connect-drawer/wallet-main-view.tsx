'use client';

import { ChevronRight } from 'lucide-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { WalletListItem } from '../wallet-list-item';
import { useTranslations } from 'next-intl';
import type { WalletMainViewProps } from './types';

export function WalletMainView({
  recentWallet,
  popularWallets,
  availableWalletsCount,
  onSelectWallet,
  isDisabled,
  focusedIndex,
  onShowAll,
}: WalletMainViewProps) {
  const t = useTranslations('Wallet');

  return (
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
            onClick={() => onSelectWallet(recentWallet.adapter.name)}
            disabled={isDisabled}
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
              onClick={() => onSelectWallet(wallet.adapter.name)}
              disabled={isDisabled}
              isFocused={focusedIndex === (recentWallet ? index + 1 : index)}
            />
          ))}
        </div>
      </div>

      {/* All Wallets Button */}
      <button
        type="button"
        onClick={onShowAll}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30 transition-colors text-gray-400 hover:text-white"
      >
        <span className="text-sm font-medium">{t('allWalletsLabel')}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {t('availableCount', { count: availableWalletsCount })}
          </span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
}
