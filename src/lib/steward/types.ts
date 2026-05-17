export type StewardScore = 1 | 2 | 3 | 4 | 5;
export type StewardRecommendation = 'promote' | 'flag' | 'reject';

export interface StewardReview {
  task_id: string;
  summary: string;
  clarity_score: StewardScore;
  scope_score: StewardScore;
  concerns: string[];
  recommendation: StewardRecommendation;
  generated_by: string;
}

export interface StewardClient {
  suggestN(orgId: string | null): Promise<number>;
  reviewBacklogCandidates(taskIds: string[]): Promise<StewardReview[]>;
}

export interface BacklogTaskSnapshot {
  id: string;
  title: string;
  description: string | null;
  points: number | null;
  labels: string[];
  org_id: string | null;
}
