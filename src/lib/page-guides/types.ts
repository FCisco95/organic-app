import type { ReactNode } from 'react';

export interface GuideStep {
  title: string;
  description: string;
  visual: ReactNode;
}

export interface PageGuide {
  title: string;
  steps: GuideStep[];
}
