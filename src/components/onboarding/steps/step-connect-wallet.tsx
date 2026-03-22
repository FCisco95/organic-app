'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/context';
import { useCompleteOnboardingStep } from '@/features/onboarding/hooks';
import { useEffect, useState } from 'react';

interface StepConnectWalletProps {
  completed: boolean;
  onComplete: () => void;
}

export function StepConnectWallet({ completed, onComplete }: StepConnectWalletProps) {
  const t = useTranslations('Onboarding');
  const { connected } = useWallet();
  const { profile } = useAuth();
  const completeMutation = useCompleteOnboardingStep();
  const [justCompleted, setJustCompleted] = useState(false);

  const walletLinked = !!profile?.wallet_pubkey;

  // Auto-complete when wallet is linked on profile
  useEffect(() => {
    if (walletLinked && !completed && !completeMutation.isPending) {
      completeMutation.mutate(
        { step: 'connect_wallet' },
        {
          onSuccess: () => {
            setJustCompleted(true);
            onComplete();
          },
        }
      );
    }
  }, [walletLinked, completed, completeMutation, onComplete]);

  if (completed || walletLinked) {
    return (
      <div className="flex flex-col items-center gap-5 py-8 w-full">
        <div
          className={`w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center transition-transform duration-300 ${justCompleted ? 'scale-110' : 'scale-100'}`}
        >
          <Check className="w-6 h-6 text-green-400 animate-in fade-in duration-300" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-base font-medium text-green-400">{t('steps.connect_wallet.completed')}</p>
          <span className="inline-block text-xs font-mono text-organic-orange bg-organic-orange/10 px-2 py-0.5 rounded">
            {t('xpEarned')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 w-full">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Wallet className="w-6 h-6 text-organic-orange" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-foreground">{t('steps.connect_wallet.title')}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{t('steps.connect_wallet.description')}</p>
      </div>
      {connected && !walletLinked && (
        <p className="text-sm text-yellow-400">{t('steps.connect_wallet.linkPending')}</p>
      )}
      {!connected && (
        <p className="text-sm text-muted-foreground">{t('steps.connect_wallet.hint')}</p>
      )}
    </div>
  );
}
