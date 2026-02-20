'use client';

import { useState, useCallback } from 'react';
import {
  Lightbulb,
  Scale,
  Wallet,
  Users,
  Code,
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  Check,
  Edit2,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useCreateProposal, useUpdateProposal } from '@/features/proposals/hooks';
import { wizardStepSchemas, type CreateProposalInput } from '@/features/proposals/schemas';
import type { ProposalCategory, WizardStep } from '@/features/proposals/types';
import {
  PROPOSAL_CATEGORIES,
  PROPOSAL_CATEGORY_LABELS,
  PROPOSAL_CATEGORY_COLORS,
} from '@/features/proposals/types';

// Icon map for category cards
const CATEGORY_ICON_MAP: Record<ProposalCategory, LucideIcon> = {
  feature: Lightbulb,
  governance: Scale,
  treasury: Wallet,
  community: Users,
  development: Code,
};

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

  return (
    <div className="space-y-8">
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

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {step === 1 && (
          <Step1Category formData={formData} errors={errors} updateField={updateField} t={t} />
        )}
        {step === 2 && (
          <Step2Problem formData={formData} errors={errors} updateField={updateField} t={t} />
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

// --- Step Components ---

interface StepProps {
  formData: CreateProposalInput;
  errors: Record<string, string[]>;
  updateField: <K extends keyof CreateProposalInput>(
    field: K,
    value: CreateProposalInput[K]
  ) => void;
  t: ReturnType<typeof useTranslations<'ProposalWizard'>>;
}

function Step1Category({ formData, errors, updateField, t }: StepProps) {
  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          {t('selectCategory')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PROPOSAL_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICON_MAP[cat];
            const isSelected = formData.category === cat;
            const colorClass = PROPOSAL_CATEGORY_COLORS[cat];

            return (
              <button
                key={cat}
                type="button"
                onClick={() => updateField('category', cat)}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all',
                  isSelected
                    ? 'border-organic-orange bg-orange-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className={cn('p-2 rounded-lg', colorClass)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{PROPOSAL_CATEGORY_LABELS[cat]}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t(`categoryDescription_${cat}`)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-2">
          {t('labelTitle')}
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder={t('placeholderTitle')}
          className={cn(
            'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent',
            errors.title ? 'border-red-300' : 'border-gray-300'
          )}
          maxLength={200}
        />
        <div className="flex justify-between mt-1">
          {errors.title ? <p className="text-sm text-red-600">{errors.title[0]}</p> : <span />}
          <p className="text-xs text-gray-500">
            {t('charCount', { count: formData.title.length, max: 200 })}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-gray-900 mb-2">
          {t('labelSummary')}
        </label>
        <textarea
          id="summary"
          value={formData.summary}
          onChange={(e) => updateField('summary', e.target.value)}
          placeholder={t('placeholderSummary')}
          rows={3}
          className={cn(
            'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none',
            errors.summary ? 'border-red-300' : 'border-gray-300'
          )}
          maxLength={300}
        />
        <div className="flex justify-between mt-1">
          {errors.summary ? <p className="text-sm text-red-600">{errors.summary[0]}</p> : <span />}
          <p className="text-xs text-gray-500">
            {t('charCount', { count: formData.summary.length, max: 300 })}
          </p>
        </div>
      </div>
    </div>
  );
}

function Step2Problem({ formData, errors, updateField, t }: StepProps) {
  return (
    <div className="space-y-6">
      {/* Motivation */}
      <div>
        <label htmlFor="motivation" className="block text-sm font-medium text-gray-900 mb-2">
          {t('labelMotivation')}
        </label>
        <textarea
          id="motivation"
          value={formData.motivation}
          onChange={(e) => updateField('motivation', e.target.value)}
          placeholder={t('placeholderMotivation')}
          rows={6}
          className={cn(
            'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none',
            errors.motivation ? 'border-red-300' : 'border-gray-300'
          )}
        />
        <div className="flex justify-between mt-1">
          {errors.motivation ? (
            <p className="text-sm text-red-600">{errors.motivation[0]}</p>
          ) : (
            <span />
          )}
          <p className="text-xs text-gray-500">
            {t('charCountNoMax', { count: formData.motivation.length })}
          </p>
        </div>
      </div>

      {/* Solution */}
      <div>
        <label htmlFor="solution" className="block text-sm font-medium text-gray-900 mb-2">
          {t('labelSolution')}
        </label>
        <textarea
          id="solution"
          value={formData.solution}
          onChange={(e) => updateField('solution', e.target.value)}
          placeholder={t('placeholderSolution')}
          rows={6}
          className={cn(
            'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none',
            errors.solution ? 'border-red-300' : 'border-gray-300'
          )}
        />
        <div className="flex justify-between mt-1">
          {errors.solution ? (
            <p className="text-sm text-red-600">{errors.solution[0]}</p>
          ) : (
            <span />
          )}
          <p className="text-xs text-gray-500">
            {t('charCountNoMax', { count: formData.solution.length })}
          </p>
        </div>
      </div>
    </div>
  );
}

function Step3Budget({ formData, errors, updateField, t }: StepProps) {
  const isTreasury = formData.category === 'treasury';

  return (
    <div className="space-y-6">
      {/* Budget */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="budget" className="block text-sm font-medium text-gray-900">
            {t('labelBudget')}
          </label>
          {isTreasury ? (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
              {t('budgetRecommended')}
            </span>
          ) : (
            <span className="text-xs text-gray-400">{t('optional')}</span>
          )}
        </div>
        <textarea
          id="budget"
          value={formData.budget || ''}
          onChange={(e) => updateField('budget', e.target.value)}
          placeholder={t('placeholderBudget')}
          rows={5}
          className={cn(
            'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none',
            errors.budget ? 'border-red-300' : 'border-gray-300'
          )}
        />
        {errors.budget && <p className="mt-1 text-sm text-red-600">{errors.budget[0]}</p>}
      </div>

      {/* Timeline */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="timeline" className="block text-sm font-medium text-gray-900">
            {t('labelTimeline')}
          </label>
          <span className="text-xs text-gray-400">{t('optional')}</span>
        </div>
        <textarea
          id="timeline"
          value={formData.timeline || ''}
          onChange={(e) => updateField('timeline', e.target.value)}
          placeholder={t('placeholderTimeline')}
          rows={5}
          className={cn(
            'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none',
            errors.timeline ? 'border-red-300' : 'border-gray-300'
          )}
        />
        {errors.timeline && <p className="mt-1 text-sm text-red-600">{errors.timeline[0]}</p>}
      </div>
    </div>
  );
}

// Step 4 has different props
interface Step4Props {
  formData: CreateProposalInput;
  goToStep: (step: WizardStep) => void;
  t: ReturnType<typeof useTranslations<'ProposalWizard'>>;
}

function Step4Review({ formData, goToStep, t }: Step4Props) {
  const sections = [
    {
      key: 'category',
      label: t('reviewSection_category'),
      value: PROPOSAL_CATEGORY_LABELS[formData.category],
      step: 1 as WizardStep,
    },
    { key: 'title', label: t('reviewSection_title'), value: formData.title, step: 1 as WizardStep },
    {
      key: 'summary',
      label: t('reviewSection_summary'),
      value: formData.summary,
      step: 1 as WizardStep,
    },
    {
      key: 'motivation',
      label: t('reviewSection_motivation'),
      value: formData.motivation,
      step: 2 as WizardStep,
    },
    {
      key: 'solution',
      label: t('reviewSection_solution'),
      value: formData.solution,
      step: 2 as WizardStep,
    },
    {
      key: 'budget',
      label: t('reviewSection_budget'),
      value: formData.budget || '',
      step: 3 as WizardStep,
    },
    {
      key: 'timeline',
      label: t('reviewSection_timeline'),
      value: formData.timeline || '',
      step: 3 as WizardStep,
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reviewTitle')}</h3>
      {sections.map((section) => (
        <div
          key={section.key}
          className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 mb-1">{section.label}</p>
            <p className="text-gray-900 whitespace-pre-wrap">
              {section.value || (
                <span className="text-gray-400 italic">{t('reviewSection_empty')}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => goToStep(section.step)}
            className="flex items-center gap-1 text-sm text-organic-orange hover:text-orange-600 font-medium shrink-0"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {t('reviewEdit')}
          </button>
        </div>
      ))}
    </div>
  );
}
