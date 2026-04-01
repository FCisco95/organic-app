'use client';

import { ShieldCheck, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/context';
import { useCompleteOnboardingStep } from '@/features/onboarding/hooks';
import { useEffect, useState } from 'react';

interface StepVerifyTokenProps {
  completed: boolean;
  onComplete: () => void;
}

export function StepVerifyToken({ completed, onComplete }: StepVerifyTokenProps) {
  const t = useTranslations('Onboarding');
  const { profile } = useAuth();
  const completeMutation = useCompleteOnboardingStep();
  const [justCompleted, setJustCompleted] = useState(false);

  const hasOrganicId = !!profile?.organic_id;

  // Auto-complete when organic ID is assigned
  useEffect(() => {
    if (hasOrganicId && !completed && !completeMutation.isPending) {
      completeMutation.mutate(
        { step: 'verify_token' },
        {
          onSuccess: () => {
            setJustCompleted(true);
            onComplete();
          },
        }
      );
    }
  }, [hasOrganicId, completed, completeMutation, onComplete]);

  if (completed || hasOrganicId) {
    return (
      <div className="flex flex-col items-center gap-5 py-8 w-full">
        <div
          className={`w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center transition-transform duration-300 ${justCompleted ? 'scale-110' : 'scale-100'}`}
        >
          <Check className="w-6 h-6 text-green-400 animate-in fade-in duration-300" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-base font-medium text-green-400">{t('steps.verify_token.completed')}</p>
          {profile?.organic_id && (
            <p className="text-sm text-muted-foreground">
              {t('steps.verify_token.organicId', { id: profile.organic_id })}
            </p>
          )}
          <span className="inline-block text-xs font-mono text-organic-terracotta bg-organic-terracotta/10 px-2 py-0.5 rounded">
            {t('xpEarned')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 w-full">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <ShieldCheck className="w-6 h-6 text-organic-terracotta" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-foreground">{t('steps.verify_token.title')}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{t('steps.verify_token.description')}</p>
      </div>
      {!profile?.wallet_pubkey && (
        <p className="text-sm text-yellow-400">{t('steps.verify_token.walletRequired')}</p>
      )}
      {profile?.wallet_pubkey && (
        <p className="text-sm text-muted-foreground">{t('steps.verify_token.hint')}</p>
      )}
    </div>
  );
}
