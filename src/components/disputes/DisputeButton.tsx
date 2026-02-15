'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { CreateDisputeModal } from './CreateDisputeModal';

interface DisputeButtonProps {
  submissionId: string;
  reviewStatus: string;
  isSubmissionOwner: boolean;
  className?: string;
}

export function DisputeButton({
  submissionId,
  reviewStatus,
  isSubmissionOwner,
  className,
}: DisputeButtonProps) {
  const t = useTranslations('Disputes');
  const [showModal, setShowModal] = useState(false);

  // Only show for rejected/disputed submissions owned by the user
  if (!isSubmissionOwner || (reviewStatus !== 'rejected' && reviewStatus !== 'approved')) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
        className={className}
      >
        <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
        {t('fileDispute')}
      </Button>

      {showModal && (
        <CreateDisputeModal
          submissionId={submissionId}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
