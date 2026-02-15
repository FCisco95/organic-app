'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useDisputeEligibility } from '@/features/disputes/hooks';
import { CreateDisputeModal } from './CreateDisputeModal';

interface DisputeButtonProps {
  submissionId: string;
  reviewStatus: string;
  isSubmissionOwner: boolean;
  onSuccess?: () => void;
  className?: string;
}

export function DisputeButton({
  submissionId,
  reviewStatus,
  isSubmissionOwner,
  onSuccess,
  className,
}: DisputeButtonProps) {
  const t = useTranslations('Disputes');
  const [showModal, setShowModal] = useState(false);
  const { data: eligibility, isLoading } = useDisputeEligibility(submissionId);

  // Only show for rejected submissions owned by the user
  if (!isSubmissionOwner || reviewStatus !== 'rejected') {
    return null;
  }

  const disabled = isLoading || !eligibility?.eligible;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
        disabled={disabled}
        title={eligibility?.eligible ? undefined : eligibility?.reason}
        className={className}
      >
        <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
        {t('fileDispute')}
      </Button>

      {showModal && (
        <CreateDisputeModal
          submissionId={submissionId}
          onClose={() => setShowModal(false)}
          onSuccess={onSuccess}
        />
      )}
    </>
  );
}
