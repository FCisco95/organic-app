'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface WalletListItemProps {
  name: string;
  icon: string;
  isRecent?: boolean;
  isDetected?: boolean;
  onClick: () => void;
  disabled?: boolean;
  isFocused?: boolean;
}

export function WalletListItem({
  name,
  icon,
  isRecent,
  isDetected,
  onClick,
  disabled,
  isFocused,
}: WalletListItemProps) {
  const t = useTranslations('Wallet');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
        'bg-gray-800/50 hover:bg-gray-700/70 border border-gray-700/50',
        'focus:outline-none focus:ring-2 focus:ring-organic-orange/50 focus:border-organic-orange/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isFocused && 'ring-2 ring-organic-orange/50 border-organic-orange/50 bg-gray-700/70'
      )}
    >
      {/* Wallet Icon */}
      <div className="w-10 h-10 rounded-lg bg-gray-900/50 flex items-center justify-center overflow-hidden flex-shrink-0">
        {icon ? (
          <Image
            src={icon}
            alt={name}
            width={28}
            height={28}
            className="object-contain"
            unoptimized
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow" />
        )}
      </div>

      {/* Wallet Name */}
      <span className="flex-1 text-left text-white font-medium text-sm">{name}</span>

      {/* Badges */}
      <div className="flex items-center gap-2">
        {isRecent && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-organic-orange/20 text-organic-orange">
            {t('recentLabel')}
          </span>
        )}
        {isDetected && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-400">
            {t('detectedLabel')}
          </span>
        )}
      </div>
    </button>
  );
}
