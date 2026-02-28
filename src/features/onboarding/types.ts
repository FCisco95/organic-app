export const ONBOARDING_STEPS = [
  'connect_wallet',
  'verify_token',
  'pick_task',
  'join_sprint',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;

export interface OnboardingStepStatus {
  completed: boolean;
  completed_at: string | null;
}

export type OnboardingProgress = Record<OnboardingStep, OnboardingStepStatus>;

export interface OnboardingState {
  steps: OnboardingProgress;
  all_complete: boolean;
  completed_count: number;
  total_steps: number;
}

export interface CompleteStepResponse {
  success: boolean;
  step: OnboardingStep;
  xp_awarded: number;
  all_complete: boolean;
}
