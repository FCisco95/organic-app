import type { useTranslations } from 'next-intl';
import type { CreateProposalInput } from '@/features/proposals/schemas';
import type { WizardStep } from '@/features/proposals/types';

/** Shared props for steps 1–3 (form-editing steps). */
export interface StepProps {
  formData: CreateProposalInput;
  errors: Record<string, string[]>;
  updateField: <K extends keyof CreateProposalInput>(
    field: K,
    value: CreateProposalInput[K]
  ) => void;
  t: ReturnType<typeof useTranslations<'ProposalWizard'>>;
}

/** Props for the review step (step 4). */
export interface Step4ReviewProps {
  formData: CreateProposalInput;
  goToStep: (step: WizardStep) => void;
  t: ReturnType<typeof useTranslations<'ProposalWizard'>>;
}
