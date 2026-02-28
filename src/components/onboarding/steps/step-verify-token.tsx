'use client';

import { ShieldCheck, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/context';
import { useCompleteOnboardingStep } from '@/features/onboarding/hooks';
import { useEffect } from 'react';

interface StepVerifyTokenProps {
  completed: boolean;
  onComplete: () => void;
}

export function StepVerifyToken({ completed, onComplete }: StepVerifyTokenProps) {
  const t = useTranslations('Onboarding');
  const { profile } = useAuth();
  const completeMutation = useCompleteOnboardingStep();

  const hasOrganicId = !!profile?.organic_id;

  // Auto-complete when organic ID is assigned
  useEffect(() => {
    if (hasOrganicId && !completed && !completeMutation.isPending) {
      completeMutation.mutate(
        { step: 'verify_token' },
        { onSuccess: () => onComplete() }
      );
    }
  }, [hasOrganicId, completed, completeMutation, onComplete]);

  if (completed || hasOrganicId) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <p className="text-green-400 font-medium">{t('steps.verify_token.completed')}</p>
        {profile?.organic_id && (
          <p className="text-sm text-gray-400">
            {t('steps.verify_token.organicId', { id: profile.organic_id })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-16 h-16 rounded-full bg-organic-orange/20 flex items-center justify-center">
        <ShieldCheck className="w-8 h-8 text-organic-orange" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-white">{t('steps.verify_token.title')}</h3>
        <p className="text-sm text-gray-400 max-w-sm">{t('steps.verify_token.description')}</p>
      </div>
      {!profile?.wallet_pubkey && (
        <p className="text-sm text-yellow-400">{t('steps.verify_token.walletRequired')}</p>
      )}
      {profile?.wallet_pubkey && (
        <p className="text-sm text-gray-500">{t('steps.verify_token.hint')}</p>
      )}
    </div>
  );
}
