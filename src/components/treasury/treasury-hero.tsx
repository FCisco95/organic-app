'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, ExternalLink, Shield, Users, Scale } from 'lucide-react';

interface TreasuryHeroProps {
  walletAddress: string;
}

export function TreasuryHero({ walletAddress }: TreasuryHeroProps) {
  const t = useTranslations('Treasury');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 text-white">
      <div className="max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('heroTitle')}</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl">
          {t('heroDescription')}
        </p>

        {/* Principles */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <Shield className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('principleSecurityTitle')}</p>
              <p className="text-xs text-gray-400">{t('principleSecurityDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <Users className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('principleGovernanceTitle')}</p>
              <p className="text-xs text-gray-400">{t('principleGovernanceDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <Scale className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('principleTransparencyTitle')}</p>
              <p className="text-xs text-gray-400">{t('principleTransparencyDesc')}</p>
            </div>
          </div>
        </div>

        {/* Wallet address */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
            {t('walletLabel')}
          </span>
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5">
            <code className="text-sm font-mono text-gray-200">
              <span className="hidden sm:inline">{walletAddress}</span>
              <span className="sm:hidden">{shortAddress}</span>
            </code>
            <button
              onClick={handleCopy}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label={copied ? t('copied') : t('copyAddress')}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <a
            href={`https://solscan.io/account/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {t('viewOnSolscan')}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
