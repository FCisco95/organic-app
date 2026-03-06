'use client';

import { useTranslations } from 'next-intl';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DisputeActionsProps {
  canAssign: boolean;
  canMediate: boolean;
  canWithdraw: boolean;
  canAppeal: boolean;
  onAssign: () => void;
  onMediate: () => void;
  onWithdraw: () => void;
  onAppeal: () => void;
  isAssigning: boolean;
  isMediating: boolean;
  isWithdrawing: boolean;
  isAppealing: boolean;
}

export function DisputeActions({
  canAssign,
  canMediate,
  canWithdraw,
  canAppeal,
  onAssign,
  onMediate,
  onWithdraw,
  onAppeal,
  isAssigning,
  isMediating,
  isWithdrawing,
  isAppealing,
}: DisputeActionsProps) {
  const t = useTranslations('Disputes');

  return (
    <div className="flex flex-wrap gap-3">
      {canAssign && (
        <Button
          onClick={onAssign}
          disabled={isAssigning}
          variant="outline"
        >
          <User className="mr-1.5 h-4 w-4" />
          {t('assignSelf')}
        </Button>
      )}

      {canMediate && (
        <Button
          onClick={onMediate}
          disabled={isMediating}
          variant="outline"
          data-testid="dispute-mediate-action"
        >
          {t('mediate')}
        </Button>
      )}

      {canWithdraw && (
        <Button
          onClick={onWithdraw}
          disabled={isWithdrawing}
          variant="outline"
          className="text-red-600 hover:text-red-700"
          data-testid="dispute-withdraw-action"
        >
          {t('withdrawDispute')}
        </Button>
      )}

      {canAppeal && (
        <Button
          onClick={onAppeal}
          disabled={isAppealing}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          {t('appealDispute')}
        </Button>
      )}
    </div>
  );
}
