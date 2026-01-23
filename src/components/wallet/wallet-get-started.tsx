'use client';

import { ArrowLeft, ExternalLink, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface WalletGetStartedProps {
  onBack: () => void;
}

const WALLET_DOWNLOAD_LINKS = [
  {
    name: 'Phantom',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/phantom.svg',
    url: 'https://phantom.app/download',
    descriptionKey: 'phantomDescription',
  },
  {
    name: 'Solflare',
    icon: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/solflare.svg',
    url: 'https://solflare.com/download',
    descriptionKey: 'solflareDescription',
  },
];

export function WalletGetStarted({ onBack }: WalletGetStartedProps) {
  const t = useTranslations('Wallet');

  return (
    <div className="flex flex-col h-full">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-white">{t('getStartedTitle')}</h3>
      </div>

      {/* Install Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <ExternalLink className="w-4 h-4" />
          <span>{t('installExtension')}</span>
        </div>

        <div className="space-y-3">
          {WALLET_DOWNLOAD_LINKS.map((wallet) => (
            <a
              key={wallet.name}
              href={wallet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/70 border border-gray-700/50 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-900/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                <Image
                  src={wallet.icon}
                  alt={wallet.name}
                  width={28}
                  height={28}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="flex-1">
                <span className="text-white font-medium text-sm block">{wallet.name}</span>
                <span className="text-gray-500 text-xs">{t(wallet.descriptionKey)}</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-organic-orange transition-colors" />
            </a>
          ))}
        </div>
      </div>

      {/* Create Wallet Section - Only show if embedded wallet provider exists */}
      <div className="mt-6 pt-6 border-t border-gray-700/50">
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
          <Sparkles className="w-4 h-4" />
          <span>{t('createWalletTitle')}</span>
        </div>

        {/* Note: No embedded wallet provider is configured in this repo */}
        <div className="px-4 py-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
          <p className="text-gray-500 text-sm text-center">{t('createWalletComingSoon')}</p>
          <p className="text-gray-600 text-xs text-center mt-1">
            {t('createWalletComingSoonDescription')}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="mt-auto pt-6">
        <p className="text-gray-500 text-xs text-center leading-relaxed">{t('walletInfoFooter')}</p>
      </div>
    </div>
  );
}
