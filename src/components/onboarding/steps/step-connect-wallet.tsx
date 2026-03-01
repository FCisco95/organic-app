'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/context';
import { useCompleteOnboardingStep } from '@/features/onboarding/hooks';
import { useEffect } from 'react';

interface StepConnectWalletProps {
  completed: boolean;
  onComplete: () => void;
}

export function StepConnectWallet({ completed, onComplete }: StepConnectWalletProps) {
  const t = useTranslations('Onboarding');
  const { connected } = useWallet();
  const { profile } = useAuth();
  const completeMutation = useCompleteOnboardingStep();

  const walletLinked = !!profile?.wallet_pubkey;

  // Auto-complete when wallet is linked on profile
  useEffect(() => {
    if (walletLinked && !completed && !completeMutation.isPending) {
      completeMutation.mutate(
        { step: 'connect_wallet' },
        { onSuccess: () => onComplete() }
      );
    }
  }, [walletLinked, completed, completeMutation, onComplete]);

  if (completed || walletLinked) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <p className="text-green-400 font-medium">{t('steps.connect_wallet.completed')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-16 h-16 rounded-full bg-organic-orange/20 flex items-center justify-center">
        <Wallet className="w-8 h-8 text-organic-orange" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-white">{t('steps.connect_wallet.title')}</h3>
        <p className="text-sm text-gray-400 max-w-sm">{t('steps.connect_wallet.description')}</p>
      </div>
      {connected && !walletLinked && (
        <p className="text-sm text-yellow-400">{t('steps.connect_wallet.linkPending')}</p>
      )}
      {!connected && (
        <p className="text-sm text-gray-500">{t('steps.connect_wallet.hint')}</p>
      )}
    </div>
  );
}
