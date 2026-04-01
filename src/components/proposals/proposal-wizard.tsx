'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, Save, Send, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useCreateProposal, useUpdateProposal } from '@/features/proposals/hooks';
import { wizardStepSchemas, type CreateProposalInput } from '@/features/proposals/schemas';
import type { WizardStep, ProposalCategory } from '@/features/proposals/types';
import { PROPOSAL_CATEGORY_BORDER_COLORS } from '@/features/proposals/types';
import { Step1Category, Step2Details, Step3Budget, Step4Review } from './steps';
import { WizardTabs } from './wizard-tabs';
import { WizardPreview } from './wizard-preview';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

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
  const [previewOpen, setPreviewOpen] = useState(false);

  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const isSubmitting = createProposal.isPending || updateProposal.isPending;
  const isEditing = !!proposalId;

  const updateField = useCallback(
    <K extends keyof CreateProposalInput>(field: K, value: CreateProposalInput[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
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
      if (targetStep > 3) return true;
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

  const goToStep = useCallback(
    (target: WizardStep) => {
      if (target < step) {
        setErrors({});
        setStep(target);
      } else if (target === step) {
        // Already here
      } else {
        // Validate all steps from current through target-1
        for (let s = step; s < target; s++) {
          if (!validateStep(s as WizardStep)) {
            setStep(s as WizardStep);
            return;
          }
        }
        setStep(target);
      }
    },
    [step, validateStep]
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

  const handleSubmit = useCallback(
    async (status: 'draft' | 'public') => {
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
  const category = formData.category as ProposalCategory;
  const categoryBorderColor = PROPOSAL_CATEGORY_BORDER_COLORS[category];

  return (
    <>
      <div
        className="grid grid-cols-1 lg:grid-cols-5 gap-6"
        data-testid={`proposal-wizard-step-${step}`}
      >
        {/* Form Column - 3/5 width */}
        <div className="lg:col-span-3">
          {/* Tab Navigation */}
          <WizardTabs
            currentStep={step}
            onTabClick={goToStep}
            labels={stepLabels}
          />

          {/* Validation errors */}
          {hasErrors && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-6">
              <p className="text-sm font-semibold text-red-700">{t('validationSummaryTitle')}</p>
              <p className="mt-1 text-xs text-red-600">{t('validationSummaryDescription')}</p>
            </div>
          )}

          {/* Form Card with category left stripe */}
          <div
            className={cn(
              'rounded-xl border border-border bg-card p-6 border-l-4 transition-colors',
              categoryBorderColor
            )}
          >
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

          {/* Sticky Submit Footer */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border py-3 mt-6 -mx-1 px-1">
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
                      className="flex items-center gap-2 px-6 py-2 bg-cta hover:bg-cta-hover text-cta-fg rounded-lg font-medium transition-colors disabled:opacity-50"
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
                    className="flex items-center gap-2 px-6 py-2 bg-cta hover:bg-cta-hover text-cta-fg rounded-lg font-medium transition-colors"
                  >
                    {t('next')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Column - 2/5 width (desktop only) */}
        <div className="lg:col-span-2 hidden lg:block">
          <div className="sticky top-24">
            <WizardPreview formData={formData} />
          </div>
        </div>
      </div>

      {/* Mobile: floating preview button + Sheet */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="fixed bottom-20 right-6 z-40 flex items-center gap-2 rounded-full bg-cta px-4 py-3 text-sm font-semibold text-cta-fg shadow-lg hover:bg-cta-hover transition-colors"
        >
          <Eye className="h-4 w-4" />
          {t('previewButton')}
        </button>

        <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader className="mb-4">
              <SheetTitle>{t('previewSheetTitle')}</SheetTitle>
              <SheetDescription>{t('previewSheetDescription')}</SheetDescription>
            </SheetHeader>
            <WizardPreview formData={formData} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
