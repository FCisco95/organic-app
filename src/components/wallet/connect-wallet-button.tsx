'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet, ChevronDown, Copy, LogOut, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WalletConnectDrawer } from './wallet-connect-drawer';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

interface ConnectWalletButtonProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function ConnectWalletButton({ className, variant = 'default' }: ConnectWalletButtonProps) {
  const { connected, publicKey, disconnect, select, wallet } = useWallet();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const wasConnectedRef = useRef(false);
  const t = useTranslations('Wallet');

  useEffect(() => {
    if (connected && !wasConnectedRef.current) {
      toast.success(t('toastConnected'));
    }
    wasConnectedRef.current = connected;
  }, [connected, t]);

  const handleCopyAddress = useCallback(async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [publicKey]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    select(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('walletName');
    }
    setShowDropdown(false);
  }, [disconnect, select]);

  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  if (connected && publicKey) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
            'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700',
            className
          )}
        >
          {/* Wallet Icon */}
          {wallet?.adapter.icon && (
            <Image
              src={wallet.adapter.icon}
              alt={wallet.adapter.name}
              width={20}
              height={20}
              className="rounded"
              unoptimized
            />
          )}
          <span>{truncatedAddress}</span>
          <ChevronDown
            className={cn('w-4 h-4 transition-transform', showDropdown && 'rotate-180')}
          />
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[90]" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-[100] overflow-hidden">
              {/* Wallet Info */}
              <div className="px-4 py-3 border-b border-gray-800">
                <p className="text-xs text-gray-500">{t('connectedWithLabel')}</p>
                <p className="text-sm text-white font-medium">{wallet?.adapter.name}</p>
              </div>

              {/* Actions */}
              <div className="p-2">
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? t('copiedLabel') : t('copyAddressAction')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    setIsDrawerOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  {t('changeWalletAction')}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t('disconnectWalletAction')}
                </button>
              </div>
            </div>
          </>
        )}

        <WalletConnectDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDrawerOpen(true)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
          'bg-organic-orange hover:bg-orange-600 text-white',
          variant === 'compact' && 'px-3 py-1.5',
          className
        )}
      >
        <Wallet className={cn('w-4 h-4', variant === 'compact' && 'w-3.5 h-3.5')} />
        <span>{t('connectWalletAction')}</span>
      </button>
      <WalletConnectDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
