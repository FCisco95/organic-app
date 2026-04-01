'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import type { LinkWalletCtaProps } from './types';

export function LinkWalletCta({ onClose }: LinkWalletCtaProps) {
  const router = useRouter();
  const t = useTranslations('Wallet');

  return (
    <div className="mb-6 rounded-xl border border-organic-terracotta/30 bg-organic-terracotta/10 p-4">
      <p className="text-sm font-medium text-white mb-1">{t('linkWalletTitle')}</p>
      <p className="text-xs text-gray-300 mb-3">{t('linkWalletDescription')}</p>
      <button
        type="button"
        onClick={() => {
          onClose();
          router.push('/profile');
        }}
        className="text-sm font-semibold text-organic-terracotta hover:text-[#E8845C] transition-colors"
      >
        {t('linkWalletAction')}
      </button>
    </div>
  );
}
