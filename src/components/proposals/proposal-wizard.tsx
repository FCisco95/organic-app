'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Save, Send, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useCreateProposal, useUpdateProposal } from '@/features/proposals/hooks';
import { wizardStepSchemas, type CreateProposalInput } from '@/features/proposals/schemas';
import type { WizardStep } from '@/features/proposals/types';
import { Step1Category, Step2Details, Step3Budget, Step4Review } from './steps';

interface ProposalWizardProps {
  initialData?: Partial<CreateProposalInput>;
  proposalId?: string;
  onSuccess?: (proposalId: string) => void;
}

const EMPTY_FORM: CreateProposalInput = {
  category: 'feature',
  title: '',
  summary: '',
  motivation: '',
  solution: '',
  budget: '',
  timeline: '',
};

export function ProposalWizard({ initialData, proposalId, onSuccess }: ProposalWizardProps) {
  const t = useTranslations('ProposalWizard');
  const [step, setStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<CreateProposalInput>({
    ...EMPTY_FORM,
    ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const isSubmitting = createProposal.isPending || updateProposal.isPending;
  const isEditing = !!proposalId;

  const updateField = useCallback(
    <K extends keyof CreateProposalInput>(field: K, value: CreateProposalInput[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear errors for this field when user starts typing
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  const validateStep = useCallback(
    (targetStep: WizardStep): boolean => {
      if (targetStep > 3) return true; // Step 4 is review, no validation
      const schema = wizardStepSchemas[targetStep as 1 | 2 | 3];
      const result = schema.safeParse(formData);
      if (!result.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const [key, messages] of Object.entries(result.error.flatten().fieldErrors)) {
          if (messages) fieldErrors[key] = messages as string[];
        }
        setErrors(fieldErrors);
        return false;
      }
      setErrors({});
      return true;
    },
    [formData]
  );

  const goNext = useCallback(() => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, 4) as WizardStep);
    }
  }, [step, validateStep]);

  const goBack = useCallback(() => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1) as WizardStep);
  }, []);

  const goToStep = useCallback(
    (target: WizardStep) => {
      // Can always go back, but forward requires validation of current step
      if (target < step) {
        setErrors({});
        setStep(target);
      } else if (target === step) {
        // Already here
      } else {
        // Going forward: validate current step first
        if (validateStep(step)) {
          setStep(target);
        }
      }
    },
    [step, validateStep]
  );

  const handleSubmit = useCallback(
    async (status: 'draft' | 'public') => {
      // For submit, validate all steps
      if (status === 'public') {
        for (const s of [1, 2, 3] as const) {
          if (!validateStep(s)) {
            setStep(s);
            return;
          }
        }
      }

      try {
        if (isEditing) {
          const result = await updateProposal.mutateAsync({
            proposalId: proposalId!,
            updates: { ...formData, status } as Record<string, unknown>,
          });
          toast.success(status === 'draft' ? t('toastDraftSaved') : t('toastSubmitted'));
          onSuccess?.(result?.id || proposalId!);
        } else {
          const result = await createProposal.mutateAsync({ ...formData, status });
          toast.success(status === 'draft' ? t('toastDraftSaved') : t('toastSubmitted'));
          onSuccess?.(result?.id);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('toastFailed'));
      }
    },
    [formData, isEditing, proposalId, createProposal, updateProposal, validateStep, onSuccess, t]
  );

  const stepLabels = [
    t('stepCategoryTitle'),
    t('stepProblemSolution'),
    t('stepBudgetTimeline'),
    t('stepReview'),
  ];
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="space-y-8" data-testid={`proposal-wizard-step-${step}`}>
      {/* Progress Bar */}
      <div className="flex items-center justify-between">
        {stepLabels.map((label, i) => {
          const stepNum = (i + 1) as WizardStep;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;

          return (
            <div key={stepNum} className="flex items-center flex-1 last:flex-initial">
              <button
                type="button"
                onClick={() => goToStep(stepNum)}
                className="flex items-center gap-2 group"
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                    isActive && 'bg-organic-orange text-white',
                    isCompleted && 'bg-green-500 text-white',
                    !isActive && !isCompleted && 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium hidden sm:block',
                    isActive && 'text-gray-900',
                    !isActive && 'text-gray-500'
                  )}
                >
                  {label}
                </span>
              </button>
              {i < stepLabels.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-3',
                    step > stepNum ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.16em] text-gray-500">{t('workflowTitle')}</p>
        <p className="mt-1 text-sm text-gray-700">
          {t('workflowStepContext', {
            step: step,
            total: stepLabels.length,
            label: stepLabels[step - 1],
          })}
        </p>
      </div>

      {hasErrors && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">{t('validationSummaryTitle')}</p>
          <p className="mt-1 text-xs text-red-600">{t('validationSummaryDescription')}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {step === 1 && (
          <Step1Category formData={formData} errors={errors} updateField={updateField} t={t} />
        )}
        {step === 2 && (
          <Step2Details formData={formData} errors={errors} updateField={updateField} t={t} />
        )}
        {step === 3 && (
          <Step3Budget formData={formData} errors={errors} updateField={updateField} t={t} />
        )}
        {step === 4 && <Step4Review formData={formData} goToStep={goToStep} t={t} />}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 1}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
            step === 1 ? 'invisible' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back')}
        </button>

        <div className="flex gap-3">
          {step === 4 ? (
            <>
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {t('saveDraft')}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('public')}
                disabled={isSubmitting}
                data-testid="proposal-wizard-submit"
                className="flex items-center gap-2 px-6 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? t('submitting') : t('submitProposal')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={goNext}
              data-testid="proposal-wizard-next"
              className="flex items-center gap-2 px-6 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            >
              {t('next')}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
