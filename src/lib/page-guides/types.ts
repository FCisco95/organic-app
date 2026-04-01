import type { ReactNode } from 'react';

export interface GuideStep {
  title: string;
  description: string;
  visual: ReactNode;
}

export interface PageGuide {
  title: string;
  /** i18n section key under PageGuides namespace (e.g. 'Dashboard', 'Tasks') */
  i18nSection?: string;
  steps: GuideStep[];
}
